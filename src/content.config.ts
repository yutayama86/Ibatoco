import { articles, places, stores } from './collections/core';
import { news } from './collections/news';
import { events } from './collections/events';

export { CATEGORIES, type CategoryKey } from './collections/foundations';

/**
 * Astro Content Collections の登録点。
 * スキーマ本体は責務別に src/collections へ分離し、このファイルは一覧だけを持つ。
 */
export const collections = { articles, places, stores, news, events };
