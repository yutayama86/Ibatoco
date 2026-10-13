/**
 * 地域事業者向けの収益（協賛・掲載）を売るための実測。新しい計測は足さず、既存の GA4 集計と記事データだけで出す。
 *
 * 1. 送客実績：BookingGuide 等から、どの事業者・団体のサイトへ何回送ったか（GA4 page_path × link_url の期間つき）。
 *    公式（事業者・団体の一次情報）と提携（ASP）を分ける。期間の外へ按分・外挿しない
 * 2. 協賛枠の在庫：協賛枠（SponsorSlots）を出せるページを、実測で並べる。GA4 のページ別 Views が計測障害で使えない期間は
 *    （measurement-incidents が null にする）、障害の影響を受けない GSC のクリック（28日）で並べる。どちらも実数で、予測ではない
 *
 * 料金・営業・契約はここで扱わない（オーナー承認）。協賛の有無で記事の評価・並び順を変えない（docs/SPONSORSHIP.md）。
 */
const num = (value) => (value == null || value === '' || !Number.isFinite(Number(value)) ? null : Number(value));

const hostOf = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
};

/** 提携リンク（ASP のリダイレクト）は送り先の事業者ではなく ASP のホストになるので、提供元の名前でまとめる */
const PAID_HOSTS = /(^|\.)(a8\.net|afl\.rakuten\.co\.jp|valuecommerce\.(com|ne\.jp)|ck\.jp\.ap\.valuecommerce\.com)$/;

/** ページの予約案内（booking.items）から、リンク先URLの表示名を引く。名前を推測しない */
function labelsFromPages(pages) {
  const labels = new Map();
  for (const page of pages.values()) {
    for (const item of page.frontmatter?.booking?.items ?? []) {
      if (item?.url && item?.label && !labels.has(item.url)) labels.set(item.url, String(item.label));
    }
  }
  return labels;
}

/**
 * @param {{ snapshot: any, pages?: Map<string, any> }} input
 */
export function businessReferrals({ snapshot, pages = new Map() }) {
  const cd = snapshot?.conversionDetail ?? {};
  const period = cd.byProviderPagePeriod?.start && cd.byProviderPagePeriod?.end ? `${cd.byProviderPagePeriod.start}..${cd.byProviderPagePeriod.end}` : null;
  const rows = cd.byProviderPage ?? [];
  if (!rows.length) return { period, source: cd.byProviderPageSource ?? null, destinations: [], totals: null };
  const labels = labelsFromPages(pages);
  const byDest = new Map();
  for (const r of rows) {
    const clicks = num(r.event_count);
    if (clicks == null) continue;
    const host = hostOf(r.link_url);
    const paid = r.classification === 'paid' || (host && PAID_HOSTS.test(host));
    const kind = paid ? 'paid' : r.classification === 'official' ? 'official' : 'other';
    // 同じサイトでも、公式の案内と未提携のチケット等は分けて数える
    const key = paid ? `paid:${r.link_provider ?? host}` : `${kind}:${host ?? r.link_url}`;
    const dest = byDest.get(key) ?? {
      key,
      kind,
      destination: paid ? String(r.link_provider ?? host) : host ?? String(r.link_url ?? ''),
      label: paid ? null : labels.get(r.link_url) ?? null,
      clicks: 0,
      pages: new Map(),
    };
    dest.clicks += clicks;
    dest.pages.set(r.path, (dest.pages.get(r.path) ?? 0) + clicks);
    byDest.set(key, dest);
  }
  const destinations = [...byDest.values()]
    .map((d) => ({ ...d, pages: [...d.pages.entries()].map(([path, clicks]) => ({ path, clicks })).sort((a, b) => b.clicks - a.clicks) }))
    .sort((a, b) => b.clicks - a.clicks);
  const sum = (kind) => destinations.filter((d) => d.kind === kind).reduce((s, d) => s + d.clicks, 0);
  return {
    period,
    source: cd.byProviderPageSource ?? null,
    destinations: destinations.slice(0, 15),
    totals: { official: sum('official'), paid: sum('paid'), other: sum('other'), destinations: destinations.length },
  };
}

const DAY = 86_400_000;
const SENSITIVE = /防災|災害|冠水|浸水|避難|警報|事故|事件|訃報|感染|漏えい|漏洩|被害/;
const daysUntil = (today, date) => (date ? Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY) : null);

