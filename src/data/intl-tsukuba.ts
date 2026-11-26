/**
 * 筑波山（ケーブルカー・ロープウェイ・筑波山神社）の海外向けガイド（英語・繁體中文・한국어）。
 *
 * なぜこのページか:
 *  海外の検索は "Mount Tsukuba" "Mt Tsukuba from Tokyo" "Tsukuba cable car" で来る。
 *  秋葉原からTXで約45分の「東京から一番近い名山」の一つだが、2026年12月〜2027年2月は
 *  ロープウェイ・ケーブルカーの運休日が続く。旅行者が知らずに行って困らないよう、運休日を最初に出す。
 *
 * 事実の扱い:
 *  初版はイバトコ編集部が公式一次情報で確認済みの日本語記事の内容（確認日つき）で作成。
 *  2026-11-27 に筑波観光鉄道の運休のお知らせ・ケーブルカー運賃ページを再確認し、次を修正・追記した：
 *   - 無料は「6歳未満」ではなく「未就学児（大人1名につき2名まで）」（ケーブルカー運賃ページの表記）
 *   - 連絡片道乗車券の小児870円、販売場所（宮脇駅・つつじヶ丘駅）
 *   - 1/12〜2/19 はコマ展望台・宮脇駅売店が休業、ロープウェイ運休日はカフェ シエロ ブルーが休業
 *   - 運休のお知らせには新車両の運行開始日の記載がない（「2027年2月予定」は京成電鉄・筑波観光鉄道の発表、2026-11-05 確認）
 *  - 運休日（ロープウェイ 2026/12/7〜11・14〜18、ケーブルカー 12/21〜23・2027/1/12〜2/19）、
 *    5代目ケーブルカーの最終運行 2027/1/11、新車両 2027年2月予定、工事期間中もロープウェイは営業
 *    … 筑波観光鉄道の2026-11-24発表（日本語記事 tsukuba-cablecar-ropeway-guide / tsukubasan-day-trip-model-course、2026-11-24 確認）
 *  - ケーブルカー（宮脇駅〜筑波山頂駅 約8分）・ロープウェイ（つつじヶ丘駅〜女体山駅 約6分）、20分間隔、
 *    大人 片道930円・往復1,860円、小児 ケーブル470円/940円・ロープウェイ400円/800円、
 *    6歳未満は保護者1人につき2人まで無料、運行 12〜2月 両方9:20〜16:40、
 *    3〜11月 ケーブル9:00〜17:00・ロープウェイ9:20〜17:00、連絡片道乗車券 大人1,860円
 *    … mt-tsukuba.com 運賃・時刻表（2026-11-03〜11-24 確認）
 *  - 御幸ヶ原から男体山頂・女体山頂へ各徒歩約15分、女体山駅から女体山頂へ約5分 … mt-tsukuba.com hiking（2026-09-29 確認）
 *  - TX 秋葉原〜つくば 約45分（筑波山神社の案内）、大人きっぷ1,280円（TX運賃表、2026-11-04 確認）
 *  - つくばセンター1番のりば→筑波山神社入口 シャトルバス約40分・大人770円、つつじヶ丘まで大人930円、
 *    12〜2月は最終便が運休になる期間がある … 関東鉄道・筑波山神社（2026-11-03 確認）
 *  - 男体山871m・女体山877m、筑波山神社は山そのものを御神体として拝む、拝殿は中腹（標高270m）
 *    … 筑波山神社（日本語記事 tsukubasan-jinja-guide）
 *  - 「筑波山きっぷ」は存在のみ書く（料金・内容はこのページ用に確認していない）。
 *  - 写真は載せない（海外ガイドは自前写真のみの方針）。
 *  日本語版 /events/tsukuba-cablecar-ropeway-guide/ は 2026-11-24 の更新で観測窓のため、hreflang の ja はまだ登録しない。
 *  運休情報は 2027-02-20 以降に外す。新車両の運行開始日が発表されたら追記する。
 */
import type { IntlGuide } from './intl-guides';
import type { Locale } from './i18n';

