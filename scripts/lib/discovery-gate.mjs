/**
 * Discovery Gate（イベント取りこぼし防止）の判定。docs/EDITORIAL_OS.md の「Discovery Gate」が正本。
 *
 * 外部サイトの巡回はしない（検索・確認は毎朝の編集作業で人とChatGPTが行い、data/editorial/event-registry.json に登録する）。
 * ここでは台帳だけを見て、次を機械的に判定する。
 *   - 重複（表記ゆれを除いた名前＋開始日、または一次情報URL＋開始日が同じ）
 *   - 未掲載・未検証・見送り理由の欠落
 *   - 開催30日前（記事化の判断）・14日前（公式再確認）・7日前（交通・駐車場・料金）・前日（開催可否・雨天・変更）の確認期限
 *   - 週次棚卸し（今後90日の未掲載候補を地域別・週別に並べる）
 * 日付はすべて日本の暦日（YYYY-MM-DD）。src/lib/date-only.js で比較する。
 */
import { addDateOnlyDays, dateOnlyWeekday, parseDateOnly } from '../../src/lib/date-only.js';

export const VALID_IMPORTANCE = new Set(['normal', 'large', 'urgent']);
/** 記事化・確認をしない（できない）状態。未掲載の集計から外す */
const CLOSED_STATUS = new Set(['ended', 'rejected']);
/** 確認の節目（開催の何日前か）と、その時点で確かめること */
export const MILESTONES = [
  { days: 1, label: '前日', focus: '開催可否・雨天時の対応・直前の変更' },
  { days: 7, label: '7日前', focus: '交通・駐車場・料金' },
  { days: 14, label: '14日前', focus: '公式情報の再確認（日時・会場・内容）' },
  { days: 30, label: '30日前', focus: '記事化するか、まとめへの追記か、見送りかの判断' },
];
const REGION_LABEL = { kenpoku: '県北', keno: '県央', kennan: '県南', rokko: '鹿行', kensei: '県西' };

const isDate = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
const iso = (date) => date.toISOString().slice(0, 10);

/** today から target までの日数（target が後なら正） */
export function daysUntil(today, target) {
  return Math.round((parseDateOnly(target) - parseDateOnly(today)) / 86400000);
}

/** 表記ゆれを除いた名前。年・回数・記号・空白・全角半角の違いを無視する */
export function normalizeEventName(name) {
  return String(name ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/20\d\d年?度?|令和\d+年度?|第\d+回/g, '')
    .replace(/[\s・｜|()（）「」『』【】\-–—:：!！?？、。,.~〜]/g, '');
}

function normalizeUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    // 観光いばらきの event.php?code=… のように、クエリで催しを分けるポータルがあるため、クエリも含めて比べる
    const params = [...u.searchParams].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join('&');
    return `${u.host.replace(/^www\./, '')}${u.pathname.replace(/\/(index\.html?)?$/, '')}${params ? `?${params}` : ''}`;
  } catch {
    return null;
  }
}

/**
 * 重複の組。名前＋開始日が同じものは error、一次情報URL＋開始日が同じものは warning（同じ公式サイトに別の催しが載ることがあるため）
 * @returns {{ level: 'error'|'warning', ids: string[], reason: string }[]}
 */
export function findDuplicates(events) {
  const out = [];
  const group = (keyOf, level, reason) => {
    const map = new Map();
    for (const event of events) {
      const key = keyOf(event);
      if (!key) continue;
      map.set(key, [...(map.get(key) ?? []), event.id]);
    }
    for (const ids of map.values()) if (ids.length > 1) out.push({ level, ids, reason });
  };
  group((e) => (e.startDate && normalizeEventName(e.name) ? `${normalizeEventName(e.name)}|${e.startDate}` : null), 'error', '名前（表記ゆれを除く）と開始日が同じ');
  group((e) => (e.startDate && normalizeUrl(e.officialUrl) ? `${normalizeUrl(e.officialUrl)}|${e.startDate}` : null), 'warning', '一次情報URLと開始日が同じ');
  return out;
}

/** 台帳の Discovery Gate 用の検証（editorial:check で CI を止める項目） */
export function validateDiscovery(events, articleUrls = new Set()) {
  const errors = [];
  const warnings = [];
  for (const event of events) {
    if (event.importance != null && !VALID_IMPORTANCE.has(event.importance)) {
      errors.push(`不正なimportance: ${event.id} = ${event.importance}（normal / large / urgent）`);
    }
    for (const key of ['discoveredAt', 'verifiedAt', 'articleUpdatedAt']) {
      if (event[key] != null && !isDate(event[key])) errors.push(`${key}はYYYY-MM-DD: ${event.id}`);
    }
    if (event.status === 'rejected' && !String(event.skipReason ?? '').trim()) {
      errors.push(`見送り（rejected）には skipReason が必要: ${event.id}`);
    }
    if (event.relatedArticleUrls != null) {
      if (!Array.isArray(event.relatedArticleUrls)) errors.push(`relatedArticleUrlsは配列: ${event.id}`);
      else for (const url of event.relatedArticleUrls) {
        if (!articleUrls.has(url)) errors.push(`relatedArticleUrlsの記事がありません: ${event.id} -> ${url}`);
      }
    }
  }
  for (const dup of findDuplicates(events)) {
    const message = `イベントの重複の疑い（${dup.reason}）: ${dup.ids.join(' / ')}。1件にまとめ、別記事は relatedArticleUrls へ`;
    (dup.level === 'error' ? errors : warnings).push(message);
  }
  return { errors, warnings };
}

