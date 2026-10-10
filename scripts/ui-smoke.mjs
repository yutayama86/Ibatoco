/**
 * 主要ページのレスポンシブUI検査（Responsive QA）。表示崩れはリリースを止める障害として扱う。
 *
 * 2つのモードがある。
 *   ビルド出力（既定）：node scripts/ui-smoke.mjs
 *     ビルド済みの dist/ を、ネットワークに出さずにブラウザで開いて検査する（npm run verify の最後で実行）。
 *     ポートを開かず、Playwright の route で dist のファイルを返す（https://ibatoco.test/）。
 *   本番：node scripts/ui-smoke.mjs --production
 *     デプロイ後の https://ibatoco.jp を同じ基準で検査する（npm run deploy の最後で実行）。
 *     本番の /build.json が、デプロイしたビルド（dist/build.json）と同じコミットであることを先に確かめる。
 *     --any-commit を付けると、コミットを問わずに今の本番を検査する（随時の点検用。合否の記録には使わない）。
 *     加えて、内部リンク切れ・画像のHTTP状態・/control/ の認証転送も確かめる。
 *
 * 検出するもの（scripts/ui-smoke-checks.mjs）：
 *   - 読者が横スクロールできてしまうはみ出し / 画面の右端で切られる中身
 *   - CTA・カードの viewport 外へのはみ出し / 親に途中で切られる文字
 *   - 極端に狭いテキスト領域（1〜2文字ずつ縦に割れる）
 *   - img の src 欠損 / 404 / 読み込めない画像 / 縦横比の歪み
 *   - main・h1 が1つずつでない / 骨格（ヘッダー・ナビ・本文・フッター）と主要CTAの欠損（scripts/qa-pages.mjs）
 *   - JSエラー（pageerror と console.error）/ 同じサイトの読み込み失敗
 *
 * ブラウザ：Chrome 本体（Playwright の channel: 'chrome'）か、環境変数 CHROME_PATH。
 * 無料のOSS（playwright-core）だけを使い、ブラウザのダウンロードはしない。
 * CI（GitHub Actions の ubuntu-latest には Chrome が入っている）ではブラウザが起動できなければ失敗、
 * ローカルでは警告を出して飛ばす（サンドボックス等で Chrome を起動できない環境があるため）。
 *
 * 計測・広告へのリクエストはすべて止める。本番モードでは、さらに計測除外フラグ（ibatoco_ga_optout）を立てる。
 * GA4 に検査のアクセスを1件も送らない（11月10万PVの実測を汚さないため）。
 * ビルド出力のモードでは外部への通信をすべて止め、Google Fonts だけ通す（無いと文字幅が変わり、判定がずれるため）。
 */
