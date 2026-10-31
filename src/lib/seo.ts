import type { Crumb } from '../components/Breadcrumbs.astro';

/*
 * 構造化データ（JSON-LD）のうち、複数のページ系統で同じ形をとるもの。
 * パンくずと FAQ は、ページで組み立てずにここを通す（形を変えるときはここだけ直す）。
 * 記事固有の Article・Event などは各テンプレートが持つ。
 */

/**
 * BreadcrumbList 構造化データを、可視パンくずと同じ配列から生成する。
 * 表示と構造化データがずれないよう、必ず同じ items を両方へ渡すこと。
 * item（URL）は href があるものだけに付ける（現在地は position だけで良い）。
 * 現在地に href を付けても、Breadcrumbs 部品は最後の項目をリンクにしない。
 */
export function breadcrumbJsonLd(items: Crumb[], site: URL | undefined): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      ...(crumb.href ? { item: new URL(crumb.href, site).href } : {}),
    })),
  };
}

export interface FaqEntry { question: string; answer: string }

/**
 * FAQPage 構造化データ。画面に出している質問と回答をそのまま渡す（構造化データのためだけに足さない）。
 * extra は inLanguage など、ページ系統ごとに足す項目。
 */
export function faqPageJsonLd(items: FaqEntry[], extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    ...extra,
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
}
