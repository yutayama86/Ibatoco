#!/usr/bin/env node
/**
 * イバトコ編集OS。
 *
 * sync      公開コンテンツからイベント台帳を同期する（手入力の未掲載候補は保持）
 * check     台帳・実装キュー・パフォーマンス入力の整合性を検証する
 * daily     同期・検証後、日次ブリーフとClaude向け実装指示を生成する
 * inventory コンテンツ在庫をJSONで出力する
 *
 * 外部情報を推測で補完しない。検索需要・来訪規模・収益性は、人またはChatGPTが
 * 一次情報と実データを確認したうえで台帳に入力する。
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = join(ROOT, 'data/editorial');
const REPORT_DIR = join(ROOT, 'reports/editorial');
const EVENT_REGISTRY = join(DATA_DIR, 'event-registry.json');
const ACTION_QUEUE = join(DATA_DIR, 'action-queue.json');
const PERFORMANCE = join(DATA_DIR, 'performance-snapshot.json');
const SEO_CHANGES = join(ROOT, 'src/data/seo-changes.ts');
const CONTENT_DIRS = [
  { type: 'event', dir: join(ROOT, 'src/content/events'), prefix: '/events/' },
  { type: 'news', dir: join(ROOT, 'src/content/news'), prefix: '/news/' },
];
const VALID_ACTION_KINDS = new Set([
  'new-article', 'update', 'seo', 'event', 'sports', 'revenue',
  'internal-link', 'cta', 'technical', 'measurement', 'sns-only', 'none',
]);
const VALID_ACTION_STATUS = new Set(['candidate', 'ready', 'in-progress', 'done', 'rejected']);
const VALID_EVENT_STATUS = new Set([
  'discovered', 'verified', 'candidate', 'draft', 'published', 'update-needed', 'ended', 'rejected',
]);
const VALID_SIGNAL = new Set(['unknown', 'low', 'medium', 'high']);

const command = process.argv[2] ?? 'daily';
const write = process.argv.includes('--write');

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function tokyoDate() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date());
  const get = (type) => parts.find((part) => part.type === type)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function stripQuotes(value) {
  const v = value.trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1);
  }
  return v;
}

function frontmatter(raw) {
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---/);
  return match?.[1] ?? '';
}

function scalar(fm, key) {
  const match = fm.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
  return match ? stripQuotes(match[1]) : null;
}

function bool(fm, key) {
  const value = scalar(fm, key);
  return value === 'true' ? true : value === 'false' ? false : null;
}

function topLevelBlock(fm, key) {
  const lines = fm.split('\n');
  const start = lines.findIndex((line) => new RegExp(`^${key}:\\s*$`).test(line));
  if (start < 0) return '';
  const block = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^[A-Za-z][A-Za-z0-9]*:\s*/.test(lines[index])) break;
    block.push(lines[index]);
  }
  return block.join('\n');
}

function nestedScalar(block, key) {
  const match = block.match(new RegExp(`^\\s{2}${key}:\\s*(.+)$`, 'm'));
  return match ? stripQuotes(match[1]) : null;
}

function list(fm, key) {
  const block = topLevelBlock(fm, key);
  return [...block.matchAll(/^\s{2}-\s+(.+)$/gm)].map((match) => stripQuotes(match[1]));
}

function dateValue(value) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function dateDiff(from, to) {
  const start = Date.parse(`${from}T00:00:00+09:00`);
  const end = Date.parse(`${to}T00:00:00+09:00`);
  return Math.floor((end - start) / 86400000);
}