/**
 * 協賛枠を出せるページ（events・news の公開ページ）を、直近28日の閲覧数で並べる。
 * 終わったイベント・noindex・サンプル・PR記事は対象外。掲載中の協賛枠（sponsorSlots）が分かれば空き枠を出す。
 * @param {{ snapshot: any, pages: Map<string, any>, sponsorSlots?: any[] | null, maxSlots?: number, today: string, limit?: number }} input
 */
export function sponsorInventory({ snapshot, pages, sponsorSlots = null, maxSlots = 3, today, limit = 10 }) {
  const metrics = new Map((snapshot?.pageMetrics ?? []).map((r) => [r.path, r]));
  // 掲載中・掲載予定（終了日が今日以降）の枠を数える
  const used = (path) => (Array.isArray(sponsorSlots) ? sponsorSlots.filter((s) => s.pages?.includes(path) && s.end >= today).length : null);
  const candidates = [];
  for (const page of pages.values()) {
    if (!['event', 'news'].includes(page.type)) continue; // 協賛枠（SponsorSlots）を出せるのは /events/・/news/ だけ
    const fm = page.frontmatter ?? {};
    if (page.noindex || fm.sample === true || fm.disclosure === 'pr') continue;
    // 防災・事故など、読者の安全に関わる情報の横には広告を置かない（信頼を優先）
    if (SENSITIVE.test([page.title, ...(page.tags ?? [])].join(' '))) continue;
    const last = page.endDate ?? page.startDate;
    if (last && last < today) continue; // 終わったイベントには売らない
    const m = metrics.get(page.path);
    const views28 = num(m?.views28);
    const gscClicks28 = num(m?.gsc?.clicks28);
    // 並べる値：GA4 の Views（28日）。計測障害で null のときは GSC のクリック（28日）。どちらも無いページは数えない（推定で埋めない）
    const demand = views28 ?? gscClicks28;
    if (!demand) continue;
    const usedSlots = used(page.path);
    candidates.push({
      path: page.path,
      title: page.title,
      municipalities: page.municipalities ?? [],
      views28,
      views7: num(m?.views7),
      gscClicks28,
      demand,
      demandBasis: views28 != null ? 'GA4 Views（28日）' : 'GSC クリック（28日）',
      gscImpressions28: num(m?.gsc?.impressions28),
      startDate: page.startDate ?? null,
      daysUntilStart: daysUntil(today, page.startDate),
      usedSlots,
      freeSlots: usedSlots == null ? null : Math.max(0, maxSlots - usedSlots),
    });
  }
  // GA4 と GSC は単位が違うので、GA4 があるページを先に（同じ単位どうしで）並べる
  candidates.sort((a, b) => (a.views28 == null) - (b.views28 == null) || b.demand - a.demand);
  // 地域ごとの合計（エリア協賛・観光協会向けの材料）。複数の市町村にまたがるページは各市町村に数える
  const areas = new Map();
  for (const c of candidates) {
    for (const muni of c.municipalities.length ? c.municipalities : ['(県全体)']) {
      const a = areas.get(muni) ?? { municipality: muni, pages: 0, demand: 0, top: null };
      a.pages += 1;
      a.demand += c.demand;
      if (!a.top || c.demand > a.top.demand) a.top = { path: c.path, title: c.title, demand: c.demand };
      areas.set(muni, a);
    }
  }
  const ga4Rows = candidates.filter((c) => c.views28 != null).length;
  const metricsBasis = !candidates.length ? null
    : ga4Rows === candidates.length ? '直近28日の GA4 Views（実測）'
    : ga4Rows === 0 ? '直近28日の GSC クリック（実測。GA4 のページ別は計測障害の期間を含むため使わない）'
    : '直近28日の GA4 Views、無いページは GSC クリック（実測）';
  return {
    basis: metricsBasis,
    pages: candidates.slice(0, limit),
    areas: [...areas.values()].sort((a, b) => b.demand - a.demand).slice(0, 8),
    sponsorSlotsKnown: Array.isArray(sponsorSlots),
    activeSponsors: Array.isArray(sponsorSlots) ? sponsorSlots.filter((s) => s.start <= today && today <= s.end).length : null,
  };
}