/** 開催前の確認期限。開催30日以内で、直近の節目より前の確認しかないものを返す */
export function recheckDue(event, today) {
  if (!isDate(event.startDate) || CLOSED_STATUS.has(event.status)) return null;
  const days = daysUntil(today, event.startDate);
  if (days < 0 || days > 30) return null;
  const milestone = MILESTONES.find((m) => days <= m.days);
  const dueSince = iso(addDateOnlyDays(parseDateOnly(event.startDate), -milestone.days));
  const checkedAt = [event.verifiedAt, event.articleUpdatedAt].filter(isDate).sort().at(-1) ?? null;
  if (checkedAt && checkedAt >= dueSince) return null;
  return { id: event.id, name: event.name, startDate: event.startDate, daysToStart: days, milestone: milestone.label, focus: milestone.focus, dueSince, checkedAt, articleUrl: event.articleUrl ?? event.relatedArticleUrls?.[0] ?? null };
}

function regionOf(municipality, regions) {
  if (!municipality) return '地域未設定';
  if (municipality === 'prefecturewide') return '県全域';
  return REGION_LABEL[regions.get(municipality)] ?? '県外・その他';
}

/** src/data/areas.ts の MUNICIPALITIES から slug→地域 を読む（TypeScript を実行しない） */
export function parseRegions(areasSource) {
  return new Map([...areasSource.matchAll(/slug:\s*'([^']+)'[^}]*?region:\s*'([^']+)'/g)].map((m) => [m[1], m[2]]));
}

/**
 * 日次の Discovery Gate。台帳だけから、毎朝の報告に載せる数と一覧を作る
 * @param {{ events: object[] }} registry
 * @param {{ today: string, regions?: Map<string,string>, weekly?: boolean }} options
 */
export function discoveryGate(registry, { today, regions = new Map(), weekly = false }) {
  const events = registry.events ?? [];
  const open = events.filter((e) => !CLOSED_STATUS.has(e.status));
  const withDays = open.map((e) => ({ ...e, daysToStart: isDate(e.startDate) ? daysUntil(today, e.startDate) : null }));
  const upcoming = (max) => withDays.filter((e) => e.daysToStart != null && e.daysToStart >= 0 && e.daysToStart <= max);
  // 単独記事（articleUrl）か、まとめ記事などでの掲載（relatedArticleUrls）があれば掲載済み
  const unlisted = (e) => !e.articleUrl && !(e.relatedArticleUrls?.length);
  const brief = (e) => ({ id: e.id, name: e.name, startDate: e.startDate ?? null, daysToStart: e.daysToStart, municipality: e.municipality ?? null, region: regionOf(e.municipality, regions), status: e.status, importance: e.importance ?? 'normal', officialUrl: e.officialUrl ?? null, articleUrl: e.articleUrl ?? e.relatedArticleUrls?.[0] ?? null });

  const newlyDiscovered = events.filter((e) => isDate(e.discoveredAt) && daysUntil(e.discoveredAt, today) <= 1).map((e) => brief({ ...e, daysToStart: isDate(e.startDate) ? daysUntil(today, e.startDate) : null }));
  const importantUnlisted = withDays.filter((e) => unlisted(e) && ['large', 'urgent'].includes(e.importance) && (e.daysToStart == null || e.daysToStart >= 0)).map(brief);
  const urgent7 = upcoming(7).filter(unlisted).map(brief);
  const decisionPending = upcoming(30).filter(unlisted).map(brief);
  const unverified = withDays.filter((e) => (e.status === 'discovered' || !e.officialUrl || !isDate(e.verifiedAt)) && (e.daysToStart == null || e.daysToStart >= 0)).map(brief);
  const due = open.map((e) => recheckDue(e, today)).filter(Boolean).sort((a, b) => a.daysToStart - b.daysToStart);
  const skipped = events.filter((e) => e.status === 'rejected').map((e) => ({ id: e.id, name: e.name, startDate: e.startDate ?? null, skipReason: e.skipReason ?? null }));
  const scan = upcoming(90).filter((e) => e.daysToStart > 30).map(brief);

  const isWeeklyDay = dateOnlyWeekday(parseDateOnly(today)) === 1; // 月曜
  let weeklyInventory = null;
  if (weekly || isWeeklyDay) {
    const rows = upcoming(90).map(brief);
    const byRegion = {};
    for (const row of rows) {
      const bucket = (byRegion[row.region] ??= { total: 0, unlisted: [] });
      bucket.total += 1;
      if (!row.articleUrl) bucket.unlisted.push(row);
    }
    const byWeek = {};
    for (const row of rows) {
      const week = `${Math.floor(row.daysToStart / 7) * 7}〜${Math.floor(row.daysToStart / 7) * 7 + 6}日後`;
      const bucket = (byWeek[week] ??= { total: 0, unlisted: 0 });
      bucket.total += 1;
      if (!row.articleUrl) bucket.unlisted += 1;
    }
    weeklyInventory = { from: today, to: iso(addDateOnlyDays(parseDateOnly(today), 90)), byRegion, byWeek };
  }

  return {
    today,
    counts: {
      newlyDiscovered: newlyDiscovered.length,
      importantUnlisted: importantUnlisted.length,
      urgent7: urgent7.length,
      decisionPending: decisionPending.length,
      unverified: unverified.length,
      recheckDue: due.length,
      skipped: skipped.length,
      scan30to90: scan.length,
    },
    newlyDiscovered, importantUnlisted, urgent7, decisionPending, unverified, recheckDue: due, skipped, scan30to90: scan,
    duplicates: findDuplicates(events),
    weeklyInventory,
  };
}

