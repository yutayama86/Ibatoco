/**
 * Instagram 用の縦長カード（1080×1350）を、SNS投稿の下書きの候補記事についてビルド時に PNG で作る。
 * URL 例：/og-ig/events/tokai-imo-fes-2026.png
 * 候補の選び方は Control Center の「SNS投稿の下書き」と同じ（src/lib/social-posts.mjs）。描画は src/lib/instagram-card.mjs。
 * 毎日のビルドで候補が入れ替わるため、使う画像はその日のうちに保存する。
 */
import type { APIRoute } from 'astro';
import { loadContentPages } from '../../../scripts/lib/content-pages.mjs';
import { todayDateOnlyString } from '../../lib/date-only.js';
import { igCardPath, selectPostCandidates, timingLine } from '../../lib/social-posts.mjs';
import { renderInstagramCard } from '../../lib/instagram-card.mjs';

export function getStaticPaths() {
  const today = todayDateOnlyString();
  const candidates = selectPostCandidates(loadContentPages().values(), { today, limit: 40, freshSlots: 10 });
  return candidates.map(({ page }) => ({
    params: { route: igCardPath(page).replace(/^\/og-ig\//, '') },
    props: {
      title: page.title,
      badge: timingLine(page, today),
      label: page.type === 'news' ? '茨城ニュース解説' : '茨城のイベント・おでかけ',
      accent: page.type === 'news' ? '#315c68' : '#a63f32',
    },
  }));
}

export const GET: APIRoute = async ({ props }) => {
  const png = await renderInstagramCard(props as { title: string; badge: string | null; label: string; accent: string });
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