const OPERATOR_URL = 'https://mt-tsukuba.com/';
const SUSPENSION_URL = 'https://mt-tsukuba.com/点検に伴うケーブルカー・ロープウェイ運行休止/';
const CABLE_FARE_URL = 'https://mt-tsukuba.com/cablecar-fare/';
const ROPEWAY_FARE_URL = 'https://mt-tsukuba.com/ropeway-fare/';
const ACCESS_URL = 'https://mt-tsukuba.com/access/';
const BUS_URL = 'https://www.kantetsu.co.jp/bus/tourist/mttsukuba';
const SHRINE_ACCESS_URL = 'https://tsukubasanjinja.jp/access/';
const TX_FARE_URL = 'https://www.mir.co.jp/service/fare_regular_202603.pdf';
const UPDATED = '2026-11-27';

export const MOUNT_TSUKUBA: Record<Exclude<Locale, 'ja'>, IntlGuide> = {
  en: {
    slug: 'mount-tsukuba',
    translationKey: 'mount-tsukuba',
    title: 'Mount Tsukuba from Tokyo: Cable Car & Ropeway Fares, Winter Closures and Access',
    description: 'Mount Tsukuba is about 45 minutes from Akihabara by train, then a shuttle bus. Cable car and ropeway fares and hours, the closure dates from December 2026 to February 2027, and an easy up-one-way, down-the-other route.',
    h1: 'Mount Tsukuba: A Day Trip from Akihabara',
    lead: [
      'Mount Tsukuba has two peaks: Nantai-san (871 m) and Nyotai-san (877 m). Tsukubasan Shrine, on the mountain’s southern slope, worships the mountain itself as its sacred body.',
      'It is one of the easiest mountains to reach from Tokyo. The Tsukuba Express takes about 45 minutes from Akihabara, and a shuttle bus goes up to the shrine and the cable car.',
      'Before you go: the ropeway and the cable car each have closure days this winter. The cable car is closed from January 12 to February 19, 2027 while a new car is installed. Check the dates below.',
    ],
    routeChain: {
      label: 'The route at a glance',
      steps: [
        { place: 'Akihabara', note: 'Tsukuba Express, about 45 min' },
        { place: 'Tsukuba Station (Tsukuba Center)', note: 'shuttle bus from stop No. 1' },
        { place: 'Tsukubasan Jinja Iriguchi', note: 'about 40 min, ¥770' },
        { place: 'Shrine → cable car → summit' },
      ],
    },
    quickAnswerLabel: 'Quick answers',
    quickAnswer: [
      { q: 'How much are the cable car and ropeway?', a: 'Each costs ¥930 one way or ¥1,860 return for adults. Children: cable car ¥470 / ¥940, ropeway ¥400 / ¥800. Preschool children ride free, up to two per adult.' },
      { q: 'When are they closed?', a: 'Ropeway: December 7–11 and 14–18, 2026. Cable car: December 21–23, 2026 and January 12 – February 19, 2027. All full-day closures, announced by the operator on November 24, 2026.' },
      { q: 'What are the hours in winter?', a: 'From December to February, both run 9:20–16:40, every 20 minutes.' },
      { q: 'How long does it take from Tokyo?', a: 'About 45 minutes from Akihabara to Tsukuba by Tsukuba Express, then about 40 minutes by shuttle bus to Tsukubasan Jinja Iriguchi.' },
      { q: 'Is the current cable car being replaced?', a: 'Yes. The fifth-generation car makes its last run on January 11, 2027. A new car is planned to start in February 2027.' },
    ],
    sections: [
      {
        id: 'closures',
        heading: 'Closure dates, December 2026 – February 2027',
        body: [
          'The operator, Tsukuba Kanko Railway, announced these full-day closures on November 24, 2026. On days when one is closed, go up and down using the other.',
        ],
        table: [
          ['Ropeway (Tsutsujigaoka – Nyotaisan)', 'Closed December 7–11 and December 14–18, 2026 (weekdays) for annual inspection. It runs on the weekends in between (December 12–13 and 19–20).'],
          ['Cable car (Miyawaki – Tsukubasan-cho)', 'Closed December 21–23, 2026 for track maintenance.'],
          ['Cable car', 'Closed January 12 – February 19, 2027 for the switch to a new car. The ropeway operates during this period. The Koma observation building and the Miyawaki Station shop are also closed.'],
          ['Last run of the current car', 'January 11, 2027 (national holiday). The operator and Keisei Electric Railway have said the new car is planned for February 2027; the start date has not been announced.'],
        ],
      },
      {
        id: 'getting-there',
        heading: 'How to get there from Tokyo',
        table: [
          ['Train', 'Tsukuba Express (TX) from Akihabara to Tsukuba: about 45 minutes, ¥1,280 for adults with a paper ticket.'],
          ['Shuttle bus', 'From Tsukuba Center, bus stop No. 1, take the Mt. Tsukuba Shuttle Bus. To “Tsukubasan Jinja Iriguchi” (for the shrine and the cable car): about 40 minutes, ¥770 for adults. To “Tsutsujigaoka” (for the ropeway): ¥930 for adults.'],
          ['Last buses in winter', 'From December to February, the last bus is cancelled on some days. Check the Kanto Railway timetable for your return.'],
          ['Combined ticket', 'TX sells a “Tsukubasan Kippu” that combines the train with the bus and mountain transport. Check TX for the current price and conditions.'],
        ],
      },
      {
        id: 'route',
        heading: 'A simple route: up one way, down the other',
        body: [
          'One easy plan: take the shuttle bus to Tsukubasan Jinja Iriguchi, visit the shrine, and ride the cable car (about 8 minutes) up to Miyukigahara. From there, each summit is about a 15-minute walk. Walk to Nyotai-san, then ride the ropeway (about 6 minutes) down to Tsutsujigaoka and take the shuttle bus back.',
          'If you go one way on each, the operator sells a combined one-way ticket for the cable car and ropeway (¥1,860 for adults, ¥870 for children), sold at Miyawaki and Tsutsujigaoka stations.',
          'On closure days, do the route in reverse or ride the working line both ways.',
        ],
      },
      {
        id: 'hours',
        heading: 'Fares and hours',
        table: [
          ['Adults', 'Cable car or ropeway: ¥930 one way, ¥1,860 return'],
          ['Children (elementary school)', 'Cable car: ¥470 / ¥940. Ropeway: ¥400 / ¥800'],
          ['Preschool children', 'Free, up to two per accompanying adult'],
          ['December – February', 'Both 9:20–16:40, every 20 minutes'],
          ['March – November', 'Cable car 9:00–17:00, ropeway 9:20–17:00, every 20 minutes'],
        ],
      },
    ],
    faqLabel: 'FAQ',
    faq: [
      { q: 'Can I still reach the summit when the cable car is closed?', a: 'Yes. From January 12 to February 19, 2027, the ropeway runs from Tsutsujigaoka to Nyotai-san. Take the shuttle bus to Tsutsujigaoka.' },
      { q: 'Which peak is higher?', a: 'Nyotai-san, at 877 m. Nantai-san is 871 m.' },
      { q: 'How long is the walk between the peaks?', a: 'From Miyukigahara, each summit is about 15 minutes on foot. Nyotaisan Station to the Nyotai-san summit is about 5 minutes.' },
      { q: 'Is it a day trip from Tokyo?', a: 'Yes. Allow about 1.5 hours each way from Akihabara, and check the last bus in winter.' },
    ],
    sourcesLabel: 'Sources',
    sources: [
      { label: 'Tsukuba Kanko Railway — Cable car and ropeway closures (official, Japanese)', url: SUSPENSION_URL },
      { label: 'Tsukuba Kanko Railway — Cable car fares (official, Japanese)', url: CABLE_FARE_URL },
      { label: 'Tsukuba Kanko Railway — Ropeway fares (official, Japanese)', url: ROPEWAY_FARE_URL },
      { label: 'Tsukuba Kanko Railway — Access (official, Japanese)', url: ACCESS_URL },
      { label: 'Kanto Railway — Mt. Tsukuba Shuttle Bus (official, Japanese)', url: BUS_URL },
      { label: 'Tsukubasan Shrine — Access (official, Japanese)', url: SHRINE_ACCESS_URL },
      { label: 'Tsukuba Express — Fare chart (official, PDF)', url: TX_FARE_URL },
    ],
    updatedLabel: 'Last updated',
    updatedDate: UPDATED,
    authorLabel: 'Written by',
    author: 'IBATOCO Editorial Team',
    disclaimer: 'Closures, fares, hours and timetables can change. Please check the official websites before you travel.',
    related: {
      label: 'Read next',
      items: [
        { title: 'Ushiku Daibutsu: The 120-Meter Buddha You Can Walk Inside', text: 'Another southern Ibaraki sight, reached by the JR Joban Line.', href: '/en/ushiku-daibutsu/' },
        { title: 'Kairakuen Plum Blossoms: Mito Plum Festival 2027 Guide', text: 'Plum season in Mito, February to March.', href: '/en/kairakuen-plum-blossoms/' },
      ],
    },
    place: { name: 'Mount Tsukuba', address: 'Tsukuba, Ibaraki, Japan', url: OPERATOR_URL },
  },

  'zh-tw': {
    slug: 'mount-tsukuba',
    translationKey: 'mount-tsukuba',
    title: '筑波山怎麼去？從秋葉原出發的交通、纜車與空中纜車票價、冬季停駛日',
    description: '筑波山從秋葉原搭筑波快線約45分鐘，再轉接駁巴士。整理地面纜車與空中纜車的票價和時間、2026年12月至2027年2月的停駛日，以及「上山搭一種、下山搭另一種」的簡單路線。',
    h1: '筑波山：從秋葉原出發的一日遊',
    lead: [
      '筑波山有兩座山峰：男體山（871公尺）與女體山（877公尺）。位於山腰南側的筑波山神社，把整座山當作神體來參拜。',
      '這是從東京最容易抵達的名山之一：從秋葉原搭筑波快線（TX）約45分鐘，再轉接駁巴士就能到神社與纜車站。',
      '出發前注意：今年冬天空中纜車與地面纜車都有停駛日。地面纜車為了更換新車廂，2027年1月12日至2月19日停駛。請看下方日期。',
    ],
    routeChain: {
      label: '路線一次看懂',
      steps: [
        { place: '秋葉原', note: '筑波快線約45分鐘' },
        { place: '筑波站（筑波中心）', note: '1號乘車處搭接駁巴士' },
        { place: '「筑波山神社入口」', note: '約40分鐘，770日圓' },
        { place: '神社→地面纜車→山頂' },
      ],
    },
    quickAnswerLabel: '快速重點',
    quickAnswer: [
      { q: '纜車票價多少？', a: '地面纜車與空中纜車大人都是單程930日圓、來回1,860日圓。兒童：地面纜車470／940日圓，空中纜車400／800日圓。每位大人可帶2名學齡前兒童免費。' },
      { q: '什麼時候停駛？', a: '空中纜車：2026年12月7～11日、14～18日。地面纜車：2026年12月21～23日，以及2027年1月12日～2月19日。皆為全日停駛（營運公司2026年11月24日公布）。' },
      { q: '冬季營運時間？', a: '12～2月兩者都是9:20～16:40，每20分鐘一班。' },
      { q: '從東京要多久？', a: '秋葉原搭筑波快線到筑波約45分鐘，再搭接駁巴士到「筑波山神社入口」約40分鐘。' },
      { q: '地面纜車要換新嗎？', a: '是的。第5代車廂於2027年1月11日最後一次運行，新車廂預計2027年2月啟用。' },
    ],
    sections: [
      {
        id: 'closures',
        heading: '停駛日（2026年12月～2027年2月）',
        body: [
          '營運公司筑波觀光鐵道於2026年11月24日公布以下全日停駛日。其中一條停駛時，請用另一條上下山。',
        ],
        table: [
          ['空中纜車（躑躅丘～女體山）', '2026年12月7～11日、12月14～18日（平日）年度檢修停駛。中間的週末（12月12～13日、19～20日）照常營運。'],
          ['地面纜車（宮脇～筑波山頂）', '2026年12月21～23日軌道整修停駛。'],
          ['地面纜車', '2027年1月12日～2月19日更換新車廂停駛，期間空中纜車照常營運。獨樂展望台與宮脇站商店同時休業。'],
          ['現行車廂最後運行', '2027年1月11日（國定假日）。營運公司與京成電鐵表示新車廂預計2027年2月啟用，確切日期尚未公布。'],
        ],
      },
      {
        id: 'getting-there',
        heading: '從東京怎麼去',
        table: [
          ['電車', '筑波快線（TX）秋葉原→筑波 約45分鐘，大人車票1,280日圓。'],
          ['接駁巴士', '筑波中心1號乘車處搭「筑波山接駁巴士」。到「筑波山神社入口」（往神社與地面纜車）約40分鐘，大人770日圓；到「躑躅丘」（往空中纜車）大人930日圓。'],
          ['冬季末班車', '12～2月部分日子末班車停駛，回程請先查關東鐵道時刻表。'],
          ['套票', 'TX有販售結合電車、巴士與山上交通的「筑波山套票」，價格與條件請向TX確認。'],
        ],
      },
      {
        id: 'route',
        heading: '簡單路線：上山搭一種、下山搭另一種',
        body: [
          '推薦走法：搭接駁巴士到「筑波山神社入口」，參拜神社後搭地面纜車（約8分鐘）上到御幸原。從這裡到兩座山頂各步行約15分鐘。走到女體山後搭空中纜車（約6分鐘）下到躑躅丘，再搭接駁巴士回去。',
          '如果兩種各搭單程，營運公司有販售地面纜車與空中纜車的聯絡單程票（大人1,860日圓、兒童870日圓），在宮脇站與躑躅丘站販售。',
          '遇到停駛日，可以反過來走，或來回都搭有營運的那一條。',
        ],
      },
      {
        id: 'hours',
        heading: '票價與營運時間',
        table: [
          ['大人', '地面纜車或空中纜車：單程930日圓、來回1,860日圓'],
          ['兒童（國小）', '地面纜車470／940日圓，空中纜車400／800日圓'],
          ['學齡前兒童', '每位同行大人最多2名免費'],
          ['12～2月', '兩者皆9:20～16:40，每20分鐘一班'],
          ['3～11月', '地面纜車9:00～17:00，空中纜車9:20～17:00，每20分鐘一班'],
        ],
      },
    ],
    faqLabel: '常見問題',
    faq: [
      { q: '地面纜車停駛時還能上山頂嗎？', a: '可以。2027年1月12日至2月19日，空中纜車照常從躑躅丘開往女體山。請搭接駁巴士到躑躅丘。' },
      { q: '哪座山比較高？', a: '女體山877公尺，男體山871公尺。' },
      { q: '兩座山頂之間要走多久？', a: '從御幸原到兩座山頂各約15分鐘。女體山站到女體山頂約5分鐘。' },
      { q: '可以從東京當天來回嗎？', a: '可以。從秋葉原單程約1個半小時，冬天請注意末班巴士。' },
    ],
    sourcesLabel: '資料來源',
    sources: [
      { label: '筑波觀光鐵道｜纜車停駛公告（官方，日文）', url: SUSPENSION_URL },
      { label: '筑波觀光鐵道｜地面纜車票價（官方，日文）', url: CABLE_FARE_URL },
      { label: '筑波觀光鐵道｜空中纜車票價（官方，日文）', url: ROPEWAY_FARE_URL },
      { label: '筑波觀光鐵道｜交通（官方，日文）', url: ACCESS_URL },
      { label: '關東鐵道｜筑波山接駁巴士（官方，日文）', url: BUS_URL },
      { label: '筑波山神社｜交通（官方，日文）', url: SHRINE_ACCESS_URL },
      { label: '筑波快線｜票價表（官方，PDF）', url: TX_FARE_URL },
    ],
    updatedLabel: '最後更新',
    updatedDate: UPDATED,
    authorLabel: '撰文',
    author: 'IBATOCO 編輯部',
    disclaimer: '停駛日、票價、營運時間與班次可能變動，出發前請務必確認官方網站。',
    related: {
      label: '延伸閱讀',
      items: [
        { title: '牛久大佛：可以走進去的120公尺大佛', text: '同在茨城南部，搭JR常磐線前往。', href: '/zh-tw/ushiku-daibutsu/' },
        { title: '偕樂園賞梅：2027水戶梅花祭攻略', text: '水戶的梅花季，2～3月。', href: '/zh-tw/kairakuen-plum-blossoms/' },
      ],
    },
    place: { name: '筑波山', address: '日本茨城縣筑波市', url: OPERATOR_URL },
  },

  ko: {
    slug: 'mount-tsukuba',
    translationKey: 'mount-tsukuba',
    title: '쓰쿠바산 가는 법: 아키하바라에서 교통·케이블카·로프웨이 요금·겨울 운휴일',
    description: '쓰쿠바산은 아키하바라에서 쓰쿠바 익스프레스로 약 45분, 그다음 셔틀버스로 갑니다. 케이블카와 로프웨이의 요금·운행 시간, 2026년 12월~2027년 2월 운휴일, ‘올라갈 때와 내려올 때 다르게 타는’ 간단한 코스를 정리했습니다.',
    h1: '쓰쿠바산: 아키하바라에서 떠나는 당일치기',
    lead: [
      '쓰쿠바산에는 봉우리가 두 개 있습니다. 난타이산(871m)과 뇨타이산(877m)입니다. 산 남쪽 중턱의 쓰쿠바산 신사는 산 자체를 신체로 모십니다.',
      '도쿄에서 가장 가기 쉬운 산 중 하나입니다. 아키하바라에서 쓰쿠바 익스프레스(TX)로 약 45분, 셔틀버스로 신사와 케이블카 역까지 올라갑니다.',
      '가기 전에 확인할 점: 올겨울에는 로프웨이와 케이블카 모두 운휴일이 있습니다. 케이블카는 새 차량 교체 공사로 2027년 1월 12일~2월 19일 운휴합니다. 아래 날짜를 확인하세요.',
    ],
    routeChain: {
      label: '한눈에 보는 경로',
      steps: [
        { place: '아키하바라', note: '쓰쿠바 익스프레스 약 45분' },
        { place: '쓰쿠바역(쓰쿠바센터)', note: '1번 승강장 셔틀버스' },
        { place: '‘쓰쿠바산진자이리구치’', note: '약 40분, 770엔' },
        { place: '신사 → 케이블카 → 정상' },
      ],
    },
    quickAnswerLabel: '핵심 요약',
    quickAnswer: [
      { q: '케이블카·로프웨이 요금은?', a: '둘 다 어른 편도 930엔, 왕복 1,860엔. 어린이: 케이블카 470엔/940엔, 로프웨이 400엔/800엔. 미취학 아동은 어른 1명당 2명까지 무료.' },
      { q: '언제 운휴하나요?', a: '로프웨이: 2026년 12월 7~11일, 14~18일. 케이블카: 2026년 12월 21~23일, 2027년 1월 12일~2월 19일. 모두 종일 운휴(운영사 2026년 11월 24일 발표).' },
      { q: '겨울 운행 시간은?', a: '12~2월은 둘 다 9:20~16:40, 20분 간격.' },
      { q: '도쿄에서 얼마나 걸려요?', a: '아키하바라에서 쓰쿠바까지 쓰쿠바 익스프레스로 약 45분, 셔틀버스로 ‘쓰쿠바산진자이리구치’까지 약 40분.' },
      { q: '케이블카가 새로 바뀌나요?', a: '네. 5대째 차량은 2027년 1월 11일에 마지막으로 운행하고, 새 차량은 2027년 2월 운행 예정입니다.' },
    ],
    sections: [
      {
        id: 'closures',
        heading: '운휴일(2026년 12월~2027년 2월)',
        body: [
          '운영사 쓰쿠바관광철도가 2026년 11월 24일 아래 종일 운휴일을 발표했습니다. 한쪽이 운휴하는 날은 다른 쪽으로 오르내리세요.',
        ],
        table: [
          ['로프웨이(쓰쓰지가오카~뇨타이산)', '2026년 12월 7~11일, 12월 14~18일(평일) 정기 점검 운휴. 사이의 주말(12월 12~13일, 19~20일)은 운행합니다.'],
          ['케이블카(미야와키~쓰쿠바산초)', '2026년 12월 21~23일 궤도 정비 운휴.'],
          ['케이블카', '2027년 1월 12일~2월 19일 새 차량 교체 공사로 운휴. 이 기간 로프웨이는 운행합니다. 고마 전망대와 미야와키역 매점도 휴업합니다.'],
          ['현재 차량 마지막 운행', '2027년 1월 11일(공휴일). 운영사와 게이세이전철은 새 차량을 2027년 2월 운행 예정이라고 밝혔지만, 시작일은 아직 발표되지 않았습니다.'],
        ],
      },
      {
        id: 'getting-there',
        heading: '도쿄에서 가는 법',
        table: [
          ['열차', '쓰쿠바 익스프레스(TX) 아키하바라 → 쓰쿠바 약 45분, 어른 승차권 1,280엔.'],
          ['셔틀버스', '쓰쿠바센터 1번 승강장에서 ‘쓰쿠바산 셔틀버스’. ‘쓰쿠바산진자이리구치’(신사·케이블카 방면)까지 약 40분, 어른 770엔. ‘쓰쓰지가오카’(로프웨이 방면)까지 어른 930엔.'],
          ['겨울 막차', '12~2월에는 막차가 운휴하는 날이 있습니다. 돌아오는 버스는 간토철도 시간표로 확인하세요.'],
          ['세트 승차권', 'TX가 열차·버스·산악 교통을 묶은 ‘쓰쿠바산 킷푸’를 판매합니다. 가격과 조건은 TX에서 확인하세요.'],
        ],
      },
      {
        id: 'route',
        heading: '간단한 코스: 올라갈 때와 내려올 때 다르게',
        body: [
          '추천 코스: 셔틀버스로 ‘쓰쿠바산진자이리구치’까지 가서 신사에 참배하고, 케이블카(약 8분)로 미유키가하라까지 오릅니다. 여기서 두 정상까지 각각 도보 약 15분입니다. 뇨타이산까지 걸어간 뒤 로프웨이(약 6분)로 쓰쓰지가오카까지 내려와 셔틀버스로 돌아갑니다.',
          '편도씩 탄다면 운영사가 케이블카·로프웨이 연결 편도 승차권(어른 1,860엔, 어린이 870엔)을 미야와키역과 쓰쓰지가오카역에서 판매합니다.',
          '운휴일에는 코스를 반대로 하거나, 운행하는 쪽으로 왕복하세요.',
        ],
      },
      {
        id: 'hours',
        heading: '요금과 운행 시간',
        table: [
          ['어른', '케이블카 또는 로프웨이: 편도 930엔, 왕복 1,860엔'],
          ['어린이(초등학생)', '케이블카 470엔/940엔, 로프웨이 400엔/800엔'],
          ['미취학 아동', '동반 어른 1명당 2명까지 무료'],
          ['12~2월', '둘 다 9:20~16:40, 20분 간격'],
          ['3~11월', '케이블카 9:00~17:00, 로프웨이 9:20~17:00, 20분 간격'],
        ],
      },
    ],
    faqLabel: '자주 묻는 질문',
    faq: [
      { q: '케이블카가 운휴할 때도 정상에 갈 수 있나요?', a: '네. 2027년 1월 12일~2월 19일에도 로프웨이는 쓰쓰지가오카에서 뇨타이산까지 운행합니다. 셔틀버스로 쓰쓰지가오카까지 가세요.' },
      { q: '어느 봉우리가 더 높나요?', a: '뇨타이산이 877m, 난타이산이 871m입니다.' },
      { q: '두 정상 사이는 얼마나 걸어요?', a: '미유키가하라에서 각 정상까지 약 15분. 뇨타이산역에서 뇨타이산 정상까지 약 5분입니다.' },
      { q: '도쿄에서 당일치기가 되나요?', a: '됩니다. 아키하바라에서 편도 약 1시간 30분이고, 겨울에는 막차 버스를 확인하세요.' },
    ],
    sourcesLabel: '출처',
    sources: [
      { label: '쓰쿠바관광철도｜케이블카·로프웨이 운휴 안내(공식, 일본어)', url: SUSPENSION_URL },
      { label: '쓰쿠바관광철도｜케이블카 요금(공식, 일본어)', url: CABLE_FARE_URL },
      { label: '쓰쿠바관광철도｜로프웨이 요금(공식, 일본어)', url: ROPEWAY_FARE_URL },
      { label: '쓰쿠바관광철도｜교통(공식, 일본어)', url: ACCESS_URL },
      { label: '간토철도｜쓰쿠바산 셔틀버스(공식, 일본어)', url: BUS_URL },
      { label: '쓰쿠바산 신사｜교통(공식, 일본어)', url: SHRINE_ACCESS_URL },
      { label: '쓰쿠바 익스프레스｜운임표(공식, PDF)', url: TX_FARE_URL },
    ],
    updatedLabel: '최종 업데이트',
    updatedDate: UPDATED,
    authorLabel: '작성',
    author: 'IBATOCO 편집부',
    disclaimer: '운휴일, 요금, 운행 시간, 교통 시간표는 변경될 수 있습니다. 출발 전 공식 사이트에서 확인해 주세요.',
    related: {
      label: '이어서 읽기',
      items: [
        { title: '우시쿠 대불: 안으로 걸어 들어가는 120m 불상', text: '같은 이바라키 남부, JR 조반선으로 가는 명소.', href: '/ko/ushiku-daibutsu/' },
        { title: '가이라쿠엔 매화: 2027 미토 매화 축제 가이드', text: '2~3월 미토의 매화 시즌.', href: '/ko/kairakuen-plum-blossoms/' },
      ],
    },
    place: { name: '쓰쿠바산', address: '일본 이바라키현 쓰쿠바시', url: OPERATOR_URL },
  },
};