function contentInventory() {
  const rows = [];
  for (const source of CONTENT_DIRS) {
    for (const file of readdirSync(source.dir).filter((name) => name.endsWith('.md') && !name.startsWith('_'))) {
      const path = join(source.dir, file);
      const fm = frontmatter(readFileSync(path, 'utf8'));
      const slug = basename(file, '.md');
      const businessIntent = topLevelBlock(fm, 'businessIntent');
      rows.push({
        id: `${source.type}:${slug}`,
        type: source.type,
        slug,
        url: `${source.prefix}${slug}/`,
        file: relative(ROOT, path),
        title: scalar(fm, 'title'),
        articleType: scalar(fm, 'articleType'),
        keyword: scalar(fm, 'keyword'),
        pubDate: dateValue(scalar(fm, 'pubDate')),
        updatedDate: dateValue(scalar(fm, 'updatedDate')),
        municipalities: list(fm, 'municipalities'),
        tags: list(fm, 'tags'),
        draft: bool(fm, 'draft') ?? true,
        reviewed: bool(fm, 'reviewed') ?? false,
        noindex: bool(fm, 'noindex') ?? false,
        hasBooking: /^booking:\s*$/m.test(fm),
        hasBusinessIntent: /^businessIntent:\s*$/m.test(fm),
        intents: [...businessIntent.matchAll(/^\s{2}([A-Za-z]+):\s*true$/gm)].map((match) => match[1]),
        sourceCount: [...topLevelBlock(fm, 'sourceUrls').matchAll(/^\s{2}-\s+label:/gm)].length,
      });
    }
  }
  return rows.sort((a, b) => a.url.localeCompare(b.url));
}

function eventFromContent(item) {
  if (item.type !== 'event' || item.articleType !== 'event') return null;
  const fm = frontmatter(readFileSync(join(ROOT, item.file), 'utf8'));
  const info = topLevelBlock(fm, 'eventInfo');
  const officialUrl = nestedScalar(info, 'officialUrl');
  const firstSourceUrl = topLevelBlock(fm, 'sourceUrls').match(/^\s{4}url:\s*"?([^"\n]+)"?/m)?.[1] ?? null;
  return {
    id: item.slug,
    name: nestedScalar(info, 'name') ?? item.title,
    municipality: item.municipalities[0] ?? null,
    startDate: dateValue(nestedScalar(info, 'startDate')),
    endDate: dateValue(nestedScalar(info, 'endDate')),
    officialUrl: officialUrl ?? firstSourceUrl,
    discoveredAt: item.pubDate,
    verifiedAt: item.updatedDate ?? item.pubDate,
    articleUrl: item.url,
    articleUpdatedAt: item.updatedDate ?? item.pubDate,
    status: !item.draft && item.reviewed ? 'published' : 'draft',
    importance: 'normal',
    signals: {
      searchDemand: 'unknown',
      visitorDraw: 'unknown',
      localSpend: item.hasBooking ? 'medium' : 'unknown',
      logisticsDemand: 'unknown'
    },
    notes: 'コンテンツから自動同期。重要度と需要シグナルは実データ確認後に更新する。'
  };
}

function mergeEvent(existing, generated) {
  if (!existing) return generated;
  return {
    ...generated,
    ...existing,
    name: generated.name ?? existing.name,
    municipality: generated.municipality ?? existing.municipality,
    startDate: generated.startDate ?? existing.startDate,
    endDate: generated.endDate ?? existing.endDate,
    officialUrl: generated.officialUrl ?? existing.officialUrl,
    articleUrl: generated.articleUrl,
    articleUpdatedAt: generated.articleUpdatedAt,
    status: generated.status,
    signals: { ...generated.signals, ...existing.signals },
  };
}

function syncRegistry(inventory, persist) {
  const registry = readJson(EVENT_REGISTRY);
  const existingByArticle = new Map(registry.events.filter((event) => event.articleUrl).map((event) => [event.articleUrl, event]));
  // IDでも突き合わせる。記事化前の候補は articleUrl が null なので、
  // articleUrl だけで照合すると「手入力の候補」と「記事からの自動生成」が
  // 同じIDのまま2件並び、editorial:check が重複エラーで落ちる。
  const existingById = new Map(registry.events.map((event) => [event.id, event]));
  const generated = inventory.map(eventFromContent).filter(Boolean);
  const generatedUrls = new Set(generated.map((event) => event.articleUrl));
  const generatedIds = new Set(generated.map((event) => event.id));
  const manual = registry.events.filter((event) =>
    !generatedIds.has(event.id) && (!event.articleUrl || !generatedUrls.has(event.articleUrl)));
  const events = [
    ...manual,
    ...generated.map((event) => mergeEvent(existingByArticle.get(event.articleUrl) ?? existingById.get(event.id), event)),
  ].sort((a, b) => (a.startDate ?? '9999').localeCompare(b.startDate ?? '9999') || a.name.localeCompare(b.name, 'ja'));
  const next = { schemaVersion: 1, updatedAt: tokyoDate(), events };
  if (persist) writeJson(EVENT_REGISTRY, next);
  return next;
}