import { appendFileSync, existsSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { qaPages } from './qa-pages.mjs';
import { inspectPage } from './ui-smoke-checks.mjs';

const PRODUCTION = process.argv.includes('--production');
const ANY_COMMIT = process.argv.includes('--any-commit');
const DIST = resolve('dist');
const ORIGIN = PRODUCTION ? (process.env.QA_BASE_URL ?? 'https://ibatoco.jp').replace(/\/$/, '') : 'https://ibatoco.test';
const LABEL = PRODUCTION ? '本番Responsive QA' : 'UIスモークテスト';
// スマホ中心のサイトなので、スマホの主な幅をすべて見る（2026-10-03、320pxで100ページ超の崩れが見つかったため追加）
const ALL_VIEWPORTS = [
  { name: '320', width: 320, height: 640 },   // 小型Android・初代iPhone SE
  { name: '360', width: 360, height: 780 },   // Androidで最も多い幅
  { name: '375', width: 375, height: 812 },   // iPhone SE・mini（重点）
  { name: '390', width: 390, height: 844 },   // iPhone 12〜15
  { name: '402', width: 402, height: 874 },   // iPhone Pro系の現行幅
  { name: '412', width: 412, height: 915 },   // Android主要幅
  { name: '414', width: 414, height: 896 },   // iPhone Plus 系
  { name: '430', width: 430, height: 932 },   // iPhone Pro Max 系（重点）
  { name: '768', width: 768, height: 1024 },  // タブレット縦
  { name: '1280', width: 1280, height: 800 }, // ノートPC
  { name: '1440', width: 1440, height: 900 }, // PC
];
// 本番は通信を伴うので、必須の幅（320 / 375 / 430 / 768 / 1280 / 1440）に、利用の多い 360・390 を足した8幅に絞る
const PRODUCTION_VIEWPORTS = new Set(['320', '360', '375', '390', '430', '768', '1280', '1440']);
const VIEWPORTS = PRODUCTION ? ALL_VIEWPORTS.filter((v) => PRODUCTION_VIEWPORTS.has(v.name)) : ALL_VIEWPORTS;
// 同時に開く幅の数。CIの時間内（Validate・Deploy とも15分）に収めるため、幅ごとに並列で回す
const CONCURRENCY = 3;
const inCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
// 計測・広告。本番モードでも絶対に通さない
const BLOCKED_HOST = /(^|\.)(googletagmanager\.com|google-analytics\.com|analytics\.google\.com|doubleclick\.net|googlesyndication\.com|googleadservices\.com|clarity\.ms|facebook\.net)$/;

function skipOrFail(message) {
  if (inCI) {
    console.error(`::error title=${LABEL}::${message}`);
    console.error(`${LABEL}：${message}`);
    process.exit(1);
  }
  console.warn(`${LABEL}を飛ばしました（ローカル）：${message}`);
  process.exit(0);
}

if (!PRODUCTION && !existsSync(join(DIST, 'index.html'))) skipOrFail('dist/ がありません。先に astro build を実行してください');

/** dist のファイル。/foo/ → /foo/index.html、拡張子の無いパスも index.html を探す */
function distFile(pathname) {
  const decoded = decodeURIComponent(pathname);
  const candidates = decoded.endsWith('/')
    ? [join(DIST, decoded, 'index.html')]
    : [join(DIST, decoded), join(DIST, decoded, 'index.html')];
  return candidates.find((file) => file.startsWith(DIST) && existsSync(file) && statSync(file).isFile());
}

const failures = [];
const notes = [];
const perViewport = new Map(VIEWPORTS.map((v) => [v.name, { screens: 0, failures: 0 }]));
const pages = qaPages().filter((page) => !(PRODUCTION && page.localOnly));

// ---- 本番：デプロイした版が出ているか（違う版を検査して「合格」にしない） ----
if (PRODUCTION) {
  const expected = existsSync(join(DIST, 'build.json')) ? JSON.parse(readFileSync(join(DIST, 'build.json'), 'utf8')).commit : process.env.QA_EXPECTED_COMMIT;
  if (!expected && !ANY_COMMIT) skipOrFail('期待するコミットが分かりません（dist/build.json か QA_EXPECTED_COMMIT が必要）');
  let live = null;
  try {
    live = (await (await fetch(`${ORIGIN}/build.json?qa=${Date.now()}`, { cache: 'no-store' })).json()).commit;
  } catch (error) {
    skipOrFail(`本番の /build.json を読めません：${String(error.message).split('\n')[0]}`);
  }
  if (ANY_COMMIT) {
    notes.push(`コミットを問わず検査（本番 ${String(live).slice(0, 8)}）`);
  } else if (live !== expected) {
    const message = `本番のコミット ${String(live).slice(0, 8)} がデプロイしたビルド ${String(expected).slice(0, 8)} と一致しません`;
    console.error(`::error title=${LABEL}::${message}`);
    console.error(message);
    process.exit(1);
  } else {
    notes.push(`本番コミット一致：${String(live).slice(0, 8)}`);
  }
}

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

const sameOrigin = (url) => { try { return new URL(url).origin === ORIGIN; } catch { return false; } };
const internalLinks = new Set();
const pageImages = new Set();

async function runViewport(viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    locale: 'ja-JP',
    timezoneId: 'Asia/Tokyo',
    serviceWorkers: 'block',
  });
  // 本番：このブラウザを計測から除外する（BrandBase は除外フラグが立っていると gtag を読み込まない）
  if (PRODUCTION) await context.addInitScript(() => { try { localStorage.setItem('ibatoco_ga_optout', '1'); } catch {} });
  const missing = new Set();
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (BLOCKED_HOST.test(url.hostname) || url.pathname.endsWith('/g/collect')) return route.abort();
    if (PRODUCTION) return route.continue();
    if (url.origin === ORIGIN) {
      const file = distFile(url.pathname);
      if (file) return route.fulfill({ path: file });
      missing.add(`${route.request().resourceType()} ${url.pathname}`);
      return route.fulfill({ status: 404, body: 'not found' });
    }
    if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') return route.continue();
    return route.abort();
  });

  const stats = perViewport.get(viewport.name);
  for (const target of pages) {
    const page = await context.newPage();
    const jsErrors = [];
    const badResponses = [];
    page.on('pageerror', (error) => jsErrors.push(String(error.message).split('\n')[0]));
    page.on('console', (message) => {
      if (message.type() !== 'error') return;
      // 止めた外部リクエスト（計測・ビルド検査での外部画像）による読み込み失敗の通知は数えない
      const at = message.location()?.url ?? '';
      if (at && !sameOrigin(at) && /Failed to load resource|net::ERR_/.test(message.text())) return;
      jsErrors.push(`console.error: ${message.text().split('\n')[0].slice(0, 160)}`);
    });
    page.on('requestfailed', (request) => {
      if (sameOrigin(request.url())) badResponses.push(`読み込み失敗 ${request.resourceType()} ${new URL(request.url()).pathname}（${request.failure()?.errorText ?? ''}）`);
    });
    if (PRODUCTION) {
      page.on('response', (response) => {
        if (sameOrigin(response.url()) && response.status() >= 400) badResponses.push(`HTTP ${response.status()} ${response.request().resourceType()} ${new URL(response.url()).pathname}`);
      });
    }
    missing.clear();
    const where = `${target.name}（${target.path}）@${viewport.name}px`;
    // 幅を並列で回すので、この画面の結果を手元に集めてから全体へ足す（幅ごとの集計が混ざらないように）
    const local = [];
    try {
      const response = await page.goto(`${ORIGIN}${target.path}`, { waitUntil: 'load', timeout: PRODUCTION ? 45000 : 30000 });
      if (!response || response.status() !== 200) {
        local.push(`${where}: HTTP ${response?.status() ?? 'なし'}`);
        continue;
      }
      if (target.waitFor) await page.waitForSelector(target.waitFor, { timeout: 8000 }).catch(() => {});
      // 本番の375pxでは、遅延読み込みの画像まで読ませてから壊れた画像を数える（スマホの重点幅）
      if (PRODUCTION && viewport.name === '375') {
        await page.evaluate(async () => {
          for (let y = 0; y < document.documentElement.scrollHeight; y += Math.round(innerHeight * 0.9)) {
            scrollTo(0, y);
            await new Promise((r) => setTimeout(r, 80));
          }
          scrollTo(0, 0);
        });
        await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
      }
      await page.waitForTimeout(250);

      const result = await page.evaluate(inspectPage, {
        required: target.required.map(([selector, min]) => [selector, min]),
        skipExternalImages: !PRODUCTION,
      });
      for (const issue of result.issues) local.push(`${where}: ${issue.type} — ${issue.detail}`);
      for (const [selector, min] of target.required) {
        const count = result.counts[selector] ?? 0;
        if (count < min) local.push(`${where}: 主要要素の欠損 — ${selector} が ${count} 件（${min} 件以上必要）`);
      }
      if (PRODUCTION) {
        for (const src of result.imgs) if (src.startsWith('/') && !src.startsWith('//')) pageImages.add(src);
        if (viewport.name === '375') {
          const links = await page.evaluate(() => [...document.querySelectorAll('a[href]')].map((a) => a.href));
          for (const href of links) {
            if (!sameOrigin(href)) continue;
            const url = new URL(href);
            url.hash = '';
            internalLinks.add(url.pathname + url.search);
          }
        }
      } else {
        // 遅延読み込みでまだ要求されていない画像も、dist に実在するかを確かめる
        for (const src of new Set(result.imgs)) {
          if (!src.startsWith('/') || src.startsWith('//')) continue;
          if (!distFile(new URL(src, ORIGIN).pathname)) missing.add(`image ${src}`);
        }
      }
      for (const item of missing) local.push(`${where}: 404 — ${item}`);
      for (const item of new Set(badResponses)) local.push(`${where}: ${item}`);
      for (const message of new Set(jsErrors)) local.push(`${where}: JSエラー — ${message}`);
    } catch (error) {
      local.push(`${where}: 検査できませんでした — ${String(error.message).split('\n')[0]}`);
    } finally {
      stats.screens += 1;
      stats.failures += local.length;
      failures.push(...local);
      await page.close();
    }
  }
  await context.close();
}

