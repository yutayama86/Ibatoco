/**
 * OG画像の背景に敷く「茨城の形」を1枚のPNGにして書き出す。
 *
 * 自動生成のOG画像は文字だけで、下半分が空いたまま公開されていた。
 * 写真は許諾の確認できないものを使わない方針なので、サイトが持っている
 * 44市町村の実データ（ibaraki-geo.ts）をそのまま図版にする。
 *
 * astro-og-canvas の bgImage は PNG/JPEG しか読めないため、ここで
 * パスを自前でラスタライズしてPNGを書く（依存を増やさない）。
 * パスは M/L だけの多角形なので、走査線で塗りつぶせる。
 *
 * 実行：node scripts/build-og-backdrop.mjs
 * 出力：
 *   src/assets/og/ibaraki-backdrop.png … OG画像の背景（透過・右寄せ・文字の下に敷く）
 *   public/images/card/<slug>.png      … 一覧カード。記事の市町村を濃く塗り分ける
 * 地図データを更新したら、これも作り直すこと。
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

const SRC = 'src/data/ibaraki-geo.ts';
const OUT = 'src/assets/og/ibaraki-backdrop.png';
const W = 1200;
const H = 630;
const SS = 3; // スーパーサンプリング倍率（輪郭のギザつきを抑える）

// 地の色に対して、うっすら浮かぶ藍。OG背景のグラデーションに載せる前提
const FILL = [49, 92, 104, 30]; // --color-tide をごく薄く。見出しが上に乗るので、これ以上濃くしない
const EDGE = [246, 242, 233, 95]; // --color-paper。市町村の境を分ける

const src = readFileSync(SRC, 'utf8');
const view = src.match(/GEO_VIEW\s*=\s*\{\s*w:\s*(\d+),\s*h:\s*(\d+)/);
const VW = Number(view[1]);
const VH = Number(view[2]);

/** `d: "M.. L.. L.."` を座標の配列にする */
const polys = [];
const bySlug = new Map();
const centroid = new Map();
for (const m of src.matchAll(/"([a-z-]+)":\s*\{\s*d:\s*"([^"]+)",\s*cx:\s*(-?[\d.]+),\s*cy:\s*(-?[\d.]+)/g)) {
  const pts = [];
  for (const seg of m[2].matchAll(/([ML])\s*(-?[\d.]+)\s+(-?[\d.]+)/g)) {
    pts.push([Number(seg[2]), Number(seg[3])]);
  }
  if (pts.length > 2) {
    polys.push(pts);
    bySlug.set(m[1], pts);
    centroid.set(m[1], [Number(m[3]), Number(m[4])]);
  }
}
if (polys.length !== 44) {
  console.error(`市町村の数が44ではありません（${polys.length}）。地図データを確認してください。`);
  process.exit(1);
}

const sw = W * SS;
const sh = H * SS;
let scale = 1, offX = 0, offY = 0;
const tx = (p) => p[0] * scale + offX;
const ty = (p) => p[1] * scale + offY;
let buf = new Float32Array(sw * sh * 4); // 累積用（RGBA, 0-255）

function blend(x, y, c) {
  if (x < 0 || y < 0 || x >= sw || y >= sh) return;
  const i = (y * sw + x) * 4;
  const a = c[3] / 255;
  buf[i] = buf[i] * (1 - a) + c[0] * a;
  buf[i + 1] = buf[i + 1] * (1 - a) + c[1] * a;
  buf[i + 2] = buf[i + 2] * (1 - a) + c[2] * a;
  buf[i + 3] = Math.min(255, buf[i + 3] + c[3] * (1 - buf[i + 3] / 255));
}

/** 走査線で多角形を塗る（even-odd） */
function fillPoly(pts, color) {
  const xs = pts.map(tx);
  const ys = pts.map(ty);
  const yMin = Math.max(0, Math.floor(Math.min(...ys)));
  const yMax = Math.min(sh - 1, Math.ceil(Math.max(...ys)));
  for (let y = yMin; y <= yMax; y++) {
    const cy = y + 0.5;
    const hits = [];
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const y1 = ys[j];
      const y2 = ys[i];
      if (y1 === y2) continue;
      if (cy >= Math.min(y1, y2) && cy < Math.max(y1, y2)) {
        hits.push(xs[j] + ((cy - y1) / (y2 - y1)) * (xs[i] - xs[j]));
      }
    }
    hits.sort((a, b) => a - b);
    for (let k = 0; k + 1 < hits.length; k += 2) {
      const x1 = Math.max(0, Math.round(hits[k]));
      const x2 = Math.min(sw - 1, Math.round(hits[k + 1]));
      for (let x = x1; x <= x2; x++) blend(x, y, color);
    }
  }
}

