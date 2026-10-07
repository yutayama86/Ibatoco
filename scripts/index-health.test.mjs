/**
 * Index Health Check（scripts/index-health.mjs）の単体テスト。npm run verify で実行する。
 * 一時ディレクトリに dist と記事を作り、CI を止めるべき問題を本当に検出するかを確かめる。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const SCRIPT = join(process.cwd(), 'scripts/index-health.mjs');
const page = (path, { canonical = path, noindex = false } = {}) => `<!doctype html><html><head>${canonical == null ? '' : `<link rel="canonical" href="https://ibatoco.jp${canonical}">`}${noindex ? '<meta name="robots" content="noindex, follow">' : ''}</head><body></body></html>`;

function fixture({ sitemap, pages, content = {} }) {
  const root = mkdtempSync(join(tmpdir(), 'index-health-'));
  const write = (file, body) => { mkdirSync(dirname(join(root, file)), { recursive: true }); writeFileSync(join(root, file), body); };
  write('dist/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?><urlset>${sitemap.map((p) => `<url><loc>https://ibatoco.jp${p}</loc></url>`).join('')}</urlset>`);
  for (const [path, opts] of Object.entries(pages)) write(`dist${path}index.html`, page(path, opts));
  for (const [file, fm] of Object.entries(content)) write(`src/content/${file}`, `---\n${fm}\n---\n`);
  return root;
}

const run = (root, ...args) => {
  const r = spawnSync(process.execPath, [SCRIPT, '--json', ...args], { cwd: root, encoding: 'utf8', env: { ...process.env, GITHUB_STEP_SUMMARY: '', GITHUB_ACTIONS: '' } });
  return { code: r.status, result: JSON.parse(r.stdout) };
};

test('正常：sitemap と公開記事が一致していれば終了コード0', () => {
  const root = fixture({
    sitemap: ['/', '/events/a/'],
    pages: { '/': {}, '/events/a/': {} },
    content: { 'events/a.md': 'draft: false\nreviewed: true' },
  });
  const { code, result } = run(root);
  assert.equal(code, 0);
  assert.equal(result.sitemapUrls, 2);
  assert.equal(result.blockers.length, 0);
  rmSync(root, { recursive: true, force: true });
});

test('CIを止める：重複・noindex混入・draft混入・canonical不整合・存在しないURL・公開記事の欠落', () => {
  const root = fixture({
    sitemap: ['/', '/', '/news/noindex/', '/events/draft/', '/events/canon/', '/events/ghost/'],
    pages: {
      '/': {},
      '/news/noindex/': { noindex: true },
      '/events/draft/': {},
      '/events/canon/': { canonical: '/events/other/' },
      '/events/missing/': {},
      '/events/hidden/': { noindex: true }, // noindex の記事は sitemap に無くてよい
    },
    content: {
      'events/draft.md': 'draft: true\nreviewed: false',
      'events/canon.md': 'draft: false\nreviewed: true',
      'events/missing.md': 'draft: false\nreviewed: true',
      'events/hidden.md': 'draft: false\nreviewed: true\nnoindex: true',
      'news/noindex.md': 'draft: false\nreviewed: true\nnoindex: true',
    },
  });
  const { code, result } = run(root);
  assert.equal(code, 1);
  assert.equal(result.counts.duplicateUrls, 1);
  assert.equal(result.counts.noindexInSitemap, 1);
  assert.equal(result.counts.draftInSitemap, 1);
  assert.equal(result.counts.canonicalErrors, 1);
  assert.equal(result.counts.notFound, 1);
  assert.equal(result.counts.missingFromSitemap, 1);
  assert.deepEqual(result.blockers.filter((b) => b.type === 'missing-from-sitemap').map((b) => b.path), ['/events/missing/']);
  rmSync(root, { recursive: true, force: true });
});

test('記事以外で sitemap に無い公開ページは参考扱い（止めない）。/control/ は対象外。--write でカードに書き込む', () => {
  const root = fixture({
    sitemap: ['/'],
    pages: { '/': {}, '/tag/x/': {}, '/control/': { noindex: true } },
  });
  writeFileSync(join(root, 'dist/control/index.html'), '<html><head><meta name="robots" content="noindex"></head><body><div data-index-health-body><p>未計測</p></div><span hidden data-index-health-end></span></body></html>');
  const { code, result } = run(root, '--write');
  assert.equal(code, 0);
  assert.deepEqual(result.notes.map((n) => n.path), ['/tag/x/']);
  const control = readFileSync(join(root, 'dist/control/index.html'), 'utf8');
  assert.match(control, /ih-status is-good/);
  assert.match(control, /Sitemap URLs<\/dt><dd>1<\/dd>/);
  assert.doesNotMatch(control, /未計測/);
  rmSync(root, { recursive: true, force: true });
});
