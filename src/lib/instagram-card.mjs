/**
 * Instagram 用の縦長カード（1080×1350・4:5）。各記事の確認済みの title と開催日だけで作る。
 * 既存の OG カード（src/pages/og/[...route].ts）と同じ書体・配色・茨城の地図の背景で、ブランドの見た目をそろえる。
 * 実在の場所の写真や AI 生成画像は使わない（AGENTS.md：架空の写真を作らない）。
 * 描画は sharp（依存に既にある）。フォントはリポジトリ内の ttf を直接読む。
 */
import sharp from 'sharp';
import { join } from 'node:path';

export const IG_SIZE = { width: 1080, height: 1350 };
const PAD = 96;
const TEXT_W = IG_SIZE.width - PAD * 2 - 20;
const INK = '#172b35';
const MUTED = '#75695a';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');


/** 文字の幅（全角＝1、半角＝0.56）。行の長さの目安に使う */
const unit = (ch) => (ch.codePointAt(0) < 0x3000 ? 0.66 : 1);
const kind = (ch) => (/[0-9０-９,.，．\-%％]/.test(ch) ? 'num' : /[ァ-ヶー･]/.test(ch) ? 'kata' : /[ぁ-ゖ]/.test(ch) ? 'hira' : /[一-龯々〆]/.test(ch) ? 'kanji' : /[A-Za-z]/.test(ch) ? 'latin' : 'other');

/**
 * 日本語の見出しを、単語の途中で切れないように改行する（行あたり maxUnits 文字分）。
 * 区切ってよい場所：助詞・句読点・中黒の後、文字の種類が変わる所（漢字↔カタカナ・数字）。
 * カタカナ語・数字・英字の途中では切らない。どうしても入らない長い語だけ途中で切る。
 */
export function breakJa(str, maxUnits) {
  const chars = [...String(str)];
  const ok = new Set();
  for (let i = 1; i < chars.length; i += 1) {
    const a = chars[i - 1]; const b = chars[i];
    if (/[のはをでにがとへもや・、。！？）」』]/.test(a) && !/[、。）」』ー]/.test(b)) ok.add(i);
    else if (kind(a) !== kind(b) && !(kind(a) === 'hira' && kind(b) === 'hira') && !/[ー、。）」』ァィゥェォャュョッ]/.test(b) && !/[（「『]/.test(a)) {
      const pair = `${kind(a)}>${kind(b)}`;
      // 日付・数量（10月26日・1万円・8か所）や英数字の途中では切らない
      if (!['kanji>hira', 'num>kanji', 'kanji>num', 'num>hira', 'latin>num', 'num>latin', 'num>other', 'other>num'].includes(pair)) ok.add(i);
    }
  }
  const lines = []; let start = 0;
  while (start < chars.length) {
    let w = 0; let end = start; let lastOk = -1;
    while (end < chars.length && w + unit(chars[end]) <= maxUnits) { w += unit(chars[end]); end += 1; if (ok.has(end)) lastOk = end; }
    if (end >= chars.length) { lines.push(chars.slice(start).join('')); break; }
    const cut = lastOk > start ? lastOk : end;
    lines.push(chars.slice(start, cut).join(''));
    start = cut;
  }
  return lines.join('\n');
}

/** title を「主題｜詳細」に分ける（最初の「｜」で）。なければ全体が主題 */
export function splitTitle(title) {
  const i = String(title).indexOf('｜');
  if (i < 0) return { main: String(title), sub: '' };
  return { main: title.slice(0, i), sub: title.slice(i + 1) };
}