/** 塗りつぶした円（アンチエイリアスあり）。重心の目印に使う */
function fillCircle(cx, cy, r, color) {
  const x0 = Math.max(0, Math.floor(cx - r - 1));
  const x1 = Math.min(sw - 1, Math.ceil(cx + r + 1));
  const y0 = Math.max(0, Math.floor(cy - r - 1));
  const y1 = Math.min(sh - 1, Math.ceil(cy + r + 1));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d <= r) blend(x, y, color);
    }
  }
}

/** 多角形の輪郭を1px（スーパーサンプル基準）で描く */
function strokePoly(pts, color) {
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    let x1 = tx(pts[j]);
    let y1 = ty(pts[j]);
    const x2 = tx(pts[i]);
    const y2 = ty(pts[i]);
    const steps = Math.ceil(Math.hypot(x2 - x1, y2 - y1));
    for (let s = 0; s <= steps; s++) {
      const t = steps ? s / steps : 0;
      blend(Math.round(x1 + (x2 - x1) * t), Math.round(y1 + (y2 - y1) * t), color);
    }
  }
}

/** 指定の配置・色で1枚描いて、実サイズのRGBAバッファを返す */
function render({ heightRatio, alignRight, fill, edge, bg }) {
  buf = new Float32Array(sw * sh * 4);
  const targetH = H * heightRatio;
  scale = (targetH / VH) * SS;
  const mapW = (VW * targetH) / VH;
  offX = alignRight ? (W - mapW) * SS - W * 0.005 * SS : ((W - mapW) / 2) * SS;
  offY = ((H - targetH) / 2) * SS;
  for (const p of polys) fillPoly(p, fill);
  for (const p of polys) strokePoly(p, edge);

  const out = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let dy = 0; dy < SS; dy++) {
        for (let dx = 0; dx < SS; dx++) {
          const i = ((y * SS + dy) * sw + (x * SS + dx)) * 4;
          r += buf[i]; g += buf[i + 1]; b += buf[i + 2]; a += buf[i + 3];
        }
      }
      const n = SS * SS;
      const o = (y * W + x) * 4;
      let R = r / n, G = g / n, B = b / n, A = a / n;
      if (bg) {
        // 不透明にする（カード用）。地の色の上に地図を合成する
        const t = A / 255;
        R = bg[0] * (1 - t) + R * t;
        G = bg[1] * (1 - t) + G * t;
        B = bg[2] * (1 - t) + B * t;
        A = 255;
      }
      out[o] = Math.round(R); out[o + 1] = Math.round(G);
      out[o + 2] = Math.round(B); out[o + 3] = Math.round(A);
    }
  }
  return out;
}

// --- PNG を書く（依存なし） ---
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(body) >>> 0);
  return Buffer.concat([len, body, crcBuf]);
};
let CRC_TABLE = null;
function crc32(buf) {
  if (!CRC_TABLE) {
    CRC_TABLE = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      CRC_TABLE[n] = c;
    }
  }
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return c ^ -1;
}
function toPng(out) {
  const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8;   // bit depth
ihdr[9] = 6;   // RGBA
const raw = Buffer.alloc((W * 4 + 1) * H);
for (let y = 0; y < H; y++) {
  raw[y * (W * 4 + 1)] = 0; // filter: none
  out.copy(raw, y * (W * 4 + 1) + 1, y * W * 4, (y + 1) * W * 4);
}
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync('src/assets/og', { recursive: true });
mkdirSync('public/images', { recursive: true });

// OGの背景：文字の下に敷くので、うんと薄く・右寄せ
const bgPng = toPng(render({ heightRatio: 0.92, alignRight: true, fill: FILL, edge: EDGE }));
writeFileSync(OUT, bgPng);


console.log(`OG背景：${OUT}（市町村 ${polys.length}件／${(bgPng.length / 1024).toFixed(1)}KB）`);

/* ------------------------------------------------------------------
 * 記事ごとのカード画像
 *
 * 既定画像を全記事で使い回すと、一覧で同じ絵が並んで「画像が無い」のと
 * あまり変わらない。記事の municipalities を地図の上で濃く塗り分ければ、
 * 1枚ずつ違ううえに「どこの話か」が絵で分かる。
 * 個別のOG画像（自作SVG）を持つ記事は、そちらが優先されるので作らない。
 * ---------------------------------------------------------------- */
const CARD_DIR = 'public/images/card';
mkdirSync(CARD_DIR, { recursive: true });

const BASE_FILL = [49, 92, 104, 40];
const HIT_FILL = [49, 92, 104, 150];
const CARD_BG = [243, 238, 228];

function renderCard(active) {
  buf = new Float32Array(sw * sh * 4);
  const targetH = H * 0.78;
  scale = (targetH / VH) * SS;
  offX = ((W - (VW * targetH) / VH) / 2) * SS;
  offY = ((H - targetH) / 2) * SS;
  for (const [slug, pts] of bySlug) fillPoly(pts, active.has(slug) ? HIT_FILL : BASE_FILL);
  for (const [, pts] of bySlug) strokePoly(pts, [246, 242, 233, 170]);
  /*
   * 塗るだけだと、大洗町や土浦市のように面積の小さい市町村は
   * カードの大きさ（約300px）では点にもならず、光って見えなかった。
   * 重心に一定の大きさの印を打って、面積によらず読めるようにする。
   */
  const dotR = 9 * SS;
  for (const slug of active) {
    const c = centroid.get(slug);
    if (!c) continue;
    const x = c[0] * scale + offX;
    const y = c[1] * scale + offY;
    fillCircle(x, y, dotR + 2.2 * SS, [243, 238, 228, 235]); // 地の色で縁取る
    fillCircle(x, y, dotR, [166, 63, 50, 255]);              // --color-signal
  }

  const out = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let dy = 0; dy < SS; dy++) {
        for (let dx = 0; dx < SS; dx++) {
          const i = ((y * SS + dy) * sw + (x * SS + dx)) * 4;
          r += buf[i]; g += buf[i + 1]; b += buf[i + 2]; a += buf[i + 3];
        }
      }
      const n = SS * SS;
      const o = (y * W + x) * 4;
      const t = a / n / 255;
      out[o] = Math.round(CARD_BG[0] * (1 - t) + (r / n) * t);
      out[o + 1] = Math.round(CARD_BG[1] * (1 - t) + (g / n) * t);
      out[o + 2] = Math.round(CARD_BG[2] * (1 - t) + (b / n) * t);
      out[o + 3] = 255;
    }
  }
  return out;
}

