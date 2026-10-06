/**
 * Visual Regression（参考レポート）：このビルド（dist/）と、いまの本番（https://ibatoco.jp）を同じブラウザで撮り、画素の差を数える。
 *
 * PR では「この変更で主要テンプレートの見た目がどれだけ変わるか」を、main では「デプロイで何が変わるか」を示す。
 * 比べる元の画像を保存しない（毎回、本番を基準に撮る）ので、基準画像の管理やワークフローの変更が要らない。
 *
 * 毎回変わる部分は隠して比べる（人気記事・新着・今週・検索結果など）。アニメーションは止める。
 * 外部の画像（Wikimedia の写真など）は両方とも読み込まない（読み込みの速さで差が出ないように）。
 * 計測（GA4）へは両方とも送らない。
 *
 * 判定はしない（終了コードは常に0）。表示崩れの合否は scripts/ui-smoke.mjs が決める。
 * 結果は CI のログと Job Summary に出す。差が大きいページは、意図した変更かを PR で確かめる。
 *
 * 実行：node scripts/visual-diff.mjs   （npm run verify の最後で実行。ローカルでブラウザを起動できなければ飛ばす）
 */
import { appendFileSync, existsSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const DIST = resolve('dist');
const LOCAL = 'https://ibatoco.test';
const PRODUCTION = (process.env.QA_BASE_URL ?? 'https://ibatoco.jp').replace(/\/$/, '');
const PAGES = [
  '/',
  '/events/',
  '/kouyou/',
  '/events/tsuchiura-hanabi-2026/',
  '/events/oarai-ankou-matsuri-2026/',
  '/events/fukuroda-falls-autumn-2026/',
  '/sports/',
  '/news/',
  '/area/tsuchiura/',
];
const WIDTHS = [
  { name: '375', width: 375, height: 812 },
  { name: '1440', width: 1440, height: 900 },
];
const MAX_HEIGHT = 6000;
// 毎回変わる部分（人気・新着・今週・推薦・検索結果）。見た目の比較から外す
const MASK = [
  '[data-module="home_now"]',
  '[data-module="home_news"]',
  '[data-module="home_this_week"]',
  '[data-module="home_november"]',
  '[data-growth-next]',
  '[data-search-results]',
];
const BLOCKED_HOST = /(^|\.)(googletagmanager\.com|google-analytics\.com|analytics\.google\.com|doubleclick\.net)$/;

const skip = (message) => {
  console.warn(`Visual Regression を飛ばしました：${message}`);
  process.exit(0);
};
if (!existsSync(join(DIST, 'index.html'))) skip('dist/ がありません');

let chromium;
let PNG;
let pixelmatch;
try {
  ({ chromium } = await import('playwright-core'));
  ({ PNG } = await import('pngjs'));
  ({ default: pixelmatch } = await import('pixelmatch'));
} catch (error) {
  skip(`依存が見つかりません（${String(error.message).split('\n')[0]}）`);
}
let browser;
try {
  browser = await chromium.launch(process.env.CHROME_PATH ? { headless: true, executablePath: process.env.CHROME_PATH } : { headless: true, channel: 'chrome' });
} catch (error) {
  skip(`ブラウザを起動できません：${String(error.message).split('\n')[0]}`);
}

function distFile(pathname) {
  const decoded = decodeURIComponent(pathname);
  const candidates = decoded.endsWith('/') ? [join(DIST, decoded, 'index.html')] : [join(DIST, decoded), join(DIST, decoded, 'index.html')];
  return candidates.find((file) => file.startsWith(DIST) && existsSync(file) && statSync(file).isFile());
}

async function shoot(origin, viewport, path) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    locale: 'ja-JP',
    timezoneId: 'Asia/Tokyo',
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
  });
  await context.addInitScript(() => { try { localStorage.setItem('ibatoco_ga_optout', '1'); } catch {} });
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (BLOCKED_HOST.test(url.hostname)) return route.abort();
    if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') return route.continue();
    if (url.origin !== origin) return route.abort();
    if (origin === LOCAL) {
      const file = distFile(url.pathname);
      return file ? route.fulfill({ path: file }) : route.fulfill({ status: 404, body: 'not found' });
    }
    return route.continue();
  });
  const page = await context.newPage();
  try {
    const response = await page.goto(`${origin}${path}`, { waitUntil: 'load', timeout: 45000 });
    if (!response || response.status() !== 200) return { error: `HTTP ${response?.status() ?? 'なし'}` };
    await page.addStyleTag({ content: `*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}${MASK.join(',')}{visibility:hidden!important}` });
    await page.evaluate(() => document.fonts?.ready);
    await page.waitForTimeout(400);
    const height = Math.min(MAX_HEIGHT, await page.evaluate(() => document.documentElement.scrollHeight));
    const buffer = await page.screenshot({ fullPage: true, clip: { x: 0, y: 0, width: viewport.width, height } });
    return { png: PNG.sync.read(buffer), height };
  } catch (error) {
    return { error: String(error.message).split('\n')[0] };
  } finally {
    await context.close();
  }
}

function compare(a, b) {
  const width = Math.min(a.width, b.width);
  const height = Math.min(a.height, b.height);
  const crop = (img) => {
    if (img.width === width && img.height === height) return img.data;
    const out = Buffer.alloc(width * height * 4);
    for (let y = 0; y < height; y++) img.data.copy(out, y * width * 4, y * img.width * 4, y * img.width * 4 + width * 4);
    return out;
  };
  const diff = pixelmatch(crop(a), crop(b), null, width, height, { threshold: 0.1 });
  return diff / (width * height);
}

const rows = [];
try {
  for (const viewport of WIDTHS) {
    for (const path of PAGES) {
      const [mine, live] = await Promise.all([shoot(LOCAL, viewport, path), shoot(PRODUCTION, viewport, path)]);
      if (mine.error || live.error) {
        rows.push({ path, width: viewport.name, note: `比較できず（このビルド：${mine.error ?? 'OK'}／本番：${live.error ?? 'OK'}）` });
        continue;
      }
      const ratio = compare(mine.png, live.png);
      const heightDelta = mine.height - live.height;
      rows.push({ path, width: viewport.name, ratio, heightDelta });
    }
  }
} finally {
  await browser.close();
}

const level = (r) => (r.ratio == null ? '—' : r.ratio <= 0.005 ? '同じ' : r.ratio <= 0.05 ? '小さな差' : '大きな差（意図した変更か確認）');
const lines = [
  '### Visual Regression（参考：このビルド vs 本番）',
  '',
  '| ページ | 幅 | 画素の差 | 高さの差 | 判定 |',
  '|---|---|---|---|---|',
  ...rows.map((r) => `| ${r.path} | ${r.width}px | ${r.ratio == null ? '—' : `${(r.ratio * 100).toFixed(2)}%`} | ${r.heightDelta == null ? '—' : `${r.heightDelta > 0 ? '+' : ''}${r.heightDelta}px`} | ${r.note ?? level(r)} |`),
  '',
  `人気・新着・今週・推薦・検索結果は毎回変わるため隠して比較。上端から最大${MAX_HEIGHT}pxまで。合否は UI スモークテスト（表示崩れ）で判定する。`,
  '',
].join('\n');
if (process.env.GITHUB_STEP_SUMMARY) {
  try { appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${lines}\n`); } catch {}
}
console.log(lines);
const large = rows.filter((r) => r.ratio != null && r.ratio > 0.05);
console.log(`Visual Regression（参考）：${rows.length} 画面を比較、大きな差 ${large.length} 件${large.length ? `（${large.map((r) => `${r.path}@${r.width}`).join('、')}）` : ''}`);