function parseSeoChanges() {
  const src = readFileSync(SEO_CHANGES, 'utf8');
  const pattern = /id:\s*'([^']+)',\s*\n\s*date:\s*'([^']+)',\s*\n\s*url:\s*'([^']+)',\s*\n\s*kind:\s*'([^']+)',\s*\n\s*change:\s*'([^']+)'/g;
  return [...src.matchAll(pattern)].map((match) => ({
    id: match[1], date: match[2], url: match[3], kind: match[4], change: match[5],
  }));
}

function validate(registry, actions, performance, inventory) {
  const errors = [];
  const warnings = [];
  const ids = new Set();
  const articleUrls = new Set(inventory.filter((item) => item.type === 'event' && item.articleType === 'event').map((item) => item.url));
  const registryUrls = new Set();
  for (const event of registry.events) {
    if (!event.id || ids.has(event.id)) errors.push(`イベントIDが未設定または重複: ${event.id ?? '(未設定)'}`);
    ids.add(event.id);
    if (!event.name) errors.push(`イベント名がありません: ${event.id}`);
    if (!VALID_EVENT_STATUS.has(event.status)) errors.push(`不正なイベントstatus: ${event.id} = ${event.status}`);
    if (event.startDate && !dateValue(event.startDate)) errors.push(`startDateはYYYY-MM-DD: ${event.id}`);
    if (event.endDate && !dateValue(event.endDate)) errors.push(`endDateはYYYY-MM-DD: ${event.id}`);
    if (event.startDate && event.endDate && event.endDate < event.startDate) errors.push(`終了日が開始日より前: ${event.id}`);
    if (['verified', 'candidate', 'draft', 'published', 'update-needed', 'ended'].includes(event.status) && !event.officialUrl) {
      errors.push(`一次情報URLが必要: ${event.id}`);
    }
    if (event.articleUrl) {
      if (registryUrls.has(event.articleUrl)) errors.push(`articleUrlが重複: ${event.articleUrl}`);
      registryUrls.add(event.articleUrl);
    }
    for (const [key, value] of Object.entries(event.signals ?? {})) {
      if (!VALID_SIGNAL.has(value)) errors.push(`不正な需要シグナル: ${event.id}.${key} = ${value}`);
    }
  }
  for (const url of articleUrls) {
    if (!registryUrls.has(url)) errors.push(`イベント記事が台帳にありません。npm run editorial:sync を実行: ${url}`);
  }

  const actionIds = new Set();
  for (const action of actions.actions) {
    if (!action.id || actionIds.has(action.id)) errors.push(`action IDが未設定または重複: ${action.id ?? '(未設定)'}`);
    actionIds.add(action.id);
    if (!VALID_ACTION_KINDS.has(action.kind)) errors.push(`不正なaction kind: ${action.id} = ${action.kind}`);
    if (!VALID_ACTION_STATUS.has(action.status)) errors.push(`不正なaction status: ${action.id} = ${action.status}`);
    if (action.status === 'ready') {
      if (!action.specPath) errors.push(`readyにはspecPathが必要: ${action.id}`);
      else if (!existsSync(join(ROOT, action.specPath))) errors.push(`実装仕様が存在しません: ${action.id} -> ${action.specPath}`);
      if (!action.primarySourceUrls?.length) errors.push(`readyには一次情報URLが必要: ${action.id}`);
      if (!action.acceptanceCriteria?.length) errors.push(`readyには受入条件が必要: ${action.id}`);
    }
  }

  if (performance.asOf && !dateValue(performance.asOf)) errors.push('performance-snapshot.asOfはYYYY-MM-DDで指定');
  if (!performance.asOf) warnings.push('GA4/GSCスナップショットが未入力。順位・流入・CVに基づく優先度判定はできません。');
  else {
    const age = dateDiff(performance.asOf, tokyoDate());
    if (age > 2) warnings.push(`GA4/GSCスナップショットが${age}日前です。推測で数値を補わないでください。`);
  }
  return { errors, warnings };
}

function signalScore(value) {
  return { unknown: 0, low: 1, medium: 2, high: 3 }[value] ?? 0;
}

