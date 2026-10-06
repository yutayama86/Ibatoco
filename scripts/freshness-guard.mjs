/**
 * Freshness / Expiry Guard と年度誤認チェック。古い情報や前年の情報が「今の情報」として残るのを見つける。
 *
 * 何も自動で削除・書き換えはしない。見つけたものを報告し、Growth Engine（Alerts）と CI のログに出す。
 * 終了後も検索価値があるページは、削除ではなく「終了しました」「次回情報待ち」「翌年版はこちら」へ移す（src/lib/lifecycle.ts）。
 *
 * 見るもの
 *   expired-cta        … expiresAt（PR #198 の期限付き導線）の期限を過ぎたまま残っている
 *   stale-deadline     … 「10月7日まで受付」など、期限を過ぎた受付・販売・予約の文言（終了・実績の文脈を除く）
 *   ended-live-wording … 開催が終わったページに「受付中」「販売中」「本日開催」「残り○日」などが残っている
 *   year-slug          … URL の年と開催年が違う（例：-2026 のページに 2025 年の開催日）← エラー
 *   year-title         … タイトルの年に開催年が無い
 *   year-source-url    … 出典URLの年が開催年より古い（前年のページを今年の根拠にしている可能性）
 *   year-source-access … 出典の確認日が開催日の1年以上前
 *
 * 実行：node scripts/freshness-guard.mjs [--strict] [--json]
 *   既定は報告だけ（終了コード0）。--strict はエラー（year-slug）があれば失敗にする（npm run verify で使う）
 */
import { pathToFileURL } from 'node:url';
import { loadContentPages } from './lib/content-pages.mjs';
import { addDays, daysBetween, todayJst } from '../src/lib/growth-engine.mjs';

const LIVE_WORDS = /(受付中|販売中|発売中|予約受付中|申込受付中|申し込み受付中|本日開催|開催中|残り\d+日)/;
const PAST_CONTEXT = /(終了|締め切りました|締切りました|受付を終え|販売を終え|終わり|実績|昨年|前回|過去|参考|でした|流用しません|前年)/;
const DEADLINE_CONTEXT = /(受付|販売|申込|申し込|予約|募集|購入|応募|抽選)/;

/** frontmatter のすべての文字列を、どの項目かと一緒に取り出す */
function texts(value, path = '', out = []) {
  if (typeof value === 'string') out.push({ path, text: value });
  else if (Array.isArray(value)) value.forEach((v, i) => texts(v, `${path}[${i}]`, out));
  else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) texts(v, path ? `${path}.${k}` : k, out);
  return out;
}

function findKey(value, key, path = '', out = []) {
  if (Array.isArray(value)) value.forEach((v, i) => findKey(v, key, `${path}[${i}]`, out));
  else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      if (k === key) out.push({ path: path ? `${path}.${k}` : k, value: v, parent: value });
      else findKey(v, key, path ? `${path}.${k}` : k, out);
    }
  }
  return out;
}

const sentences = (text) => String(text).split(/(?<=[。！？\n])/).map((s) => s.trim()).filter(Boolean);
const dateOf = (value) => (value instanceof Date ? value.toISOString().slice(0, 10) : typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : null);

