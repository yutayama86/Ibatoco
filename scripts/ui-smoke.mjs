/**
 * 主要ページのレスポンシブUIスモークテスト（スマホ6幅 320〜430px・768・1440px）。
 *
 * ビルド済みの dist/ を、ネットワークに出さずにブラウザで開いて検査する。
 * ポートを開かず、Playwright の route で dist のファイルを返す（https://ibatoco.test/）。
 *
 * 検出するもの（scripts/ui-smoke-checks.mjs）：
 *   - 読者が横スクロールできてしまうはみ出し / 画面の右端で切られる中身
 *   - CTA・カードの viewport 外へのはみ出し / 親に途中で切られる文字
 *   - 極端に狭いテキスト領域（1〜2文字ずつ縦に割れる）
 *   - img の src 欠損 / dist に無い画像（404）/ ページ内のJSエラー
 *   - 主要CTAの欠損（scripts/qa-pages.mjs の required）
 *
 * ブラウザ：Chrome 本体（Playwright の channel: 'chrome'）か、環境変数 CHROME_PATH。
 * 無料のOSS（playwright-core）だけを使い、ブラウザのダウンロードはしない。
 * CI（GitHub Actions の ubuntu-latest には Chrome が入っている）ではブラウザが起動できなければ失敗、
 * ローカルでは警告を出して飛ばす（サンドボックス等で Chrome を起動できない環境があるため）。
 *
 * 計測・広告・外部APIへのリクエストはすべて止める（GA4に検証のアクセスを送らない）。
 * Google Fonts だけは通す（無いと文字幅が変わり、はみ出しの判定がずれるため）。
 *
 * 実行：node scripts/ui-smoke.mjs   （npm run verify の最後でも実行される）
 */
import { existsSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { qaPages } from './qa-pages.mjs';
import { inspectPage } from './ui-smoke-checks.mjs';

const DIST = resolve('dist');
const ORIGIN = 'https://ibatoco.test';
// スマホ中心のサイトなので、スマホの主な幅をすべて見る（2026-10-03、320pxで100ページ超の崩れが見つかったため追加）
const VIEWPORTS = [
  { name: '320', width: 320, height: 640 },   // 小型Android・初代iPhone SE
  { name: '360', width: 360, height: 780 },   // Androidで最も多い幅
  { name: '375', width: 375, height: 812 },   // iPhone SE・mini
  { name: '390', width: 390, height: 844 },   // iPhone 12〜15
  { name: '414', width: 414, height: 896 },   // iPhone Plus 系
  { name: '430', width: 430, height: 932 },   // iPhone Pro Max 系
  { name: '768', width: 768, height: 1024 },  // タブレット縦
  { name: '1440', width: 1440, height: 900 }, // PC
];
const inCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';

function skipOrFail(message) {
  if (inCI) {
    console.error(`::error title=UI smoke::${message}`);
    console.error(`UIスモークテスト：${message}`);
    process.exit(1);
  }
  console.warn(`UIスモークテストを飛ばしました（ローカル）：${message}`);
  process.exit(0);
}

if (!existsSync(join(DIST, 'index.html'))) skipOrFail('dist/ がありません。先に astro build を実行してください');

let chromium;
try {
  ({ chromium } = await import('playwright-core'));
} catch {
  skipOrFail('playwright-core が見つかりません（npm ci を実行してください）');
}

let browser;
try {
  browser = await chromium.launch(process.env.CHROME_PATH
    ? { headless: true, executablePath: process.env.CHROME_PATH }
    : { headless: true, channel: 'chrome' });
} catch (error) {
  skipOrFail(`ブラウザを起動できません：${String(error.message).split('\n')[0]}`);
}

/** dist のファイル。/foo/ → /foo/index.html、拡張子の無いパスも index.html を探す */
function distFile(pathname) {
  const decoded = decodeURIComponent(pathname);
  const candidates = decoded.endsWith('/')
    ? [join(DIST, decoded, 'index.html')]
    : [join(DIST, decoded), join(DIST, decoded, 'index.html')];
  return candidates.find((file) => file.startsWith(DIST) && existsSync(file) && statSync(file).isFile());
}

const pages = qaPages();
const failures = [];
let checked = 0;

try {
  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 1,
      locale: 'ja-JP',
      timezoneId: 'Asia/Tokyo',
      serviceWorkers: 'block',
    });
    const missing = new Set();
    await context.route('**/*', async (route) => {
      const url = new URL(route.request().url());
      if (url.origin === ORIGIN) {
        const file = distFile(url.pathname);
        if (file) return route.fulfill({ path: file });
        missing.add(`${route.request().resourceType()} ${url.pathname}`);
        return route.fulfill({ status: 404, body: 'not found' });
      }
      if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') return route.continue();
      return route.abort();
    });

    for (const target of pages) {
      const page = await context.newPage();
      const jsErrors = [];
      page.on('pageerror', (error) => jsErrors.push(String(error.message).split('\n')[0]));
      missing.clear();
      const where = `${target.name}（${target.path}）@${viewport.name}px`;
      try {
        const response = await page.goto(`${ORIGIN}${target.path}`, { waitUntil: 'load', timeout: 30000 });
        if (!response || response.status() !== 200) {
          failures.push(`${where}: HTTP ${response?.status() ?? 'なし'}（dist にページがありません）`);
          continue;
        }
        if (target.waitFor) await page.waitForSelector(target.waitFor, { timeout: 8000 }).catch(() => {});
        await page.waitForTimeout(250);

        const result = await page.evaluate(inspectPage, { required: target.required.map(([selector, min]) => [selector, min]) });
        for (const issue of result.issues) failures.push(`${where}: ${issue.type} — ${issue.detail}`);
        for (const [selector, min] of target.required) {
          const count = result.counts[selector] ?? 0;
          if (count < min) failures.push(`${where}: 主要要素の欠損 — ${selector} が ${count} 件（${min} 件以上必要）`);
        }
        // 遅延読み込みでまだ要求されていない画像も、dist に実在するかを確かめる
        for (const src of new Set(result.imgs)) {
          if (!src.startsWith('/') || src.startsWith('//')) continue;
          if (!distFile(new URL(src, ORIGIN).pathname)) missing.add(`image ${src}`);
        }
        for (const item of missing) failures.push(`${where}: 404 — ${item}`);
        for (const message of jsErrors) failures.push(`${where}: JSエラー — ${message}`);
        checked += 1;
      } catch (error) {
        failures.push(`${where}: 検査できませんでした — ${String(error.message).split('\n')[0]}`);
      } finally {
        await page.close();
      }
    }
    await context.close();
  }
} finally {
  await browser.close();
}

if (failures.length > 0) {
  console.error(`UIスモークテストで ${failures.length} 件の問題（${checked} 画面を検査）`);
  for (const line of failures) {
    console.error(`  - ${line}`);
    if (inCI) console.error(`::error title=UI smoke::${line}`);
  }
  process.exit(1);
}
console.log(`UIスモークテスト通過：${pages.length} ページ × ${VIEWPORTS.length} 幅（${VIEWPORTS.map((v) => v.name).join(' / ')}px）、問題 0 件`);