function coverageCandidates(registry) {
  const today = tokyoDate();
  return registry.events
    .filter((event) => !event.articleUrl && !['ended', 'rejected'].includes(event.status))
    .map((event) => {
      const days = event.startDate ? dateDiff(today, event.startDate) : null;
      const signals = event.signals ?? {};
      const evidenceScore = ['searchDemand', 'visitorDraw', 'localSpend', 'logisticsDemand']
        .reduce((total, key) => total + signalScore(signals[key] ?? 'unknown'), 0);
      const timingScore = days == null ? 0 : days < 0 ? -10 : days <= 14 ? 8 : days <= 30 ? 5 : days <= 120 ? 2 : 0;
      const urgency = days != null && days >= 0 && days <= 14 && event.importance === 'large' ? 'urgent' :
        days != null && days >= 0 && days <= 30 ? 'watch' : 'normal';
      return { ...event, daysToStart: days, evidenceScore, score: evidenceScore + timingScore, urgency };
    })
    .sort((a, b) => b.score - a.score || (a.daysToStart ?? 9999) - (b.daysToStart ?? 9999));
}

function improvementWatchlist() {
  const today = tokyoDate();
  return parseSeoChanges().map((change) => {
    const ageDays = dateDiff(change.date, today);
    return {
      ...change,
      ageDays,
      decision: ageDays < 7 ? 'freeze' : ageDays < 28 ? 'observe' : 'eligible-for-review',
    };
  });
}

function actionPriority(action) {
  const value = { critical: 4, high: 3, medium: 2, low: 1 }[action.priority] ?? 0;
  const ready = action.status === 'ready' ? 10 : 0;
  return ready + value;
}

function reportMarkdown({ registry, inventory, actions, performance, validation }) {
  const candidates = coverageCandidates(registry);
  const changes = improvementWatchlist();
  const ready = actions.actions.filter((action) => action.status === 'ready').sort((a, b) => actionPriority(b) - actionPriority(a));
  const published = inventory.filter((item) => !item.draft && item.reviewed);
  const within120 = registry.events.filter((event) => event.startDate && dateDiff(tokyoDate(), event.startDate) >= 0 && dateDiff(tokyoDate(), event.startDate) <= 120);
  const lines = [
    `# イバトコ日次編集ブリーフ｜${tokyoDate()}`,
    '',
    '## 1. データ品質',
    '',
    `- GA4/GSC基準日: ${performance.asOf ?? '未入力'}`,
    `- 検証: エラー${validation.errors.length}件・警告${validation.warnings.length}件`,
    ...validation.warnings.map((warning) => `- 警告: ${warning}`),
    '',
    '## 2. 情報カバレッジ',
    '',
    `- イベント台帳: ${registry.events.length}件`,
    `- 今後120日: ${within120.length}件`,
    `- 未掲載候補: ${candidates.length}件`,
    `- 公開コンテンツ: ${published.length}件（events ${published.filter((item) => item.type === 'event').length} / news ${published.filter((item) => item.type === 'news').length}）`,
    '',
    '### 重要未掲載イベント',
    '',
    ...(candidates.slice(0, 10).length ? candidates.slice(0, 10).map((event) =>
      `- [${event.urgency}] ${event.name}｜${event.startDate ?? '日程未確認'}｜${event.municipality ?? '地域未設定'}｜根拠スコア${event.evidenceScore}/12｜${event.officialUrl ?? '一次情報未登録'}`
    ) : ['- なし（未発見を意味しない。外部監視は別途必須）']),
    '',
    '## 3. 実装キュー',
    '',
    ...(ready.length ? ready.map((action) => `- [実装可] ${action.title}｜${action.kind}｜${action.specPath}`) : ['- 実装可の案件なし。Claudeへ調査・執筆を丸投げしない。']),
    '',
    '## 4. 改善待ち',
    '',
    `- 7日以内・変更凍結: ${changes.filter((change) => change.decision === 'freeze').length}件`,
    `- 8〜27日・経過観察: ${changes.filter((change) => change.decision === 'observe').length}件`,
    `- 28日以上・再評価可: ${changes.filter((change) => change.decision === 'eligible-for-review').length}件`,
    '',
    '## 5. 今日の判断',
    '',
    ready.length
      ? `実装対象は「${ready[0].title}」。完成仕様 ${ready[0].specPath} だけを正本として実装する。`
      : '情報監視と台帳更新は継続するが、完成仕様がないため実装は開始しない。ChatGPT側で一次情報・SEO・本文・内部リンク・CTA・検証条件まで完成させ、actionをreadyへ進める。',
    '',
  ];
  return lines.join('\n');
}

