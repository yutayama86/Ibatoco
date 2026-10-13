/**
 * Revenue Funnel：PV → CTA表示 → CTAクリック → ASPへの送客クリック → 発生成果 → 確定成果 → Revenue。
 *
 * クリックを成果・売上として扱わない。取得できない値は 0 ではなく null。
 * 期間がそろわない2つの値で率を出さない（例：7日のクリックと累計の成果）。
 * 成果0が続くときは「CTAを増やす」ではなく、検索意図 × 商材のミスマッチを疑う（ページ × 提供元の一覧を出す）。
 * ASP の実績（asp-results.json）は ASP ごとに期間が違う。率（発生CVR）は同じ ASP・同じ期間の中でだけ出し、ASP どうしを並べて比べない。
 * 未確定報酬は売上ではない。Revenue / 1,000 Views は確定売上（revenue-ledger.json）だけで出す。
 */
const num = (value) => (value == null || value === '' || !Number.isFinite(Number(value)) ? null : Number(value));
const rate = (a, b) => (a != null && b ? Number((a / b).toFixed(4)) : null);

/**
 * @param {{ snapshot: any, ledger: any, asp: any, pages?: Map<string, any>, commercialWords?: string[] }} input
 */
export function revenueFunnel({ snapshot, ledger, asp, pages = new Map(), commercialWords = [] }) {
  const conv = snapshot?.conversionDetail?.recent7 ?? {};
  const period = conv.start && conv.end ? `${conv.start}..${conv.end}` : null;
  const views7 = num(snapshot?.windows?.ga4?.recent7?.views);
  const views28 = num(snapshot?.windows?.ga4?.recent28?.views);
  const ctaImpressions = num(conv.booking_guide_view);
  const ctaClicks = num(conv.outbound_booking_click);
  const aspClicks = num(conv.paid_booking_click) ?? num(conv.monetized_booking_click);

  // 成果は ASP の報告（asp-results.json）と確定台帳（revenue-ledger.json）から。期間が7日とそろわないので率には使わない
  const providers = (asp?.providers ?? []).map((p) => ({
    ...p,
    clicks: num(p.clicks),
    occurred: num(p.occurred),
    confirmed: num(p.confirmed),
    revenueYen: num(p.revenueYen),
    pendingRewardYen: num(p.pendingRewardYen),
    confirmedRewardYen: num(p.confirmedRewardYen),
    occurredSalesYen: num(p.occurredSalesYen),
  }));
  const occurredTotal = providers.length && providers.every((p) => p.occurred != null) ? providers.reduce((s, p) => s + p.occurred, 0) : null;
  const periodOf = (p) => (p.period?.label ? `${p.period.label}（${p.checkedAt ?? p.period.end ?? asp?.asOf ?? '—'} 時点）` : `${p.asOf ?? asp?.asOf ?? '—'} 時点`);
  const occurredPeriod = providers.length > 1 && providers.some((p) => p.period?.label)
    ? `${providers.map((p) => `${p.name} ${periodOf(p)}`).join('・')}（ASPごとに期間が違う）`
    : asp?.asOf ? `ASP報告 ${asp.asOf} 時点の累計` : null;
  // ASP ごとの実績（同じ ASP・同じ期間の中でだけ率を出す）
  const aspProviders = providers.map((p) => ({
    key: p.key ?? null,
    name: p.name,
    period: periodOf(p),
    clicks: p.clicks,
    occurred: p.occurred,
    occurredCvr: p.clicks && p.occurred != null ? Number((p.occurred / p.clicks).toFixed(4)) : null,
    occurredSalesYen: p.occurredSalesYen,
    pendingRewardYen: p.pendingRewardYen,
    confirmed: p.confirmed,
    confirmedRewardYen: p.confirmedRewardYen,
    status: p.status ?? null,
    sourcePagesNote: p.sourcePagesNote ?? null,
  }));
  const pendingKnown = providers.filter((p) => p.pendingRewardYen != null);
  const pendingRewardYen = pendingKnown.length ? pendingKnown.reduce((s, p) => s + p.pendingRewardYen, 0) : null;
  const confirmedEntries = (ledger?.entries ?? []).filter((e) => e.status === 'confirmed');
  const confirmedRevenue = confirmedEntries.reduce((s, e) => s + Number(e.revenueYen ?? 0), 0);

  const stages = [
    { key: 'pv', label: 'PV', value: views7, period: '直近7日', source: 'GA4' },
    { key: 'ctaImpression', label: 'CTA表示（Booking Guide）', value: ctaImpressions, period: '直近7日', source: 'GA4 booking_guide_view' },
    { key: 'ctaClick', label: 'CTAクリック', value: ctaClicks, period: '直近7日', source: 'GA4 outbound_booking_click' },
    { key: 'aspClick', label: 'ASPへの送客クリック', value: aspClicks, period: '直近7日', source: 'GA4 paid_booking_click（提携リンクのみ）' },
    { key: 'occurred', label: '発生成果', value: occurredTotal, period: occurredPeriod, source: providers.map((p) => `${p.name}：${p.source ?? '—'}`).join('／') || '未取得' },
    { key: 'confirmed', label: '確定成果', value: confirmedEntries.length, period: '累計（確定台帳）', source: 'revenue-ledger.json（確定のみ記録）' },
    { key: 'revenue', label: 'Revenue', value: confirmedRevenue, period: '累計（確定台帳）', source: 'revenue-ledger.json' },
  ];

  const metrics = {
    revenuePer1000Views: views28 ? Number((confirmedRevenue / views28 * 1000).toFixed(2)) : null,
    revenuePer1000ViewsBasis: '確定売上（累計）÷ 直近28日Views × 1,000',
    ctaCtr: rate(ctaClicks, ctaImpressions),
    affiliateCtr: rate(aspClicks, ctaImpressions),
    occurredCvr: null,
    // 未確定が残るあいだは承認率を出さない（未確定は否認ではない。0% と出すと「全部否認された」と読める）
    approvalRate: occurredTotal && !(pendingRewardYen > 0) && !providers.some((p) => p.status === 'occurred-pending') ? rate(confirmedEntries.length, occurredTotal) : null,
    epc: null,
    pendingRewardYen,
    pendingRewardBasis: '未確定報酬（ASP報告の合計・期間はASPごと）。売上ではないので Revenue に入れない',
    note: '発生CVR・EPC は、クリックと成果の期間がそろうまで計算しない（7日のクリックと累計の成果で割らない）。ASPごとの発生CVRは、同じASP・同じ期間のクリックと発生で出す（ASPどうしは比べない）',
  };

  // 成果0の診断：送客クリックがあるのに発生成果が0 → 検索意図 × 商材のミスマッチを疑う
  const diagnosis = [];
  const paidRows = (snapshot?.conversionDetail?.byProviderPage ?? []).filter((r) => r.classification === 'paid' || r.partner_status === 'active');
  for (const p of providers) {
    // クリックは ASP 自身の値を優先（無ければ GA4 の送客クリック）
    if (p.occurred === 0 && ((p.clicks ?? aspClicks) ?? 0) > 0) {
      // ASP名（a8）と送客リンクの提供元（jalan・akippa）は名前が違う。linkProviders で対応づける
      const keys = (p.linkProviders?.length ? p.linkProviders : [p.key]).filter(Boolean).map((k) => String(k).toLowerCase());
      const rows = paidRows.filter((r) => !keys.length || keys.some((k) => String(r.link_provider ?? '').toLowerCase().includes(k)));
      const clicksNote = p.clicks != null ? `${p.clicks}クリック・` : '送客クリックはあるが';
      diagnosis.push({
        provider: p.name,
        message: `${p.name}：${clicksNote}発生成果0（${periodOf(p)}）。少数のうちは不採算と判断しない。CTAを増やす前に、ページの検索意図と商材、リンク先、成果条件が合っているかを確認する`,
        pages: rows.map((r) => ({ path: r.path, provider: r.link_provider, url: r.link_url, clicks: num(r.event_count) })).sort((a, b) => (b.clicks ?? 0) - (a.clicks ?? 0)).slice(0, 8),
      });
    }
  }

  // ページ別の送客（提携リンクのクリック）。GA4 の page_path × link_provider の期間をそのまま付ける。按分・補完はしない
  const ppPeriod = snapshot?.conversionDetail?.byProviderPagePeriod;
  const paidMap = new Map();
  for (const r of paidRows.filter((r) => r.classification === 'paid')) {
    const key = `${r.path}\u0000${r.link_provider ?? ''}`;
    const row = paidMap.get(key) ?? { path: r.path, provider: r.link_provider ?? null, clicks: 0 };
    row.clicks += num(r.event_count) ?? 0;
    paidMap.set(key, row);
  }
  const paidByPage = {
    period: ppPeriod?.start && ppPeriod?.end ? `${ppPeriod.start}..${ppPeriod.end}` : null,
    source: snapshot?.conversionDetail?.byProviderPageSource ?? null,
    rows: [...paidMap.values()].sort((a, b) => b.clicks - a.clicks).slice(0, 12),
  };

  // 高商用意図のページ（駐車場・宿泊・予約・店・アクセス・交通規制…）：収益化候補として評価する（CTAの乱設はしない）
  const byPage = new Map((snapshot?.conversionDetail?.byPage ?? []).map((r) => [r.path, r]));
  const highIntent = (snapshot?.pageMetrics ?? [])
    .map((r) => {
      const page = pages.get(r.path);
      const text = [page?.title, page?.keyword, ...(page?.tags ?? [])].filter(Boolean).join(' ');
      const words = commercialWords.filter((w) => text.includes(w));
      if (!words.length) return null;
      const b = byPage.get(r.path);
      return {
        path: r.path, label: page?.title ?? r.path, views7: num(r.views7), intents: words.slice(0, 4),
        hasBookingGuide: Boolean(page?.frontmatter?.bookingGuide), bookingGuideView: num(b?.booking_guide_view), outboundClick: num(b?.outbound_booking_click), monetizedClick: num(b?.monetized_booking_click),
      };
    })
    .filter(Boolean)
    .sort((a, b) => (b.views7 ?? 0) - (a.views7 ?? 0))
    .slice(0, 10);

  const b2b = [
    { label: '事業者CTA表示', value: num(conv.business_cta_view) },
    { label: '事業者CTAクリック', value: num(conv.business_cta_click) },
    { label: '問い合わせフォーム表示', value: num(conv.contact_form_view) },
    { label: 'フォーム開始', value: num(conv.form_start) },
    { label: 'フォーム送信', value: num(conv.form_submit) },
    { label: 'リード（generate_lead）', value: num(conv.generate_lead) },
  ];

  return { period, stages, metrics, providers: aspProviders, paidByPage, diagnosis, highIntent, b2b };
}
