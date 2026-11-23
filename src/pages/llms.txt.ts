import type { APIRoute } from 'astro';
import { SITE_CONFIG, CATEGORY_LIST, CATEGORY_PAGE_META } from '../data/site';
import { getArticles, getIndexableNews, getStores } from '../lib/content';
import { VISIBLE_GUIDES as GUIDES } from '../data/guides';
import { VISIBLE_REPORTERS as REPORTERS } from '../data/reporters';
import { MUNICIPALITIES } from '../data/areas';

/**
 * /llms.txt — AI検索(GEO)向けのサイト要約（llmstxt.org 準拠）。
 * ChatGPT/Claude/Perplexity 等が「イバトコとは何か・どこに何があるか」を
 * 少ないトークンで把握できるよう、主要エンティティとURLを構造的に列挙する。
 * コンテンツが増えれば自動で反映される。
 */
export const GET: APIRoute = async () => {
  const base = SITE_CONFIG.domain.replace(/\/$/, '');
  const abs = (p: string) => `${base}${p}`;
  const [articles, stores, news] = await Promise.all([getArticles(), getStores(), getIndexableNews()]);

  const L: string[] = [];
  L.push(`# ${SITE_CONFIG.name} (${SITE_CONFIG.nameEn})`);
  L.push('');

  L.push('## 茨城ニュース解説');
  L.push(`- [茨城ニュース解説](${abs('/news/')}): 自治体、観光、地域経済、交通、スポーツ、DXなどの重要ニュースを地域への影響とともに解説`);
  for (const item of news.slice(0, 30)) {
    L.push(`- [${item.data.title}](${abs(`/news/${item.id.split('/').pop()}/`)}): ${item.data.description}`);
  }
  L.push('');
  L.push(`> ${SITE_CONFIG.description}`);
  L.push('');
  L.push(
    `${SITE_CONFIG.name}は茨城県44市町村の人・場所・営みを、` +
      `編集部とローカルエディターが現地で取材・確認し、長く参照できる形に編集する地域価値編集ブランドです。` +
      `タグライン：${SITE_CONFIG.tagline}　サイト：${base}`
  );
  L.push('');

  // カテゴリ
  L.push('## カテゴリ（ジャンル別一覧）');
  for (const c of CATEGORY_LIST) {
    L.push(`- [${c.label}](${abs(`/${c.path}/`)}): 茨城の${c.label}をエリア・お店とあわせて紹介`);
  }
  L.push('');

  // エリア（44市町村。未確認の観光コピーは載せない）
  L.push('## エリア（市町村ページ）');
  for (const m of MUNICIPALITIES) {
    L.push(`- [${m.name}](${abs(`/area/${m.slug}/`)}): 取材・確認済みの情報から順次掲載`);
  }
  L.push('');

  // 地名×ジャンル（主砲）— 例示（全量はsitemap参照）
  L.push('## 地名×ジャンルのまとめ（例）');
  L.push(`これらは「/area/<市町村>/<ジャンル>/」の形で多数存在します（例：水戸市のグルメ = ${abs('/area/mito/eat/')}）。`);
  for (const c of CATEGORY_LIST.slice(0, 3)) {
    L.push(`- [水戸市の${c.label}](${abs(`/area/mito/${c.path}/`)}): ${CATEGORY_PAGE_META[c.key].lead('水戸市')}`);
  }
  L.push('');

  // まとめ・モデルコース
  if (GUIDES.length) {
    L.push('## まとめ・モデルコース（目的別）');
    for (const g of GUIDES) L.push(`- [${g.title}](${abs(`/guide/${g.slug}/`)}): ${g.lead}`);
    L.push('');
  }

  // 体験レポート記事
  if (articles.length) {
    L.push('## 体験レポート記事');
    for (const a of articles) {
      const path = `/${a.data.category}/${a.id.split('/').pop()}/`;
      L.push(`- [${a.data.title}](${abs(path)}): ${a.data.description}`);
    }
    L.push('');
  }

  // 掲載店舗（多くなったら上限）
  if (stores.length) {
    L.push('## 掲載店舗（お店・スポット）');
    for (const s of stores.slice(0, 100)) {
      L.push(`- [${s.data.name}](${abs(`/place/${s.id}/`)}): ${s.data.area}｜${s.data.tagline}`);
    }
    L.push('');
  }

  // ローカルエディター（E-E-A-T）
  if (REPORTERS.length) {
    L.push('## ローカルエディター（著者・一次情報の書き手）');
    for (const r of REPORTERS) {
      L.push(`- [${r.name}](${abs(`/reporter/${r.slug}/`)}): ${r.role}${r.area ? `・担当${r.area}` : ''}`);
    }
    L.push('');
  }

  // 事業者向け
  L.push('## 事業者・関係者の方へ');
  L.push(`- [法人・自治体の方へ](${abs('/biz/')}): 検索・AI検索に強い情報発信のコンサル・Web制作・SNS運用（全国対応）`);
  L.push(`- [ローカルエディター](${abs('/reporters/')}): 著者と編集体制`);
  L.push(`- [お問い合わせ](${abs('/contact/')}): 取材・掲載・協業のご相談`);
  L.push('');

  L.push('## 補足');
  L.push(`- 対象地域：茨城県（全44市町村）。県北/県央/県南/鹿行/県西の5エリア区分。`);
  L.push(`- 全ページ一覧：${abs('/sitemap-index.xml')}`);
  L.push(`- 運営：${SITE_CONFIG.name}編集部（${SITE_CONFIG.contactEmail}）`);

  return new Response(L.join('\n') + '\n', {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
