import { parseDateOnly } from '../../src/lib/date-only.js';

// These states all refer to articles that remain public, including ended events.
const PUBLIC_STATES = new Set(['published', 'update-needed', 'ended']);

function sameDate(left, right) {
  try { return parseDateOnly(left).valueOf() === parseDateOnly(right).valueOf(); }
  catch { return false; }
}

/** Compare publication metadata only; preserve curated names, sources and candidates. */
export function editorialPublicationErrors(events, inventory) {
  const articles = new Map(inventory.filter((item) => item.type === 'event' && item.articleType === 'event')
    .map((item) => [item.url, item]));
  const errors = [];
  for (const event of events) {
    const article = articles.get(event.articleUrl);
    if (!article) continue;
    const publicArticle = !article.draft && article.reviewed === true;
    if (publicArticle !== PUBLIC_STATES.has(event.status)) {
      errors.push(`本文と台帳の公開状態が不一致: ${event.articleUrl}（本文${publicArticle ? '公開' : '未公開'} / 台帳${event.status}）。npm run editorial:sync の差分を確認してください。`);
    }
    const updated = article.updatedDate ?? article.pubDate;
    if (publicArticle && updated && !sameDate(event.articleUpdatedAt, updated)) {
      errors.push(`本文と台帳の記事更新日が不一致: ${event.articleUrl}（本文${updated} / 台帳${event.articleUpdatedAt ?? '未設定'}）。articleUpdatedAtを同期してください。`);
    }
  }
  return errors;
}