function articles() {
  const list = [];
  for (const dir of ['src/content/news', 'src/content/events']) {
    for (const name of readdirSync(dir)) {
      if (!name.endsWith('.md') || name.startsWith('_')) continue;
      const body = readFileSync(join(dir, name), 'utf8');
      const fm = body.match(/^---\n([\s\S]*?)\n---/);
      if (!fm) continue;
      if (/^draft:\s*true\s*$/m.test(fm[1])) continue;
      if (/^ogImage:/m.test(fm[1])) continue; // 自作の画像がある記事は作らない
      /**
       * municipalities は2通りの書き方が混在している。両方読む。
       *   municipalities:            municipalities: ["mito", "oarai"]
       *     - mito
       * ブロック形式しか見ていなかったため、インライン配列の記事は
       * 市町村を拾えず、地図が光らないまま出ていた。
       */
      const munis = [];
      const inline = fm[1].match(/^municipalities:\s*\[([^\]]*)\]/m);
      if (inline) {
        for (const v of inline[1].matchAll(/["']([a-z-]+)["']/g)) munis.push(v[1]);
      } else {
        const block = fm[1].match(/^municipalities:\s*\n((?:\s+-\s+.+\n?)*)/m);
        if (block) for (const l of block[1].split('\n')) {
          const v = l.match(/-\s+["']?([a-z-]+)["']?/);
          if (v) munis.push(v[1]);
        }
      }
      list.push({ slug: name.replace(/\.md$/, ''), munis, src: join(dir, name) });
    }
  }
  return list;
}

/*
 * ファイル名に内容のハッシュを入れる。
 * 同じURLのまま中身だけ差し替えると、ブラウザやCDNが古い画像を出し続ける。
 * 実際、印を入れる修正をしたあとも、読者の画面は以前の「光っていない地図」の
 * ままだった。名前が変われば必ず新しいものが読まれる。
 * 参照側は src/data/card-images.ts を通す。
 */
const MANIFEST = 'src/data/card-images.ts';
const manifest = {};
let made = 0, kept = 0;
const wanted = new Set();

const prev = existsSync(MANIFEST) ? readFileSync(MANIFEST, 'utf8') : '';
for (const a of articles()) {
  const png = toPng(renderCard(new Set(a.munis)));
  const hash = createHash('sha1').update(png).digest('hex').slice(0, 8);
  const name = `${a.slug}-${hash}.png`;
  const dest = join(CARD_DIR, name);
  wanted.add(name);
  manifest[a.slug] = `/images/card/${name}`;
  if (existsSync(dest)) { kept++; continue; }
  writeFileSync(dest, png);
  made++;
}

// 使わなくなった画像（古いハッシュ、消えた記事）を片付ける
let removed = 0;
for (const f of readdirSync(CARD_DIR)) {
  if (f.endsWith('.png') && !wanted.has(f)) { rmSync(join(CARD_DIR, f)); removed++; }
}

const body = `// 自動生成（scripts/build-og-backdrop.mjs）。手で編集しない。
// 記事ごとのカード画像。ファイル名に内容のハッシュが入っているので、
// 中身が変わればURLも変わり、古い画像が表示され続けることがない。
export const CARD_IMAGES: Record<string, string> = ${JSON.stringify(manifest, null, 2)};
`;
if (body !== prev) writeFileSync(MANIFEST, body);
console.log(`記事カード：${made}枚を生成、${kept}枚は据え置き、${removed}枚を削除（${CARD_DIR}/）`);