function claudeBrief(actions) {
  const ready = actions.actions.filter((action) => action.status === 'ready').sort((a, b) => actionPriority(b) - actionPriority(a));
  if (!ready.length) {
    return `# Claude Code 実装指示｜${tokyoDate()}\n\n本日は実装可の案件がありません。\n\n- 調査、SEO判断、記事構成、本文作成を独自に開始しない\n- \`data/editorial/event-registry.json\` の未掲載候補を削除しない\n- 完成仕様が追加され、\`data/editorial/action-queue.json\` のstatusが \`ready\` になるまで待つ\n`;
  }
  const action = ready[0];
  return [
    `# Claude Code 実装指示｜${tokyoDate()}`,
    '',
    `対象: ${action.title}`,
    `種別: ${action.kind}`,
    `対象URL: ${action.targetUrl ?? '仕様書に従う'}`,
    `正本: ${action.specPath}`,
    '',
    '## 実装ルール',
    '',
    '- 正本の完成原稿・metadata・内部リンク・CTA・構造化データをそのまま実装する',
    '- 正本にない戦略判断、追加調査、文章の水増し、URL変更、デザイン全面変更を行わない',
    '- 一次情報と矛盾を見つけた場合は推測で直さず停止して報告する',
    '- 既存のAGENTS.mdと公開安全基準を守る',
    '- 実装後に `npm run verify` を実行する',
    '',
    '## 受入条件',
    '',
    ...action.acceptanceCriteria.map((item) => `- ${item}`),
    '',
  ].join('\n');
}

function runCheck(registry, inventory) {
  const actions = readJson(ACTION_QUEUE);
  const performance = readJson(PERFORMANCE);
  const validation = validate(registry, actions, performance, inventory);
  for (const warning of validation.warnings) console.warn(`警告: ${warning}`);
  if (validation.errors.length) {
    for (const error of validation.errors) console.error(`エラー: ${error}`);
    process.exitCode = 1;
  } else {
    console.log(`編集OS検証：イベント${registry.events.length}件・実装キュー${actions.actions.length}件にエラーなし`);
  }
  return { actions, performance, validation };
}

const inventory = contentInventory();

if (command === 'inventory') {
  const output = join(REPORT_DIR, 'content-inventory.json');
  writeJson(output, { generatedAt: tokyoDate(), items: inventory });
  console.log(relative(ROOT, output));
  process.exit(0);
}

if (command === 'sync') {
  const registry = syncRegistry(inventory, true);
  console.log(`イベント台帳を同期：${registry.events.length}件`);
  process.exit(0);
}

// checkは保存済み台帳をそのまま検査する。ここで暗黙に同期すると、
// 新しいイベント記事を追加したのに台帳更新を忘れた状態をCIが見逃すため。
const registry = command === 'check'
  ? readJson(EVENT_REGISTRY)
  : syncRegistry(inventory, write || command === 'daily');
const { actions, performance, validation } = runCheck(registry, inventory);

if (command === 'check') process.exit(process.exitCode ?? 0);
if (command !== 'daily') {
  console.error(`不明なコマンド: ${command}`);
  process.exit(1);
}
if (validation.errors.length) process.exit(1);

mkdirSync(REPORT_DIR, { recursive: true });
writeJson(join(REPORT_DIR, 'content-inventory.json'), { generatedAt: tokyoDate(), items: inventory });
writeJson(join(REPORT_DIR, 'daily-brief.json'), {
  generatedAt: tokyoDate(),
  dataQuality: { performanceAsOf: performance.asOf, warnings: validation.warnings },
  coverageCandidates: coverageCandidates(registry),
  improvementWatchlist: improvementWatchlist(),
  readyActions: actions.actions.filter((action) => action.status === 'ready'),
});
writeFileSync(join(REPORT_DIR, 'daily-brief.md'), reportMarkdown({ registry, inventory, actions, performance, validation }), 'utf8');
writeFileSync(join(REPORT_DIR, 'claude-implementation-brief.md'), claudeBrief(actions), 'utf8');
console.log(`日次ブリーフを生成：${relative(ROOT, REPORT_DIR)}`);
