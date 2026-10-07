/**
 * Annual Learning（季節記事の年次実測）。2026年の実測を、2027年の「何月何日までに何を公開・更新するか」に使う。
 *
 * 台帳：data/editorial/seasonal-learning.json（scripts/seasonal-learning.mjs で記事から同期する）
 *   - 構造の項目（記事・開催日・公開日・更新日・カテゴリ）は記事から自動で入れる
 *   - 実測の項目（需要の立ち上がり日・ピーク・減衰・CTA・成果・Revenue）は null で用意し、GA4/GSC の実測で埋める
 *     同期は実測の項目を上書きしない。推測で埋めない
 * 学習：同じカテゴリで実測が2件以上（learningMinSamples）そろったときだけ平均を出す。足りなければ「データ不足」
 * Growth Engine の seasonalRules（data/editorial/growth-engine.json）は自動で書き換えない（置き換えは人が判断する）
 */
import { daysBetween } from './growth-engine.mjs';

const isDate = (value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

export const MEASURED_FIELDS = [
  'demandStartDate', 'impressionsPeakDate', 'viewsPeakDate', 'peakImpressions', 'peakViews', 'ctr', 'position',
  'leadDays', 'decayDays', 'internalLinkEffect', 'ctaClicks', 'conversionsOccurred', 'conversionsConfirmed', 'revenueYen',
  'measuredAt', 'measurementSource',
];

export function learningCategory(page, config) {
  const text = [page.slug, page.keyword, page.title, ...(page.tags ?? [])].filter(Boolean).join(' ');
  for (const key of config.learningCategories.order) {
    if (config.learningCategories[key].match.some((m) => text.includes(m))) return key;
  }
  return null;
}

/** 季節記事（開催日を持つ記事、または lifespan: seasonal）の台帳を記事から同期する。実測の項目は触らない */
export function syncLearningRecords({ records = [], pages, config }) {
  const byPath = new Map(records.map((r) => [r.path, r]));
  const out = [];
  for (const page of pages.values()) {
    if (page.noindex) continue;
    if (!isDate(page.startDate) && page.lifespan !== 'seasonal') continue;
    const prev = byPath.get(page.path) ?? {};
    const record = {
      path: page.path,
      title: page.title,
      category: learningCategory(page, config),
      year: page.startDate ? Number(page.startDate.slice(0, 4)) : page.year ?? null,
      eventStart: page.startDate ?? null,
      eventEnd: page.endDate ?? null,
      publishedAt: page.pubDate ?? null,
      updatedAt: page.updatedDate ?? null,
    };
    for (const field of MEASURED_FIELDS) record[field] = prev[field] ?? null;
    out.push(record);
    byPath.delete(page.path);
  }
  // 記事が無くなった（下書きに戻した・削除した）実測も、学習のために残す
  for (const r of byPath.values()) out.push({ ...r, archived: true });
  return out.sort((a, b) => String(a.eventStart ?? '9999').localeCompare(String(b.eventStart ?? '9999')) || a.path.localeCompare(b.path));
}

/** カテゴリごとの学習結果。実測が2件以上のカテゴリだけ平均を出す */
export function aggregateLearning(records, config) {
  const min = config.learningMinSamples ?? 2;
  const result = [];
  for (const key of config.learningCategories.order) {
    const rows = records.filter((r) => r.category === key);
    if (!rows.length) continue;
    const lead = rows
      .map((r) => r.leadDays ?? (isDate(r.demandStartDate) && isDate(r.eventStart) ? daysBetween(r.demandStartDate, r.eventStart) : null))
      .filter((v) => v != null && Number.isFinite(v));
    const decay = rows.map((r) => r.decayDays).filter((v) => v != null && Number.isFinite(Number(v))).map(Number);
    const measured = rows.filter((r) => r.measuredAt).length;
    const avg = (list) => (list.length >= min ? Number((list.reduce((s, v) => s + v, 0) / list.length).toFixed(1)) : null);
    result.push({
      category: key,
      label: config.learningCategories[key].label,
      records: rows.length,
      measured,
      leadDaysSamples: lead.length,
      leadDaysAvg: avg(lead),
      decayDaysSamples: decay.length,
      decayDaysAvg: avg(decay),
      status: lead.length >= min ? 'learned' : 'データ不足',
    });
  }
  return result;
}
