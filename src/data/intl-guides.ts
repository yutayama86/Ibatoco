/**
 * 海外向け旅行ガイド（英語・繁體中文・한국어）のデータ。
 *
 * 事実の扱い（重要）:
 *  - ここに書く数値は、国営ひたち海浜公園の公式サイトで確認できたものだけ。
 *    確認できたもの: 住所 / 入園料 / 季節料金と春の適用期間 / 東京駅→勝田駅 約85分 /
 *                    勝田駅東口2番のりば→西口 約15分 / 東京駅八重洲南口→水戸駅南口 みと号 約2時間
 *  - 開園・閉園時刻、休園日、運賃は公式ページで確認できなかったため「書かない」。
 *    代わりに各言語で「訪問前に公式サイトで確認」と案内する。
 *  - 直訳はしない。市場ごとに導入・見出し・FAQ・強調点を変える。
 */
import { LOCALE_META, type Locale } from './i18n';

export interface GuideSection {
  id: string;
  heading: string;
  body?: string[];
  list?: string[];
  table?: [string, string][];
}

export interface IntlGuide {
  slug: string;
  translationKey: string;
  title: string;
  description: string;
  h1: string;
  lead: string[];
  quickAnswerLabel: string;
  quickAnswer: { q: string; a: string }[];
  /**
   * 記事冒頭の写真。イバトコが自分で撮ったものだけを置く。
   * 借り物の写真や、行っていない場所の写真は載せない（編集方針）。
   */
  heroImage?: { src: string; alt: string; credit: string; width: number; height: number };
  /**
   * 東京からの経路を一目で示す連鎖（例：Tokyo → Katsuta → Bus → Park）。
   * 本文の表と同じ事実だけを短く並べる。新しい情報は足さない。
   * 旅行者の斜め読みと、AI検索の抜き出しの両方に効かせる目的。
   */
  routeChain?: { label: string; steps: { place: string; note?: string }[] };
  sections: GuideSection[];
  faqLabel: string;
  faq: { q: string; a: string }[];
  sourcesLabel: string;
  sources: { label: string; url: string }[];
  updatedLabel: string;
  updatedDate: string;
  authorLabel: string;
  author: string;
  disclaimer: string;
  /** 構造化データ用（実在する施設情報のみ） */
  place: { name: string; address: string; url: string };
}

const PARK_URL = 'https://hitachikaihin.jp/';
const PARK_TICKET_URL = 'https://www.hitachikaihin.jp/guide/ticket.html';
const PARK_ACCESS_URL = 'https://hitachikaihin.jp/access/train-bus.html';
const UPDATED = '2026-08-17';

