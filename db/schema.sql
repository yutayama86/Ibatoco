-- イバトコ Phase2 データベース（Cloudflare D1 = SQLite）スキーマ
-- 静的サイト(読む側)は今のまま。ここは「書く側」＝会員・口コミ・店舗管理・課金・送客の土台。
-- docs/PHASE2_D1.md の手順で作成・適用する。
-- 冪等に流せるよう IF NOT EXISTS を付与。日時は ISO8601 文字列（TEXT）で保持。

PRAGMA foreign_keys = ON;

-- 市町村（静的データ src/data/areas.ts と対応。slugが結合キー）
CREATE TABLE IF NOT EXISTS municipalities (
  slug      TEXT PRIMARY KEY,
  name      TEXT NOT NULL,
  region    TEXT NOT NULL,           -- kenpoku/keno/kennan/rokko/kensei
  lat       REAL,
  lng       REAL
);

-- ジャンル（src/content.config.ts CATEGORIES と対応）
CREATE TABLE IF NOT EXISTS categories (
  key       TEXT PRIMARY KEY,        -- eat/life/sauna-play/beauty/stay/company
  label     TEXT NOT NULL,
  accent    TEXT
);

-- 会員（user=一般 / owner=店舗オーナー / reporter=レポーター / editor=編集部）
CREATE TABLE IF NOT EXISTS users (
  id           TEXT PRIMARY KEY,      -- uuid
  email        TEXT NOT NULL UNIQUE,
  name         TEXT,
  role         TEXT NOT NULL DEFAULT 'user'
                 CHECK (role IN ('user','owner','reporter','editor')),
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 店舗（＝資産の中核。無料掲載stores.csvの移行先。mdの作り込み店舗も将来ここへ）
CREATE TABLE IF NOT EXISTS stores (
  id           TEXT PRIMARY KEY,      -- slug（URL /place/<id>）
  name         TEXT NOT NULL,
  kana         TEXT,
  category_key TEXT NOT NULL REFERENCES categories(key),
  muni_slug    TEXT REFERENCES municipalities(slug),
  area         TEXT,                  -- 表示用の市町村名（例「水戸市」）
  tagline      TEXT,
  description  TEXT,
  address      TEXT,
  access       TEXT,
  hours        TEXT,
  holiday      TEXT,
  tel          TEXT,
  budget       TEXT,
  price_range  TEXT,
  features     TEXT,                  -- JSON配列文字列 '["駐車場あり",...]'
  website      TEXT,
  instagram    TEXT,
  map_url      TEXT,
  cover        TEXT,
  plan         TEXT NOT NULL DEFAULT 'free'
                 CHECK (plan IN ('free','official','growth','partner')),
  owner_id     TEXT REFERENCES users(id),
  status       TEXT NOT NULL DEFAULT 'published'
                 CHECK (status IN ('draft','published','archived')),
  source       TEXT NOT NULL DEFAULT 'csv',  -- csv/md/owner/import
  published_at TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_stores_muni     ON stores(muni_slug);
CREATE INDEX IF NOT EXISTS idx_stores_category ON stores(category_key);
CREATE INDEX IF NOT EXISTS idx_stores_plan     ON stores(plan);
CREATE INDEX IF NOT EXISTS idx_stores_owner    ON stores(owner_id);

-- 店舗の写真・動画（公式店舗プランの写真強化）
CREATE TABLE IF NOT EXISTS store_media (
  id         TEXT PRIMARY KEY,
  store_id   TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  type       TEXT NOT NULL DEFAULT 'image' CHECK (type IN ('image','video')),
  sort       INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_store_media_store ON store_media(store_id);

-- 公式レポーター（src/data/reporters.ts と対応。E-E-A-T著者）
CREATE TABLE IF NOT EXISTS reporters (
  slug       TEXT PRIMARY KEY,
  user_id    TEXT REFERENCES users(id),
  name       TEXT NOT NULL,
  role       TEXT,
  area       TEXT,
  genres     TEXT,                    -- JSON配列
  bio        TEXT,
  avatar     TEXT,
  sns        TEXT,                    -- JSONオブジェクト
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 口コミ（UGC＝コンテンツ供給の自動化。承認フロー付き）★キー資産
CREATE TABLE IF NOT EXISTS reviews (
  id         TEXT PRIMARY KEY,
  store_id   TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id    TEXT REFERENCES users(id),
  rating     INTEGER CHECK (rating BETWEEN 1 AND 5),
  body       TEXT,
  photos     TEXT,                    -- JSON配列
  status     TEXT NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending','published','rejected')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_reviews_store  ON reviews(store_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);

-- 課金（公式店舗¥9,800/集客¥29,800/地域DX）★MRRの源泉
CREATE TABLE IF NOT EXISTS subscriptions (
  id         TEXT PRIMARY KEY,
  owner_id   TEXT NOT NULL REFERENCES users(id),
  store_id   TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  plan       TEXT NOT NULL CHECK (plan IN ('official','growth','partner')),
  status     TEXT NOT NULL DEFAULT 'active'
               CHECK (status IN ('trialing','active','past_due','canceled')),
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  canceled_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_subs_store ON subscriptions(store_id);

-- 送客（予約/問い合わせのCV）★送客課金の源泉
CREATE TABLE IF NOT EXISTS leads (
  id         TEXT PRIMARY KEY,
  store_id   TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  type       TEXT NOT NULL CHECK (type IN ('reserve','contact')),
  user_name  TEXT,
  contact    TEXT,
  payload    TEXT,                    -- JSON（希望日時・人数など）
  status     TEXT NOT NULL DEFAULT 'new'
               CHECK (status IN ('new','handled','converted','spam')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_leads_store ON leads(store_id);

-- 行動ログ（回遊・検索・CVの二次利用）★データの濠
CREATE TABLE IF NOT EXISTS analytics_events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  entity     TEXT,                    -- store/article/area/...
  entity_id  TEXT,
  action     TEXT,                    -- view/click/reserve/...
  meta       TEXT,                    -- JSON
  ts         TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_events_entity ON analytics_events(entity, entity_id);


-- 店舗・施設・イベント主催者からの情報提供。公開前に必ず確認する。
-- /submit/ は現在Formspree受付だが、将来D1へ切り替えても同じ承認フローを維持する。
CREATE TABLE IF NOT EXISTS content_submissions (
  id             TEXT PRIMARY KEY,
  submission_type TEXT NOT NULL CHECK (submission_type IN ('event','business')),
  submitter_name TEXT,
  submitter_email TEXT,
  municipality  TEXT,
  official_url  TEXT,
  payload       TEXT NOT NULL,        -- JSON。フォームの構造化データ
  status        TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','verified','published','rejected')),
  verified_at   TEXT,
  published_url TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_content_submissions_status ON content_submissions(status);
CREATE INDEX IF NOT EXISTS idx_content_submissions_type ON content_submissions(submission_type);