// 本番：GA4 の送信経路が CSP で止められていないか。gtag.js だけ読み込み、送信（/g/collect）はブラウザの外に出る前に止める（テストの計測は送らない）。
// CSP で止められた送信は route に届かず console に CSP 違反が出る。届いた送信は abort する
async function checkAnalyticsPath() {
  const context = await browser.newContext({ locale: 'ja-JP', timezoneId: 'Asia/Tokyo', serviceWorkers: 'block' });
  const attempts = new Set();
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === 'www.googletagmanager.com' && url.pathname === '/gtag/js') return route.continue();
    if (BLOCKED_HOST.test(url.hostname) || /(^|\.)google\.com$/.test(url.hostname) || url.pathname.endsWith('/g/collect')) {
      if (url.pathname.endsWith('/collect')) attempts.add(url.hostname);
      return route.abort();
    }
    return route.continue();
  });
  const page = await context.newPage();
  const cspErrors = new Set();
  page.on('console', (message) => {
    if (message.type() === 'error' && /Content Security Policy/.test(message.text()) && /collect|google/.test(message.text())) {
      cspErrors.add((message.text().match(/https:\/\/[^/'\s?]+/)?.[0]) ?? message.text().slice(0, 80));
    }
  });
  try {
    await page.goto(`${ORIGIN}/`, { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(6000);
  } finally {
    await context.close();
  }
  if (cspErrors.size) failures.push(`GA4 の送信が CSP で止められている：${[...cspErrors].join('・')}（public/_headers の connect-src）`);
  else if (!attempts.size) failures.push('GA4：gtag.js が送信を試みなかった（タグの読み込み・測定ID・本番ホストの判定を確認）');
  else notes.push(`GA4 の送信経路：CSP で止められていない（送信先 ${[...attempts].join('・')}。送信は QA で止め、計測は送っていない）`);
}

try {
  const queue = [...VIEWPORTS];
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) await runViewport(queue.shift());
  }));
  if (PRODUCTION) await checkAnalyticsPath();
} finally {
  await browser.close();
}

// ---- 本番：内部リンク・画像のHTTP状態と、/control/ の認証 ----
if (PRODUCTION) {
  const statusOf = async (path, redirect = 'follow') => {
    try {
      const res = await fetch(`${ORIGIN}${path}`, { method: 'GET', redirect, headers: { 'user-agent': 'IbatocoProductionQA/1.0' } });
      return { status: res.status, location: res.headers.get('location') ?? '', robots: res.headers.get('x-robots-tag') ?? '', cache: res.headers.get('cache-control') ?? '' };
    } catch (error) {
      return { status: 0, error: String(error.message).split('\n')[0] };
    }
  };
  const checkAll = async (paths, kind) => {
    const list = [...paths].slice(0, 400);
    let index = 0;
    await Promise.all(Array.from({ length: 8 }, async () => {
      while (index < list.length) {
        const path = list[index++];
        const res = await statusOf(path);
        if (res.status !== 200) failures.push(`${kind}: ${path} が HTTP ${res.status}${res.error ? ` ${res.error}` : ''}`);
      }
    }));
    notes.push(`${kind}：${list.length} 件を確認`);
  };
  await checkAll(new Set([...internalLinks].filter((p) => !p.startsWith('/control'))), '内部リンク');
  await checkAll(pageImages, '画像');

  // /control/ は2つの設計のどちらかであること（どちらでもない＝公開されているのに検索除外・キャッシュ禁止が無い、を失敗にする）
  //   ログイン必須：未ログインはログイン画面へ転送、ログイン画面は noindex
  //   公開（読み取り専用）：200 で X-Robots-Tag に noindex、Cache-Control に no-store
  const control = await statusOf('/control/', 'manual');
  if ([302, 303, 307].includes(control.status) && /\/control\/login$/.test(control.location)) {
    const login = await statusOf('/control/login', 'manual');
    if (login.status !== 200 || !/noindex/.test(login.robots)) {
      failures.push(`/control/login: HTTP ${login.status}、X-Robots-Tag「${login.robots}」（200 と noindex が必要）`);
    } else {
      notes.push('/control/：ログイン必須（未ログインはログイン画面へ転送、ログイン画面は noindex）');
    }
  } else if (control.status === 200) {
    if (!/noindex/.test(control.robots) || !/no-store/.test(control.cache)) {
      failures.push(`/control/: 公開されているが X-Robots-Tag「${control.robots}」Cache-Control「${control.cache}」（noindex と no-store が必要）`);
    } else {
      notes.push('/control/：読み取り専用で公開（X-Robots-Tag noindex・Cache-Control no-store）');
    }
  } else {
    failures.push(`/control/: HTTP ${control.status} ${control.location}（ログイン画面への転送か、noindex 付きの 200 が必要）`);
  }
}

// ---- 結果 ----
const summary = [
  `### ${LABEL}${PRODUCTION ? `（${ORIGIN}）` : ''}`,
  '',
  `${pages.length} ページ × ${VIEWPORTS.length} 幅`,
  '',
  '| 幅 | 画面 | 問題 | 判定 |',
  '|---|---|---|---|',
  ...VIEWPORTS.map((v) => {
    const s = perViewport.get(v.name);
    return `| ${v.name}px | ${s.screens} | ${s.failures} | ${s.failures === 0 ? 'PASS' : 'FAIL'} |`;
  }),
  '',
  ...notes.map((note) => `- ${note}`),
  ...(failures.length ? ['', `問題 ${failures.length} 件`, ...failures.slice(0, 60).map((line) => `- ${line}`)] : []),
  '',
].join('\n');
if (process.env.GITHUB_STEP_SUMMARY) {
  try { appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`); } catch {}
}

for (const note of notes) console.log(`  ・${note}`);
if (failures.length > 0) {
  const screens = [...perViewport.values()].reduce((sum, s) => sum + s.screens, 0);
  console.error(`${LABEL}で ${failures.length} 件の問題（${screens} 画面を検査）`);
  for (const line of failures) {
    console.error(`  - ${line}`);
    if (inCI) console.error(`::error title=${LABEL}::${line}`);
  }
  process.exit(1);
}
console.log(`${LABEL}通過：${pages.length} ページ × ${VIEWPORTS.length} 幅（${VIEWPORTS.map((v) => v.name).join(' / ')}px）、問題 0 件`);