/** 毎朝の報告（daily-brief.md）に入れる Markdown */
export function discoveryMarkdown(gate) {
  const line = (e) => `- ${e.name}｜${e.startDate ?? '日程未確認'}${e.daysToStart != null ? `（${e.daysToStart}日後）` : ''}｜${e.region}｜${e.status}・${e.importance}｜${e.articleUrl ?? e.officialUrl ?? '一次情報未登録'}`;
  const list = (rows, empty) => (rows.length ? rows.map(line) : [`- ${empty}`]);
  const out = [
    '## Discovery Gate（イベント取りこぼし防止）',
    '',
    '台帳から機械的に出した数。0件は「漏れがない」ことを意味しない。発見元の巡回（県・44市町村・観光協会・民間主催者・会場・プレスリリース・公式SNS）は毎朝の編集作業で行い、見つけたものを台帳に登録する。',
    '',
    `- 新規発見（前日〜本日に登録）: ${gate.counts.newlyDiscovered}件`,
    `- 重要未掲載（large / urgent）: ${gate.counts.importantUnlisted}件`,
    `- 開催7日以内の未掲載（緊急）: ${gate.counts.urgent7}件`,
    `- 開催30日以内の未掲載（記事化・追記・見送りの判断待ち）: ${gate.counts.decisionPending}件`,
    `- 未検証（discovered・一次情報URLや確認日の欠落）: ${gate.counts.unverified}件`,
    `- 開催前の確認期限が来ているもの: ${gate.counts.recheckDue}件`,
    `- 30〜90日先の候補: ${gate.counts.scan30to90}件`,
    `- 見送りの記録: ${gate.counts.skipped}件`,
    `- 重複の疑い: ${gate.duplicates.length}組`,
    '',
    '### 開催7日以内の未掲載（本日中に記事化・追記・見送りを決める）',
    '',
    ...list(gate.urgent7, 'なし'),
    '',
    '### 確認期限（30日前＝記事化の判断／14日前＝公式再確認／7日前＝交通・駐車場・料金／前日＝開催可否・雨天・変更）',
    '',
    ...(gate.recheckDue.length
      ? gate.recheckDue.map((d) => `- [${d.milestone}] ${d.name}｜${d.startDate}（${d.daysToStart}日後）｜確かめること: ${d.focus}｜最終確認 ${d.checkedAt ?? 'なし'}｜${d.articleUrl ?? '未掲載'}`)
      : ['- なし']),
    '',
    '### 重要未掲載・判断待ち',
    '',
    ...list([...new Map([...gate.importantUnlisted, ...gate.decisionPending].map((e) => [e.id, e])).values()], 'なし'),
    '',
    '### 未検証',
    '',
    ...list(gate.unverified, 'なし'),
    '',
    ...(gate.duplicates.length ? ['### 重複の疑い', '', ...gate.duplicates.map((d) => `- [${d.level}] ${d.ids.join(' / ')}（${d.reason}）`), ''] : []),
  ];
  if (gate.weeklyInventory) {
    const w = gate.weeklyInventory;
    out.push(
      `### 週次棚卸し（${w.from}〜${w.to}）`,
      '',
      '地域別（台帳の件数／未掲載）:',
      ...Object.entries(w.byRegion).map(([region, b]) => `- ${region}: ${b.total}件／未掲載${b.unlisted.length}件${b.unlisted.length ? `（${b.unlisted.map((e) => `${e.name} ${e.startDate}`).join('、')}）` : ''}`),
      '',
      '週別（台帳の件数／未掲載）:',
      ...Object.entries(w.byWeek).map(([week, b]) => `- ${week}: ${b.total}件／未掲載${b.unlisted}件`),
      '',
      '台帳に件数が少ない地域・週は、発見元の巡回が足りていない可能性がある。県全域・民間会場・主催者を横断して確認する。',
      '',
    );
  }
  return out.join('\n');
}
