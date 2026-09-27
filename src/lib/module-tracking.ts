/**
 * 画面の「かたまり」（TOPの各セクション、検索結果、診断の結果など）の計測。
 *
 * - module_view  : かたまりが画面に入った（1ページ1回）… どこまで読まれたかの分母
 * - module_click : かたまりの中のリンクを押した
 * どちらも cta_location（かたまりの名前）と cta_page_type（置いたページ）を付ける。
 * どちらも GA4 に登録済みのカスタムディメンションなので、新しい登録なしで集計できる。
 */
import { trackEvent } from './analytics-events';

export function bindModuleTracking(pageType: string, root: ParentNode = document): void {
  const blocks = [...root.querySelectorAll<HTMLElement>('[data-module]')];
  const seen = new Set<string>();
  const send = (block: HTMLElement) => {
    const name = block.dataset.module ?? '';
    if (!name || seen.has(name)) return;
    seen.add(name);
    trackEvent('module_view', { cta_location: name, cta_page_type: pageType });
  };
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          send(entry.target as HTMLElement);
          observer.unobserve(entry.target);
        }
      }
    }, { threshold: 0.3 });
    blocks.forEach((block) => observer.observe(block));
  }
  root.addEventListener('click', (event) => {
    const link = (event.target as HTMLElement | null)?.closest?.('a');
    const block = link?.closest<HTMLElement>('[data-module]');
    if (!link || !block) return;
    trackEvent('module_click', {
      cta_location: block.dataset.module ?? '',
      cta_page_type: pageType,
      link_url: link.getAttribute('href') ?? '',
    });
  });
}