/** @returns {{ severity: 'error' | 'warning', type: string, path: string, detail: string }[]} */
export function auditFreshness({ pages, today = todayJst() }) {
  const findings = [];
  const add = (severity, type, path, detail) => findings.push({ severity, type, path, detail });

  for (const page of pages.values()) {
    if (page.noindex) continue;
    const fm = page.frontmatter;
    const eventYear = page.startDate ? Number(page.startDate.slice(0, 4)) : null;
    const end = page.endDate ?? page.startDate;
    const ended = end ? daysBetween(end, today) > 0 : false;
    const all = texts(fm).filter((t) => !t.path.startsWith('sourceUrls'));

    // expiresAt の期限切れ（実行時は「受付終了」に切り替わるが、本文の整理が必要）
    for (const hit of findKey(fm, 'expiresAt')) {
      const date = dateOf(hit.value);
      if (date && daysBetween(date, today) > 0) {
        const name = hit.parent.label ?? hit.parent.name ?? hit.parent.title ?? hit.path;
        add('warning', 'expired-cta', page.path, `「${String(name).slice(0, 30)}」の期限 ${date} を過ぎた導線が残っている（終了表示・翌年版への整理）`);
      }
    }

    // 期限を過ぎた「〜まで受付・販売」
    for (const { path, text } of all) {
      for (const sentence of sentences(text)) {
        if (!DEADLINE_CONTEXT.test(sentence) || PAST_CONTEXT.test(sentence)) continue;
        for (const m of sentence.matchAll(/(?:(20\d{2})年)?(\d{1,2})月(\d{1,2})日(?:\s*[（(][^）)]{1,3}[）)])?(?:\s*\d{1,2}[:：]\d{2})?\s*(?:まで|〆切|締切)/g)) {
          const month = Number(m[2]);
          const day = Number(m[3]);
          if (month < 1 || month > 12 || day < 1 || day > 31) continue;
          let year = m[1] ? Number(m[1]) : eventYear ?? (page.pubDate ? Number(page.pubDate.slice(0, 4)) : null);
          if (!year) continue;
          // 年が書かれていないとき、開催月より大きく前の月は翌年の日付とみなす（例：12月の行事の1月の期限）
          if (!m[1] && page.startDate && month < Number(page.startDate.slice(5, 7)) - 6) year += 1;
          const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          let valid = true;
          try { daysBetween(date, today); } catch { valid = false; }
          if (valid && daysBetween(date, today) > 0) {
            add('warning', 'stale-deadline', page.path, `${path}：「${sentence.slice(0, 50)}」の期限 ${date} を過ぎている`);
          }
        }
      }
    }

    // 開催が終わったのに、今も受付・開催中のような表現
    if (ended) {
      for (const { path, text } of all) {
        for (const sentence of sentences(text)) {
          if (LIVE_WORDS.test(sentence) && !PAST_CONTEXT.test(sentence)) {
            add('warning', 'ended-live-wording', page.path, `${path}：開催終了（${end}）後も「${sentence.slice(0, 40)}」`);
          }
        }
      }
    }

    // 年度の整合（開催日を持つページだけ）
    if (eventYear) {
      if (page.year && page.year !== eventYear) {
        add('error', 'year-slug', page.path, `URLの年 ${page.year} と開催年 ${eventYear}（${page.startDate}）が違う`);
      }
      const titleYears = [...String(page.title).matchAll(/(20\d{2})/g)].map((m) => Number(m[1]));
      if (titleYears.length && !titleYears.includes(eventYear) && !(page.endDate && titleYears.includes(Number(page.endDate.slice(0, 4))))) {
        add('warning', 'year-title', page.path, `タイトルの年（${titleYears.join('・')}）に開催年 ${eventYear} が無い`);
      }
      for (const source of page.sourceUrls) {
        const urlYears = [...String(source.url ?? '').matchAll(/(?<![\d])(20\d{2})(?![\d])/g)].map((m) => Number(m[1]));
        if (urlYears.length && Math.max(...urlYears) < eventYear) {
          add('warning', 'year-source-url', page.path, `出典URLの年（${Math.max(...urlYears)}）が開催年 ${eventYear} より古い：${source.url}`);
        }
        if (source.accessedAt && page.startDate && daysBetween(source.accessedAt, addDays(page.startDate, -365)) > 0) {
          add('warning', 'year-source-access', page.path, `出典の確認日 ${source.accessedAt} が開催日 ${page.startDate} の1年以上前：${source.label ?? source.url}`);
        }
      }
    }
  }
  return findings;
}

// ---- CLI ----
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const strict = process.argv.includes('--strict');
  const asJson = process.argv.includes('--json');
  const findings = auditFreshness({ pages: loadContentPages() });
  if (asJson) {
    console.log(JSON.stringify(findings, null, 2));
  } else {
    const errors = findings.filter((f) => f.severity === 'error');
    const warnings = findings.filter((f) => f.severity === 'warning');
    const byType = {};
    for (const f of findings) byType[f.type] = (byType[f.type] ?? 0) + 1;
    for (const f of errors) console.error(`  [error] ${f.type}: ${f.path} ${f.detail}`);
    for (const f of warnings.slice(0, 40)) console.log(`  [warn] ${f.type}: ${f.path} ${f.detail}`);
    if (warnings.length > 40) console.log(`  … ほか ${warnings.length - 40} 件`);
    console.log(`鮮度・年度チェック：エラー ${errors.length} 件 ／ 警告 ${warnings.length} 件${Object.keys(byType).length ? `（${Object.entries(byType).map(([k, v]) => `${k} ${v}`).join('、')}）` : ''}`);
    if (strict && errors.length) process.exit(1);
  }
}