async function text(str, { font, file, size, color, width = TEXT_W, spacing = 0, breakLines = true }) {
  // 行あたりの文字数の目安で先に改行しておき、Pango には単語の途中で切らせない
  const body = breakLines ? breakJa(str, Math.floor((width / size) * 0.94)) : str;
  const { data, info } = await sharp({
    text: { text: `<span foreground="${color}">${esc(body)}</span>`, font: `${font} ${size}`, fontfile: file, width, rgba: true, wrap: 'word', spacing },
  }).png().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

/**
 * @param {{ title: string, badge?: string | null, label: string, accent: string }} card
 * @param {{ root?: string }} [options]
 * @returns {Promise<Buffer>} PNG
 */
export async function renderInstagramCard({ title, badge = null, label, accent }, { root = process.cwd() } = {}) {
  const fonts = {
    mincho: join(root, 'src/assets/fonts/ShipporiMincho-Bold.ttf'),
    gothic: join(root, 'src/assets/fonts/ZenKakuGothicNew-Medium.ttf'),
  };
  const { width: W, height: H } = IG_SIZE;
  const bg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6f2e9"/><stop offset="1" stop-color="#e9e2d3"/></linearGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#g)"/><rect width="26" height="${H}" fill="${accent}"/></svg>`);
  const backdrop = await sharp(join(root, 'src/assets/og/ibaraki-backdrop.png')).resize({ width: W, height: 567, fit: 'cover' }).png().toBuffer();

  const layers = [{ input: backdrop, top: H - 567, left: 0 }];
  const g = { font: 'Zen Kaku Gothic New Medium', file: fonts.gothic };
  const mi = { font: 'Shippori Mincho Bold', file: fonts.mincho };

  // 上から順に積む部品を先に描き、合計の高さで縦方向の中央に置く（地図と下のブランドにかからない範囲）
  const block = [];
  const lab = await text(label, { ...g, size: 32, color: MUTED });
  block.push({ img: lab, gap: 30 });
  if (badge) {
    const b = await text(badge, { ...g, size: 44, color: '#ffffff' });
    const bw = b.width + 60; const bh = b.height + 30;
    const pill = { data: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${bw}" height="${bh}"><rect width="${bw}" height="${bh}" rx="${bh / 2}" fill="${accent}"/></svg>`), width: bw, height: bh, inner: b };
    block.push({ img: pill, gap: 48 });
  }
  const { main, sub } = splitTitle(title);
  // 主題は長さで大きさを変える（長い名前でも下の地図にかぶらないように）
  const mainSize = main.length <= 10 ? 112 : main.length <= 16 ? 96 : main.length <= 24 ? 80 : 68;
  const m = await text(main, { ...mi, size: mainSize, color: INK, spacing: 12 });
  block.push({ img: m, gap: 40 });
  if (sub) {
    const st = await text(sub, { ...g, size: sub.length <= 36 ? 46 : 40, color: '#3d4f57', spacing: 14 });
    block.push({ img: st, gap: 0 });
  }
  const AREA_TOP = PAD; const AREA_BOTTOM = 860;
  let total = block.reduce((n, x) => n + x.img.height + x.gap, 0);
  // 詳細が長すぎて入らないときは詳細を外す（主題と日付は必ず残す）
  if (total > AREA_BOTTOM - AREA_TOP && sub) { const last = block.pop(); total -= last.img.height; }
  let y = AREA_TOP + Math.max(0, Math.round((AREA_BOTTOM - AREA_TOP - total) / 2));
  for (const { img, gap } of block) {
    layers.push({ input: img.data, top: y, left: PAD });
    if (img.inner) layers.push({ input: img.inner.data, top: y + 15, left: PAD + 30 });
    y += img.height + gap;
  }

  const brand = await text('イバトコ', { ...mi, size: 72, color: INK });
  const tag1 = await text('茨城のローカルメディア', { ...g, size: 30, color: MUTED, width: 560 });
  const tag2 = await text('詳しくはプロフィールのリンクから', { ...g, size: 30, color: MUTED, width: 560 });
  const by = H - PAD - tag2.height - 8 - tag1.height - 18 - brand.height;
  layers.push({ input: brand.data, top: by, left: PAD });
  layers.push({ input: tag1.data, top: by + brand.height + 18, left: PAD });
  layers.push({ input: tag2.data, top: by + brand.height + 18 + tag1.height + 8, left: PAD });

  return sharp(bg).composite(layers).png().toBuffer();
}