export const HITACHI_SEASIDE_PARK: Record<Exclude<Locale, 'ja'>, IntlGuide> = {
  en: {
    slug: 'hitachi-seaside-park-from-tokyo',
    translationKey: 'hitachi-seaside-park-from-tokyo',
    // 「(2026 Guide)」は年が古びるうえ、狙うクエリ（train / bus）と一致する語がない。
    // 主要クエリ "how to get to ... from Tokyo" を保ったまま、交通手段を明示する。
    title: 'Hitachi Seaside Park from Tokyo (2026): Train, Bus & Travel Time',
    description: 'Travel from Tokyo to Hitachi Seaside Park by train and bus via Katsuta. Route, admission fees, and the park’s 2026 autumn kochia forecast and seasonal fee dates.',
    h1: 'How to Get to Hitachi Seaside Park from Tokyo',
    lead: [
      'The hill covered in millions of sky-blue nemophila flowers is one of the most photographed places in Japan — and it sits in Ibaraki, roughly two hours from central Tokyo.',
      'This guide covers how to actually get there without a car, what it costs, and when to go. We are a local media team based in Ibaraki, and we only publish what we can confirm with official sources.',
    ],
    heroImage: {
      src: '/images/intl/hitachi-seaside-park-nemophila.jpg',
      alt: 'Visitors walking the ridge of Miharashi Hill at Hitachi Seaside Park, covered in blue nemophila flowers',
      credit: 'Photo: IBATOCO Editorial Team',
      width: 1108,
      height: 831,
    },
    routeChain: {
      label: 'The route at a glance',
      steps: [
        { place: 'Tokyo Station', note: 'JR Joban Line limited express' },
        { place: 'Katsuta Station', note: 'about 85 minutes' },
        { place: 'Bus from East Exit, stop No. 2', note: 'about 15 minutes' },
        { place: 'Hitachi Seaside Park, West Gate' },
      ],
    },
    quickAnswerLabel: 'Quick answers',
    quickAnswer: [
      { q: 'What is it?', a: 'A large national seaside park in Hitachinaka, Ibaraki, known for its seasonal flower hill — blue nemophila in spring and red kochia in autumn.' },
      { q: 'Where is it?', a: 'Hitachinaka City, Ibaraki Prefecture, on the Pacific coast northeast of Tokyo.' },
      { q: 'How far from Tokyo?', a: 'About 85 minutes from Tokyo Station to Katsuta Station by JR Joban Line limited express, then about 15 minutes by bus.' },
      { q: 'Do I need a car?', a: 'No. Train plus a direct bus from Katsuta Station works well.' },
      { q: 'How much is admission?', a: '¥450 for adults in normal season, ¥800 during the spring and autumn flower seasons.' },
      { q: 'When is the 2026 autumn season?', a: 'The seasonal admission surcharge applies from October 9 to November 3. In its September 6 forecast, the park expects kochia to reach peak autumn colour around October 15; weather may change this forecast.' },
      { q: 'How long should I stay?', a: 'Half a day is enough for the flower areas; a full day if you want the whole park.' },
    ],
    sections: [
      {
        id: 'getting-there',
        heading: 'How to get there from Tokyo',
        body: [
          'The standard route is a limited express train to Katsuta Station, then a local bus to the park’s West Gate. Both legs are straightforward and signposted.',
        ],
        table: [
          ['Step 1 — Train', 'Tokyo Station to Katsuta Station on the JR Joban Line limited express: about 85 minutes.'],
          ['Step 2 — Bus', 'Katsuta Station East Exit, bus stop No. 2, to Seaside Park West Gate: about 15 minutes.'],
          ['Alternative — Highway bus', 'Tokyo Station Yaesu South Exit to Mito Station South Exit on the Ibaraki Kotsu "Mito-go" bus: about 2 hours, then transfer to the JR line and a local bus.'],
        ],
      },
      {
        id: 'travel-time',
        heading: 'Total travel time',
        body: [
          'Allow roughly two hours each way from central Tokyo, plus waiting time between the train and the bus. On peak flower weekends, both the bus and the park entrance can be crowded, so starting early makes a noticeable difference.',
        ],
      },
      {
        id: 'cost',
        heading: 'Admission fees',
        // 運賃は書かない。公園公式にも茨城交通の「のりば案内」にも金額の掲載がなく、
        // 一次情報で確認できていないため。代わりに事業者の運賃検索へ誘導する。
        body: ['Fees below are the park’s published admission prices. Train and bus fares are separate, and we do not print amounts here because we could not confirm current fares from an official source. Look them up directly: Ibaraki Kotsu publishes a route and fare search for the bus, and JR East for the train — both are linked under Sources below.'],
        table: [
          ['Adults (high school age and above)', '¥450'],
          ['Seniors (65 and over)', '¥210'],
          ['Junior high school age and younger', 'Free'],
          ['Spring and autumn flower seasons', 'An extra ¥350 applies — ¥800 for adults, ¥560 for seniors'],
          ['Spring season dates (2026)', 'April 3 to May 6, 2026'],
          ['Autumn seasonal surcharge dates (2026)', 'October 9 to November 3, 2026 — ¥350 in addition to admission'],
        ],
      },
      {
        id: 'best-time',
        heading: 'Best time to visit',
        body: [
          'The park is built around seasons rather than a single highlight. The blue nemophila hill peaks in spring, and the same hill turns deep red with kochia in autumn — the park applies its seasonal admission rate during both.',
          'The published spring season for 2026 runs from April 3 to May 6. For autumn 2026, the park has announced a ¥350 seasonal admission surcharge from October 9 to November 3. These are fee dates, not a guarantee that kochia will be at its peak throughout that period.',
          'In its forecast dated September 6, 2026, the park expects kochia to begin changing colour around October 10 and reach peak autumn colour around October 15. The park notes that the peak usually lasts about one week to ten days, and that weather may change the forecast. Check its latest updates before choosing your travel date.',
        ],
      },
      {
        id: 'without-a-car',
        heading: 'Visiting without a car',
        body: ['This is one of the few major flower parks in Japan that is genuinely easy to reach without driving.'],
        list: [
          'The bus from Katsuta Station goes directly to the park’s West Gate.',
          'The park is large, so wear shoes you can walk in — or use the paid cycling and in-park transport options available on site.',
          'If you are continuing along the coast, Oarai and Mito are both reachable from the same rail line, which makes a one-day or two-day loop realistic.',
        ],
      },
      {
        id: 'practical',
        heading: 'Practical information',
        body: [
          'Opening and closing times change by season, and the park has regular closed days. We are not listing them here because we could not confirm the current schedule on the official site at the time of writing — please check the official page before you go.',
          'Address: 605-4 Onuma, Mawatari, Hitachinaka, Ibaraki 312-0012. Phone: 029-265-9001.',
        ],
      },
    ],
    faqLabel: 'Frequently asked questions',
    faq: [
      { q: 'Can I visit Hitachi Seaside Park as a day trip from Tokyo?', a: 'Yes. At roughly two hours each way, a day trip is comfortable if you leave Tokyo in the morning.' },
      { q: 'Is it worth visiting outside the nemophila season?', a: 'Yes, though expectations matter. The flower hill is the signature view, but the park also has coastal woodland, wide open lawns and a separate amusement area. Outside the two flower seasons it is quieter and cheaper.' },
      { q: 'Do I need to book tickets in advance?', a: 'Check the official site before your visit — entry conditions during the busiest flower weekends can differ from normal days.' },
      { q: 'What else can I see nearby?', a: 'Oarai, on the same coast, and Mito, the prefectural capital, are both common additions to the same trip.' },
    ],
    sourcesLabel: 'Sources',
    sources: [
      { label: 'Hitachi Seaside Park — Official site', url: PARK_URL },
      { label: 'Hitachi Seaside Park — Admission fees (official)', url: PARK_TICKET_URL },
      { label: 'Hitachi Seaside Park — Access by train and bus (official)', url: PARK_ACCESS_URL },
      { label: 'Hitachi Seaside Park — Autumn 2026 seasonal surcharge dates (official; checked September 9)', url: 'https://www.hitachikaihin.jp/news/park/page001038.html' },
      { label: 'Hitachi Seaside Park — Kochia colour forecast as of September 6, 2026 (official; checked September 9)', url: 'https://www.hitachikaihin.jp/news/park/page001040.html' },
      { label: 'Ibaraki Kotsu — Bus route and fare search (official)', url: 'https://bus.ibako.co.jp/route/' },
      { label: 'JR East — English site (train routes and fares)', url: 'https://www.jreast.co.jp/multi/en/' },
    ],
    updatedLabel: 'Last updated',
    updatedDate: '2026-09-10',
    authorLabel: 'Written by',
    author: 'IBATOCO Editorial Team',
    disclaimer: 'Fees, opening hours and transport schedules change. Always confirm on the official website before you travel.',
    place: { name: 'Hitachi Seaside Park', address: '605-4 Onuma, Mawatari, Hitachinaka, Ibaraki 312-0012, Japan', url: PARK_URL },
  },

  'zh-tw': {
    slug: 'hitachi-seaside-park-from-tokyo',
    translationKey: 'hitachi-seaside-park-from-tokyo',
    title: '國營常陸海濱公園怎麼去？從東京出發交通、門票與粉蝶花季完整攻略',
    description: '從東京到國營常陸海濱公園約2小時，不自駕也能輕鬆抵達。整理特急電車與巴士路線、所需時間、門票價格，以及粉蝶花與掃帚草的季節資訊。由茨城在地媒體查證整理。',
    h1: '從東京到國營常陸海濱公園：交通、門票與季節攻略',
    lead: [
      '一整片天空藍的粉蝶花山丘，是日本最常被拍到的風景之一。它就在茨城縣，距離東京市中心大約兩小時。',
      '這篇整理「實際上要怎麼去」：不自駕的路線、需要多少時間、門票多少錢、什麼季節去最好。我們是位於茨城的在地媒體，只刊登能在官方資料查證的內容。',
    ],
    heroImage: {
      src: '/images/intl/hitachi-seaside-park-nemophila.jpg',
      alt: '國營常陸海濱公園「觀海之丘」上開滿藍色粉蝶花，遊客沿著山脊步道行走',
      credit: '照片：IBATOCO 編輯部',
      width: 1108,
      height: 831,
    },
    routeChain: {
      label: '路線一次看懂',
      steps: [
        { place: '東京車站', note: 'JR常磐線特急' },
        { place: '勝田站', note: '約85分鐘' },
        { place: '東口2號乘車處搭巴士', note: '約15分鐘' },
        { place: '海濱公園西口' },
      ],
    },
    quickAnswerLabel: '快速重點',
    quickAnswer: [
      { q: '這是什麼地方？', a: '位於茨城縣常陸那珂市的國營海濱公園，以季節花海聞名——春天的藍色粉蝶花與秋天的紅色掃帚草。' },
      { q: '在哪裡？', a: '茨城縣常陸那珂市，位於東京東北方的太平洋沿岸。' },
      { q: '從東京要多久？', a: '東京車站搭JR常磐線特急到勝田站約85分鐘，再轉巴士約15分鐘。' },
      { q: '需要租車嗎？', a: '不需要。電車加上勝田站的直達巴士就很方便。' },
      { q: '門票多少？', a: '平常大人450日圓，春秋花季期間800日圓。' },
      { q: '要待多久？', a: '只看花海半天足夠；想逛完整座公園建議安排一整天。' },
    ],
    sections: [
      {
        id: 'getting-there',
        heading: '從東京出發的交通方式',
        body: ['最常見的走法是先搭特急到勝田站，再轉搭巴士到公園西口。兩段都有清楚的指標，第一次去也不會迷路。'],
        table: [
          ['第一段：電車', '東京車站搭JR常磐線特急到勝田站，約85分鐘。'],
          ['第二段：巴士', '勝田站東口2號乘車處，搭往海濱公園西口，約15分鐘。'],
          ['其他選擇：高速巴士', '東京車站八重洲南口搭茨城交通「みと号」到水戶站南口約2小時，再轉JR與路線巴士。'],
        ],
      },
      {
        id: 'travel-time',
        heading: '總共要花多少時間',
        body: ['單程請抓大約兩小時，另外預留電車與巴士之間的轉乘等待時間。花季的週末，巴士與入園口都可能排隊，早點出發差很多。'],
      },
      {
        id: 'cost',
        heading: '門票價格',
        body: ['以下是公園官方公布的入園費。電車與巴士車資另計，因為票價會調整，這裡不列出，請出發前向各交通業者確認。'],
        table: [
          ['大人（高中生以上）', '450日圓'],
          ['敬老票（65歲以上）', '210日圓'],
          ['國中生以下', '免費'],
          ['春・秋花季期間', '加收350日圓，大人800日圓、敬老票560日圓'],
          ['2026年春季適用期間', '2026年4月3日～5月6日'],
        ],
      },
      {
        id: 'best-time',
        heading: '什麼時候去最好',
        body: [
          '這座公園的重點是「季節」。春天整面山丘是藍色粉蝶花，到了秋天，同一片山丘會轉成紅色的掃帚草——兩個時期公園都會加收季節料金。',
          '官方公布的2026年春季期間是4月3日到5月6日。秋季每年另訂，大約是10月間的20天左右。實際盛開時間會因天氣而前後移動，出發前請看官方的開花情報。',
        ],
      },
      {
        id: 'without-a-car',
        heading: '沒有自駕也沒問題',
        body: ['在日本的大型花卉公園裡，這裡算是少數「不自駕也很好到」的地方。'],
        list: [
          '勝田站的巴士直達公園西口，不用再轉車。',
          '園區很大，建議穿好走的鞋；園內也有付費的自行車與接駁工具可利用。',
          '想沿著海岸線繼續玩，大洗與水戶都在同一條鐵路線上，安排一日或兩日的行程都很順。',
        ],
      },
      {
        id: 'practical',
        heading: '實用資訊',
        body: [
          '開園與閉園時間會隨季節調整，公園也有固定的休園日。撰稿時我們無法在官方頁面確認到最新的時間表，因此這裡不列出，請務必於出發前查看官網。',
          '地址：〒312-0012 茨城縣常陸那珂市馬渡字大沼605-4。電話：029-265-9001。',
        ],
      },
    ],
    faqLabel: '常見問題',
    faq: [
      { q: '可以從東京當天來回嗎？', a: '可以。單程約兩小時，早上從東京出發的話，一日遊很輕鬆。' },
      { q: '非花季去還值得嗎？', a: '值得，但要調整期待。花海山丘是招牌，不過園內還有海岸林、大片草地與遊樂區。非花季人比較少，門票也比較便宜。' },
      { q: '需要事先買票嗎？', a: '出發前請確認官網。花季最熱門的週末，入園方式有可能與平日不同。' },
      { q: '附近還可以順遊哪裡？', a: '同一段海岸的大洗，以及茨城縣廳所在的水戶，都很常被安排在同一趟行程裡。' },
      { q: '從成田機場過去方便嗎？', a: '多數旅客會先進東京市區再往北移動。請以最新的鐵路與巴士班次確認轉乘方式。' },
    ],
    sourcesLabel: '資料來源',
    sources: [
      { label: '國營常陸海濱公園 官方網站', url: PARK_URL },
      { label: '國營常陸海濱公園 入園費（官方）', url: PARK_TICKET_URL },
      { label: '國營常陸海濱公園 電車・巴士交通（官方）', url: PARK_ACCESS_URL },
    ],
    updatedLabel: '最後更新',
    updatedDate: UPDATED,
    authorLabel: '撰文',
    author: 'IBATOCO 編輯部',
    disclaimer: '票價、開放時間與交通班次可能變動。出發前請務必確認官方網站。',
    place: { name: '國營常陸海濱公園', address: '〒312-0012 茨城縣常陸那珂市馬渡字大沼605-4', url: PARK_URL },
  },

  ko: {
    slug: 'hitachi-seaside-park-from-tokyo',
    translationKey: 'hitachi-seaside-park-from-tokyo',
    title: '도쿄에서 히타치 해변공원 가는 법 — 교통, 입장료, 네모필라 시기 정리',
    description: '도쿄에서 히타치 해변공원까지 약 2시간, 렌터카 없이도 갈 수 있습니다. 특급열차와 버스 경로, 소요 시간, 입장료, 네모필라와 코키아 시즌 정보를 이바라키 현지 매체가 공식 자료로 확인해 정리했습니다.',
    h1: '도쿄에서 히타치 해변공원 가는 법',
    lead: [
      '하늘색 네모필라가 언덕 전체를 덮는 풍경은 일본에서 가장 많이 사진에 담기는 장소 중 하나입니다. 그곳이 바로 이바라키, 도쿄 도심에서 약 2시간 거리에 있습니다.',
      '이 글에서는 렌터카 없이 실제로 가는 방법, 비용, 그리고 언제 가면 좋은지를 정리했습니다. 저희는 이바라키에 기반을 둔 로컬 미디어로, 공식 자료로 확인된 내용만 싣습니다.',
    ],
    heroImage: {
      src: '/images/intl/hitachi-seaside-park-nemophila.jpg',
      alt: '국영 히타치 해변공원 미하라시 언덕을 뒤덮은 푸른 네모필라와 능선을 걷는 방문객',
      credit: '사진: IBATOCO 편집부',
      width: 1108,
      height: 831,
    },
    routeChain: {
      label: '경로 한눈에 보기',
      steps: [
        { place: '도쿄역', note: 'JR 조반선 특급' },
        { place: '가쓰타역', note: '약 85분' },
        { place: '동쪽 출구 2번 승강장에서 버스', note: '약 15분' },
        { place: '히타치 해변공원 서문' },
      ],
    },
    quickAnswerLabel: '한눈에 보기',
    quickAnswer: [
      { q: '어떤 곳인가요?', a: '이바라키현 히타치나카시에 있는 국영 해변공원으로, 봄의 파란 네모필라와 가을의 붉은 코키아로 유명합니다.' },
      { q: '위치는?', a: '도쿄 북동쪽 태평양 연안, 이바라키현 히타치나카시입니다.' },
      { q: '도쿄에서 얼마나 걸리나요?', a: '도쿄역에서 JR 조반선 특급으로 가쓰타역까지 약 85분, 이후 버스로 약 15분입니다.' },
      { q: '렌터카가 필요한가요?', a: '아닙니다. 열차와 가쓰타역에서 출발하는 직행 버스로 충분합니다.' },
      { q: '입장료는?', a: '평상시 성인 450엔, 봄·가을 꽃 시즌에는 800엔입니다.' },
      { q: '얼마나 머물면 되나요?', a: '꽃 언덕만 본다면 반나절, 공원 전체를 둘러본다면 하루를 잡으시면 좋습니다.' },
    ],
    sections: [
      {
        id: 'getting-there',
        heading: '도쿄에서 가는 방법',
        body: ['가장 일반적인 경로는 특급열차로 가쓰타역까지 간 뒤, 버스로 공원 서문까지 가는 것입니다. 두 구간 모두 안내가 잘 되어 있어 처음 가도 어렵지 않습니다.'],
        table: [
          ['1단계 — 열차', '도쿄역에서 JR 조반선 특급을 타고 가쓰타역까지 약 85분.'],
          ['2단계 — 버스', '가쓰타역 동쪽 출구 2번 승강장에서 해변공원 서문까지 약 15분.'],
          ['대안 — 고속버스', '도쿄역 야에스 남쪽 출구에서 이바라키교통 「미토고」로 미토역 남쪽 출구까지 약 2시간, 이후 JR과 노선버스로 환승.'],
        ],
      },
      {
        id: 'travel-time',
        heading: '총 소요 시간',
        body: ['도쿄 도심 기준 편도 약 2시간, 여기에 열차와 버스 사이의 환승 대기 시간을 더해 여유 있게 잡으세요. 꽃 시즌 주말에는 버스와 입장 게이트 모두 붐비므로 이른 출발을 권합니다.'],
      },
      {
        id: 'cost',
        heading: '입장료',
        body: ['아래는 공원이 공식적으로 안내하는 입장료입니다. 열차·버스 요금은 별도이며, 요금이 바뀔 수 있어 여기에는 적지 않았습니다. 각 교통사에서 확인해 주세요.'],
        table: [
          ['성인(고등학생 이상)', '450엔'],
          ['65세 이상', '210엔'],
          ['중학생 이하', '무료'],
          ['봄·가을 꽃 시즌', '350엔 추가 — 성인 800엔, 65세 이상 560엔'],
          ['2026년 봄 시즌 기간', '2026년 4월 3일 ~ 5월 6일'],
        ],
      },
      {
        id: 'best-time',
        heading: '언제 가면 좋을까',
        body: [
          '이 공원의 핵심은 계절입니다. 봄에는 언덕 전체가 파란 네모필라로, 가을에는 같은 언덕이 붉은 코키아로 물듭니다. 두 시기 모두 공원이 시즌 요금을 적용합니다.',
          '공식적으로 안내된 2026년 봄 시즌은 4월 3일부터 5월 6일까지입니다. 가을 시즌은 매년 따로 정해지며 10월 중 약 20일간입니다. 실제 절정 시기는 날씨에 따라 달라지므로, 출발 전 공원 공식 개화 정보를 확인하세요.',
        ],
      },
      {
        id: 'without-a-car',
        heading: '렌터카 없이 가기',
        body: ['일본의 대형 꽃 공원 중에서, 운전하지 않고도 정말 편하게 갈 수 있는 몇 안 되는 곳입니다.'],
        list: [
          '가쓰타역에서 출발하는 버스가 공원 서문까지 바로 갑니다.',
          '공원이 넓으므로 편한 신발을 신으세요. 원내에는 유료 자전거와 이동 수단도 있습니다.',
          '해안을 따라 더 둘러보고 싶다면, 오아라이와 미토가 같은 노선에 있어 1박 2일 코스로 묶기 좋습니다.',
        ],
      },
      {
        id: 'practical',
        heading: '알아두면 좋은 정보',
        body: [
          '개장·폐장 시간은 계절에 따라 달라지고, 정기 휴원일도 있습니다. 작성 시점에 공식 페이지에서 최신 일정을 확인하지 못해 이 글에는 적지 않았습니다. 방문 전 공식 사이트에서 꼭 확인해 주세요.',
          '주소: 〒312-0012 이바라키현 히타치나카시 마와타리 오누마 605-4. 전화: 029-265-9001.',
        ],
      },
    ],
    faqLabel: '자주 묻는 질문',
    faq: [
      { q: '도쿄에서 당일치기가 가능한가요?', a: '가능합니다. 편도 약 2시간이라 오전에 출발하면 여유 있게 다녀올 수 있습니다.' },
      { q: '네모필라 시즌이 아니어도 갈 만한가요?', a: '갈 만합니다. 꽃 언덕이 대표 풍경이지만 해안 숲과 넓은 잔디밭, 놀이시설 구역도 있습니다. 비수기에는 사람이 적고 입장료도 저렴합니다.' },
      { q: '표를 미리 예매해야 하나요?', a: '방문 전 공식 사이트를 확인하세요. 가장 붐비는 꽃 시즌 주말에는 입장 방식이 평소와 다를 수 있습니다.' },
      { q: '근처에 함께 가볼 만한 곳은?', a: '같은 해안의 오아라이와 이바라키현청이 있는 미토를 함께 묶는 경우가 많습니다.' },
      { q: '아이와 함께 가도 괜찮을까요?', a: '넓은 잔디밭과 놀이시설 구역이 있어 가족 단위 방문이 많습니다. 중학생 이하는 입장료가 무료입니다.' },
    ],
    sourcesLabel: '출처',
    sources: [
      { label: '국영 히타치 해변공원 공식 사이트', url: PARK_URL },
      { label: '국영 히타치 해변공원 입장료(공식)', url: PARK_TICKET_URL },
      { label: '국영 히타치 해변공원 전철·버스 교통(공식)', url: PARK_ACCESS_URL },
    ],
    updatedLabel: '최종 업데이트',
    updatedDate: UPDATED,
    authorLabel: '작성',
    author: 'IBATOCO 편집부',
    disclaimer: '요금과 운영 시간, 교통 시간표는 변경될 수 있습니다. 출발 전 공식 사이트에서 확인해 주세요.',
    place: { name: '국영 히타치 해변공원', address: '〒312-0012 이바라키현 히타치나카시 마와타리 오누마 605-4', url: PARK_URL },
  },
};

/**
 * 構造化データ（Article + TouristAttraction + BreadcrumbList + FAQPage）。
 * ページに実際に書いてある情報だけを構造化する（構造化のための情報追加はしない）。
 */
export function guideJsonLd(guide: IntlGuide, locale: Exclude<Locale, 'ja'>, site: URL | undefined) {
  const abs = (path: string) => new URL(path, site).href;
  const url = abs(`${LOCALE_META[locale].prefix}/${guide.slug}/`);
  const home = abs(`${LOCALE_META[locale].prefix}/`);
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: guide.title,
      description: guide.description,
      inLanguage: LOCALE_META[locale].htmlLang,
      dateModified: guide.updatedDate,
      author: { '@type': 'Organization', name: guide.author },
      publisher: { '@type': 'Organization', name: 'IBATOCO', url: abs('/') },
      mainEntityOfPage: url,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'TouristAttraction',
      name: guide.place.name,
      address: guide.place.address,
      url: guide.place.url,
      inLanguage: LOCALE_META[locale].htmlLang,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'IBATOCO', item: home },
        { '@type': 'ListItem', position: 2, name: guide.h1, item: url },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      inLanguage: LOCALE_META[locale].htmlLang,
      mainEntity: guide.faq.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
  ];
}
