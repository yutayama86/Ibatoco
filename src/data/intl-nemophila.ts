/**
 * 国営ひたち海浜公園のネモフィラ（英語・繁體中文・한국어）。
 *
 * なぜ「東京からの行き方」と別ページか:
 *  既存の hitachi-seaside-park-from-tokyo は「どう行くか」が主題で、
 *  ネモフィラは見頃の文脈で触れているだけ。海外の検索は
 *  "hitachi seaside park nemophila" のように花そのもので探すので、
 *  「いつ・いくら・何時まで・どこに咲くか」を主題にしたページを分ける。
 *  行き方は要約だけにして、詳しくは既存ガイドへつなぐ（食い合いを避ける）。
 *
 * 事実の扱い（2026-09-27 に公式サイトで確認）:
 *  - 観賞時期 4月中旬〜5月上旬、場所 みはらしの丘、品種 インシグニスブルー、
 *    種まき 毎年11月頃（畝幅20cm）… flower/nemophila.html
 *  - 開園 3/1〜7/17 9:30〜17:00、春期 3/26〜5/31 は毎日開園、
 *    休園日 毎週火曜（祝日なら直後の平日）… guide/schedule.html
 *  - 入園料 大人450円・シルバー210円・中学生以下無料、花の季節は季節料金350円を加算
 *    （大人800円・シルバー560円）、2日通し券、駐車料金、レンタサイクル、
 *    シーサイドトレイン、2026年春の無料入園日 … guide/ticket.html
 *  - 東京駅→勝田駅 特急約85分、勝田駅東口2番→西口約15分・プレジャーガーデン前約25分・
 *    南口約30分、成田空港→勝田駅西口 空港バス約2時間30分、海浜公園1日フリーきっぷ
 *    … access/train-bus.html
 *  - 本数（「約○百万本」）は公式ページで確認できなかったので書かない。
 *  - 「みはらしの丘は西口が近い」とは書かない。公式のアクセスページにその記載がない。
 *  - 2027年の見頃予想・季節料金の期間は未発表。発表後に更新する。
 *  直訳はしない。市場ごとに導入・強調点を変える。
 */
import type { IntlGuide } from './intl-guides';
import type { Locale } from './i18n';

const PARK_URL = 'https://hitachikaihin.jp/';
const NEMOPHILA_URL = 'https://www.hitachikaihin.jp/flower-plant/flower/nemophila.html';
const SCHEDULE_URL = 'https://www.hitachikaihin.jp/guide/schedule.html';
const TICKET_URL = 'https://www.hitachikaihin.jp/guide/ticket.html';
const ACCESS_URL = 'https://hitachikaihin.jp/access/train-bus.html';
const UPDATED = '2026-09-27';
const HERO = '/images/intl/hitachi-seaside-park-nemophila.jpg';

export const HITACHI_NEMOPHILA: Record<Exclude<Locale, 'ja'>, IntlGuide> = {
  en: {
    slug: 'hitachi-seaside-park-nemophila',
    translationKey: 'hitachi-seaside-park-nemophila',
    title: 'Hitachi Seaside Park Nemophila 2027: Bloom Season, Tickets & Opening Hours',
    description: 'When the blue nemophila hill at Hitachi Seaside Park blooms (mid-April to early May), what it costs in flower season, opening hours and closed days, and how to get there from Tokyo. Checked against the park’s official site.',
    h1: 'Nemophila at Hitachi Seaside Park: When to Go in 2027',
    lead: [
      'Every spring, Miharashi Hill at Hitachi Seaside Park turns blue with nemophila. It is the view most people picture when they think of this park — and the reason many visitors plan a whole trip to Ibaraki around a two- or three-week window.',
      'This page is about timing: when the flowers bloom, what changes in price and opening hours during the season, and what has not been announced for 2027 yet. We are a local media team in Ibaraki, and we only publish what we can confirm on the park’s official site.',
    ],
    heroImage: {
      src: HERO,
      alt: 'Blue nemophila covering Miharashi Hill at Hitachi Seaside Park, with visitors walking along the ridge',
      credit: 'Photo: IBATOCO Editorial Team',
      width: 1108,
      height: 831,
    },
    routeChain: {
      label: 'From Tokyo, in one line',
      steps: [
        { place: 'Tokyo Station', note: 'JR Joban Line limited express' },
        { place: 'Katsuta Station', note: 'about 85 minutes' },
        { place: 'Bus from East Exit, stop No. 2', note: 'about 15 minutes' },
        { place: 'West Gate' },
      ],
    },
    quickAnswerLabel: 'Quick answers',
    quickAnswer: [
      { q: 'When do the nemophila bloom?', a: 'The park lists the viewing season as mid-April to early May.' },
      { q: 'Has the 2027 forecast been published?', a: 'Not yet. As of September 27, 2026, the park has not announced a 2027 bloom forecast or the 2027 seasonal fee dates. We will update this page when it does.' },
      { q: 'Where in the park?', a: 'On Miharashi Hill, which the whole display covers.' },
      { q: 'Can I go straight from Narita Airport?', a: 'Yes. The park lists an airport bus from Narita Airport to Katsuta Station West Exit (about 2 hours 30 minutes), then the local bus to the park (about 15 minutes).' },
      { q: 'How much is admission in the season?', a: 'Adults ¥800 and seniors (65+) ¥560 during the flower seasons, which is the normal ¥450 / ¥210 plus a ¥350 seasonal fee. Junior high school age and younger enter free.' },
      { q: 'Is it open every day?', a: 'The park is normally closed on Tuesdays, but it opens every day from March 26 to May 31, which covers the nemophila season.' },
    ],
    sections: [
      {
        id: 'when',
        heading: 'When to go',
        body: [
          'The park’s own flower page gives the nemophila viewing season as mid-April to early May. Within that window the exact peak moves from year to year with the weather, so the most useful thing you can do is keep your dates a little flexible and check the park’s bloom updates in April.',
          'The flowers for spring 2027 have not been planted yet. The park sows nemophila every year around November, in rows about 20 centimetres apart, so the hill you see next spring is started this autumn.',
          'In spring 2026, the seasonal admission fee applied from April 3 to May 6. The 2027 dates have not been announced; treat the 2026 dates as a rough reference only.',
        ],
      },
      {
        id: 'what-you-see',
        heading: 'What you will see',
        body: [
          'The nemophila cover the whole of Miharashi Hill. The park describes the view as the blue of the flowers blending into the blue of the sky and the sea. The variety the park uses is called Insignis Blue — a common garden variety, which the park notes you can buy at ordinary garden centres if you want to grow it at home.',
          'The same hill is replanted with kochia later in the year, which turns red in autumn. If you cannot make it in spring, that is the park’s other big season.',
        ],
      },
      {
        id: 'tickets',
        heading: 'Tickets in the flower season',
        body: ['These are the park’s published prices. You pay at the gate.'],
        table: [
          ['Adults (high school age and above)', '¥800 in the flower season (¥450 + ¥350 seasonal fee)'],
          ['Seniors (65 and over)', '¥560 in the flower season (¥210 + ¥350)'],
          ['Junior high school age and younger', 'Free'],
          ['2-day pass, adults', '¥1,200 in the flower season (¥500 normally)'],
          ['Parking', 'Cars ¥600 per day, motorcycles ¥300, large vehicles ¥1,800'],
          ['Free admission days', 'In spring 2026, everyone entered free on May 10 and May 17. No 2027 dates have been announced.'],
        ],
      },
      {
        id: 'hours',
        heading: 'Opening hours and closed days',
        table: [
          ['March 1 to July 17', '9:30 to 17:00'],
          ['Open every day', 'March 26 to May 31 (spring period)'],
          ['Otherwise closed', 'Tuesdays (the next weekday if Tuesday is a public holiday)'],
        ],
        body: ['The park notes that opening days and hours can change. Check the official schedule before you travel.'],
      },
      {
        id: 'getting-around',
        heading: 'Getting there and getting around',
        body: [
          'From Tokyo, take the JR Joban Line limited express to Katsuta Station (about 85 minutes), then the bus from the East Exit, stop No. 2. It reaches the West Gate in about 15 minutes, the Pleasure Garden stop in about 25 and the South Gate in about 30. Our separate guide covers the route in detail, including the highway-bus alternative.',
          'Flying in? The park lists an airport bus from Narita Airport to Katsuta Station West Exit, about 2 hours 30 minutes, then the same local bus. Ibaraki Kotsu also sells a one-day ticket for the park bus at Katsuta Station.',
          'The park is large. If you want to see more than the hill, the park rents bicycles (adults ¥600 for 3 hours) and runs the Seaside Train, a small road train with a ¥600 one-day ticket for ages 3 and up.',
        ],
      },
      {
        id: 'not-yet',
        heading: 'What has not been announced for 2027',
        list: [
          'The 2027 bloom forecast',
          'The 2027 seasonal fee dates',
          'Any 2027 free admission days or special opening hours',
        ],
        body: ['We do not fill these in with last year’s dates. When the park publishes them, we will add them here with the date we checked.'],
      },
    ],
    faqLabel: 'Frequently asked questions',
    faq: [
      { q: 'When is the best time to see the nemophila at Hitachi Seaside Park?', a: 'The park lists the viewing season as mid-April to early May. The exact peak changes with the weather each year, so check the park’s bloom updates in April.' },
      { q: 'Has the park announced the 2027 nemophila dates?', a: 'Not as of September 27, 2026. Neither the 2027 bloom forecast nor the 2027 seasonal fee dates have been published. We will update this page when they are.' },
      { q: 'How much does it cost to see the nemophila?', a: 'During the flower season, admission is ¥800 for adults and ¥560 for seniors (65 and over). Junior high school age and younger are free.' },
      { q: 'Is the park closed on any days in spring?', a: 'The park is normally closed on Tuesdays, but from March 26 to May 31 it is open every day.' },
      { q: 'Can I grow the same flowers at home?', a: 'The park uses a variety called Insignis Blue, which it says is widely sold at garden centres.' },
    ],
    sourcesLabel: 'Sources',
    sources: [
      { label: 'Hitachi Seaside Park — Nemophila (official; checked September 27, 2026)', url: NEMOPHILA_URL },
      { label: 'Hitachi Seaside Park — Opening days and hours (official)', url: SCHEDULE_URL },
      { label: 'Hitachi Seaside Park — Fees (official)', url: TICKET_URL },
      { label: 'Hitachi Seaside Park — Access by train and bus, including Narita Airport (official; checked September 27, 2026)', url: ACCESS_URL },
      { label: 'Hitachi Seaside Park — Official site', url: PARK_URL },
    ],
    updatedLabel: 'Last updated',
    updatedDate: UPDATED,
    authorLabel: 'Written by',
    author: 'IBATOCO Editorial Team',
    disclaimer: 'Bloom timing depends on the weather, and fees and opening hours can change. Always confirm on the official website before you travel.',
    related: {
      label: 'Read next',
      items: [
        { title: 'How to Get to Hitachi Seaside Park from Tokyo', text: 'Train and bus step by step, the highway-bus alternative, and total travel time.', href: '/en/hitachi-seaside-park-from-tokyo/' },
      ],
    },
    place: { name: 'Hitachi Seaside Park', address: '605-4 Onuma, Mawatari, Hitachinaka, Ibaraki 312-0012, Japan', url: PARK_URL },
  },

  'zh-tw': {
    slug: 'hitachi-seaside-park-nemophila',
    translationKey: 'hitachi-seaside-park-nemophila',
    title: '2027國營常陸海濱公園粉蝶花攻略：花期、門票、開園時間與交通',
    description: '國營常陸海濱公園的粉蝶花在4月中旬到5月上旬綻放。整理花季門票、開園時間與休園日、從東京出發的交通，以及2027年尚未公布的資訊。由茨城在地媒體依官方資料查證。',
    h1: '2027常陸海濱公園粉蝶花：什麼時候去最好',
    lead: [
      '每年春天，國營常陸海濱公園的「觀海之丘」會被粉蝶花染成一整片藍。很多人第一次知道茨城，就是因為這幅畫面，也有不少旅客會特地配合這短短兩三週安排行程。',
      '這篇專講「時機」：花什麼時候開、花季時門票和開園時間有什麼不同，以及2027年還有哪些資訊尚未公布。我們是茨城的在地媒體，只刊登能在公園官網查證的內容。',
    ],
    heroImage: {
      src: HERO,
      alt: '國營常陸海濱公園「觀海之丘」開滿藍色粉蝶花，遊客沿著山脊步道行走',
      credit: '照片：IBATOCO 編輯部',
      width: 1108,
      height: 831,
    },
    routeChain: {
      label: '從東京出發一次看懂',
      steps: [
        { place: '東京車站', note: 'JR常磐線特急' },
        { place: '勝田站', note: '約85分鐘' },
        { place: '東口2號乘車處搭巴士', note: '約15分鐘' },
        { place: '海濱公園西口' },
      ],
    },
    quickAnswerLabel: '快速重點',
    quickAnswer: [
      { q: '粉蝶花什麼時候開？', a: '公園官方公布的觀賞期是4月中旬到5月上旬。' },
      { q: '2027年的花期預測出來了嗎？', a: '還沒有。截至2026年9月27日，公園尚未公布2027年的花期預測與季節加價期間，公布後我們會更新本頁。' },
      { q: '花海在公園哪裡？', a: '在「觀海之丘」（みはらしの丘），整座山丘都會開滿。' },
      { q: '可以從成田機場直接過去嗎？', a: '可以。公園官網列出從成田機場搭機場巴士到勝田站西口約2小時30分鐘，再轉路線巴士到公園約15分鐘。' },
      { q: '花季門票多少？', a: '花季期間大人800日圓、65歲以上560日圓（平常450日圓／210日圓，再加季節費350日圓）。國中生以下免費。' },
      { q: '每天都有開嗎？', a: '平常每週二休園，但3月26日到5月31日每天開園，粉蝶花季不會遇到休園日。' },
    ],
    sections: [
      {
        id: 'when',
        heading: '什麼時候去',
        body: [
          '公園官網的粉蝶花頁面，把觀賞期寫為4月中旬到5月上旬。每年的最佳時機會隨天氣前後移動，所以最實用的做法是：行程保留一點彈性，4月時留意公園公布的開花資訊。',
          '2027年春天的花，現在都還沒種下去。公園每年大約11月播種，以約20公分的間距成排播下，所以明年春天看到的那片藍，是從今年秋天開始準備的。',
          '參考：2026年春季的季節加價期間是4月3日到5月6日。2027年的期間尚未公布，請只把2026年的日期當作大致參考。',
        ],
      },
      {
        id: 'what-you-see',
        heading: '會看到什麼樣的風景',
        body: [
          '粉蝶花開滿整座「觀海之丘」。公園形容這幅景色是花的藍、天空的藍與大海的藍融為一體。公園使用的品種叫「Insignis Blue（インシグニスブルー）」，官方表示這是一般園藝店就買得到的常見品種。',
          '同一座山丘到了下半年會改種掃帚草（コキア），秋天轉為紅色。如果春天去不了，秋天是公園的另一個大花季。',
        ],
      },
      {
        id: 'tickets',
        heading: '花季門票',
        body: ['以下是公園官方公布的價格，於入園口付款。'],
        table: [
          ['大人（高中生以上）', '花季800日圓（450日圓＋季節費350日圓）'],
          ['65歲以上', '花季560日圓（210日圓＋350日圓）'],
          ['國中生以下', '免費'],
          ['大人2日通票', '花季1,200日圓（平常500日圓）'],
          ['停車費', '小客車1天600日圓、機車300日圓、大型車1,800日圓'],
          ['免費入園日', '2026年春季的5月10日與5月17日全員免費。2027年尚未公布。'],
        ],
      },
      {
        id: 'hours',
        heading: '開園時間與休園日',
        table: [
          ['3月1日～7月17日', '9:30～17:00'],
          ['每天開園', '3月26日～5月31日（春季期間）'],
          ['其他時期的休園日', '每週二（遇國定假日則順延至下一個平日）'],
        ],
        body: ['公園表示開園日與時間可能變動，出發前請再確認官方公告。'],
      },
      {
        id: 'getting-around',
        heading: '交通與園內移動',
        body: [
          '從東京車站搭JR常磐線特急到勝田站約85分鐘，再從東口2號乘車處搭巴士：到西口約15分鐘、到Pleasure Garden前約25分鐘、到南口約30分鐘。完整路線（含高速巴士的走法）請看我們的另一篇交通攻略。',
          '搭飛機來的話：公園官網列出成田機場有機場巴士到勝田站西口，約2小時30分鐘，再轉同一條路線巴士。茨城交通也在勝田站販售往公園的巴士一日券。',
          '公園很大。如果除了花海還想多逛，園內有自行車租借（大人3小時600日圓），也有「Seaside Train」園內遊園車，一日券600日圓（3歲以上）。',
        ],
      },
      {
        id: 'not-yet',
        heading: '2027年尚未公布的資訊',
        list: ['2027年的花期預測', '2027年的季節加價期間', '2027年的免費入園日或特別開園時間'],
        body: ['我們不會拿去年的日期來填空。公園公布後，會連同查證日期一起更新在這裡。'],
      },
    ],
    faqLabel: '常見問題',
    faq: [
      { q: '常陸海濱公園的粉蝶花什麼時候最美？', a: '公園官方公布的觀賞期是4月中旬到5月上旬。實際最佳時機每年會隨天氣變動，建議4月時查看公園的開花資訊。' },
      { q: '2027年的粉蝶花花期公布了嗎？', a: '截至2026年9月27日尚未公布。2027年的花期預測與季節加價期間都還沒有發表，公布後我們會更新。' },
      { q: '看粉蝶花要多少錢？', a: '花季期間大人800日圓、65歲以上560日圓，國中生以下免費。' },
      { q: '春天會遇到休園日嗎？', a: '平常每週二休園，但3月26日到5月31日每天開園。' },
      { q: '可以買到一樣的粉蝶花種子嗎？', a: '公園使用的品種是「Insignis Blue」，官方表示一般園藝店就買得到。' },
    ],
    sourcesLabel: '資料來源',
    sources: [
      { label: '國營常陸海濱公園｜粉蝶花（官方，2026年9月27日查證）', url: NEMOPHILA_URL },
      { label: '國營常陸海濱公園｜開園日與時間（官方）', url: SCHEDULE_URL },
      { label: '國營常陸海濱公園｜費用（官方）', url: TICKET_URL },
      { label: '國營常陸海濱公園｜電車與巴士交通，含成田機場（官方，2026年9月27日查證）', url: ACCESS_URL },
      { label: '國營常陸海濱公園｜官方網站', url: PARK_URL },
    ],
    updatedLabel: '最後更新',
    updatedDate: UPDATED,
    authorLabel: '撰文',
    author: 'IBATOCO 編輯部',
    disclaimer: '花期會隨天氣變動，門票與開園時間也可能調整。出發前請務必確認官方網站。',
    related: {
      label: '接著閱讀',
      items: [
        { title: '國營常陸海濱公園怎麼去？從東京出發完整攻略', text: '電車與巴士的實際走法、高速巴士的替代方案，以及單程所需時間。', href: '/zh-tw/hitachi-seaside-park-from-tokyo/' },
      ],
    },
    place: { name: '國營常陸海濱公園', address: '〒312-0012 茨城縣常陸那珂市馬渡字大沼605-4', url: PARK_URL },
  },

  ko: {
    slug: 'hitachi-seaside-park-nemophila',
    translationKey: 'hitachi-seaside-park-nemophila',
    title: '2027 히타치 해변공원 네모필라 — 개화 시기, 입장료, 운영 시간, 가는 법',
    description: '히타치 해변공원의 네모필라는 4월 중순부터 5월 초순까지 핍니다. 꽃 시즌 입장료, 운영 시간과 휴원일, 도쿄에서 가는 법, 아직 발표되지 않은 2027년 정보를 공원 공식 자료로 확인해 정리했습니다.',
    h1: '2027 히타치 해변공원 네모필라, 언제 가면 좋을까',
    lead: [
      '매년 봄, 국영 히타치 해변공원의 미하라시 언덕은 네모필라로 온통 파랗게 물듭니다. 이 공원을 떠올릴 때 대부분이 생각하는 바로 그 풍경이고, 2~3주 남짓한 이 시기에 맞춰 이바라키 여행을 계획하는 사람도 많습니다.',
      '이 글은 "타이밍"에 집중합니다. 꽃이 언제 피는지, 시즌 중 입장료와 운영 시간이 어떻게 달라지는지, 그리고 2027년에 아직 발표되지 않은 것은 무엇인지. 저희는 이바라키의 로컬 미디어로, 공원 공식 사이트에서 확인한 내용만 싣습니다.',
    ],
    heroImage: {
      src: HERO,
      alt: '국영 히타치 해변공원 미하라시 언덕을 뒤덮은 푸른 네모필라와 능선을 걷는 방문객',
      credit: '사진: IBATOCO 편집부',
      width: 1108,
      height: 831,
    },
    routeChain: {
      label: '도쿄에서 한 줄로 보기',
      steps: [
        { place: '도쿄역', note: 'JR 조반선 특급' },
        { place: '가쓰타역', note: '약 85분' },
        { place: '동쪽 출구 2번 승강장에서 버스', note: '약 15분' },
        { place: '서문' },
      ],
    },
    quickAnswerLabel: '한눈에 보기',
    quickAnswer: [
      { q: '네모필라는 언제 피나요?', a: '공원은 관람 시기를 4월 중순부터 5월 초순까지로 안내하고 있습니다.' },
      { q: '2027년 개화 예측은 나왔나요?', a: '아직입니다. 2026년 9월 27일 기준으로 2027년 개화 예측과 시즌 요금 적용 기간은 발표되지 않았습니다. 발표되면 이 페이지를 업데이트합니다.' },
      { q: '공원 어디에 피나요?', a: '미하라시 언덕 전체를 뒤덮습니다.' },
      { q: '나리타공항에서 바로 갈 수 있나요?', a: '네. 공원 공식 사이트는 나리타공항에서 가쓰타역 서쪽 출구까지 공항버스로 약 2시간 30분, 이어서 노선버스로 공원까지 약 15분을 안내합니다.' },
      { q: '시즌 입장료는 얼마인가요?', a: '꽃 시즌에는 성인 800엔, 65세 이상 560엔입니다(평소 450엔/210엔에 시즌 요금 350엔 추가). 중학생 이하는 무료입니다.' },
      { q: '매일 문을 여나요?', a: '평소에는 매주 화요일 휴원이지만, 3월 26일부터 5월 31일까지는 매일 개원합니다.' },
    ],
    sections: [
      {
        id: 'when',
        heading: '언제 가면 좋을까',
        body: [
          '공원 공식 사이트의 네모필라 페이지는 관람 시기를 4월 중순부터 5월 초순으로 안내합니다. 가장 좋은 시기는 해마다 날씨에 따라 앞뒤로 움직이기 때문에, 일정을 조금 여유 있게 잡고 4월에 공원이 발표하는 개화 정보를 확인하는 것이 가장 확실합니다.',
          '2027년 봄에 필 꽃은 아직 심기 전입니다. 공원은 매년 11월쯤 약 20cm 간격으로 줄지어 씨를 뿌립니다. 내년 봄의 파란 언덕은 올가을부터 준비가 시작되는 셈입니다.',
          '참고로 2026년 봄의 시즌 요금 적용 기간은 4월 3일부터 5월 6일까지였습니다. 2027년 기간은 아직 발표되지 않았으니, 2026년 날짜는 대략적인 참고로만 봐 주세요.',
        ],
      },
      {
        id: 'what-you-see',
        heading: '어떤 풍경을 볼 수 있나',
        body: [
          '네모필라는 미하라시 언덕 전체를 뒤덮습니다. 공원은 이 풍경을 꽃의 파란색이 하늘과 바다의 파란색과 하나로 어우러지는 모습이라고 소개합니다. 공원이 쓰는 품종은 "인시그니스 블루"로, 일반 원예점에서도 살 수 있는 흔한 품종이라고 공원은 설명합니다.',
          '같은 언덕은 하반기에 코키아로 바뀌어 가을에 붉게 물듭니다. 봄에 가기 어렵다면 가을이 공원의 또 다른 큰 시즌입니다.',
        ],
      },
      {
        id: 'tickets',
        heading: '꽃 시즌 입장료',
        body: ['공원이 공식 발표한 요금입니다. 입구에서 결제합니다.'],
        table: [
          ['성인(고등학생 이상)', '시즌 중 800엔(450엔 + 시즌 요금 350엔)'],
          ['65세 이상', '시즌 중 560엔(210엔 + 350엔)'],
          ['중학생 이하', '무료'],
          ['성인 2일권', '시즌 중 1,200엔(평소 500엔)'],
          ['주차료', '승용차 1일 600엔, 이륜차 300엔, 대형차 1,800엔'],
          ['무료 입장일', '2026년 봄에는 5월 10일과 5월 17일에 전원 무료였습니다. 2027년은 아직 발표되지 않았습니다.'],
        ],
      },
      {
        id: 'hours',
        heading: '운영 시간과 휴원일',
        table: [
          ['3월 1일 ~ 7월 17일', '9:30 ~ 17:00'],
          ['매일 개원', '3월 26일 ~ 5월 31일(봄 기간)'],
          ['그 외 휴원일', '매주 화요일(공휴일이면 그다음 평일)'],
        ],
        body: ['개원일과 운영 시간은 바뀔 수 있다고 공원은 안내합니다. 출발 전 공식 일정을 확인해 주세요.'],
      },
      {
        id: 'getting-around',
        heading: '가는 법과 공원 안 이동',
        body: [
          '도쿄역에서 JR 조반선 특급으로 가쓰타역까지 약 85분, 동쪽 출구 2번 승강장에서 버스를 타면 서문까지 약 15분, 플레저 가든 앞까지 약 25분, 남문까지 약 30분입니다. 고속버스로 가는 방법까지 포함한 자세한 경로는 별도 가이드에 정리했습니다.',
          '비행기로 오신다면: 공원 공식 사이트는 나리타공항에서 가쓰타역 서쪽 출구까지 공항버스로 약 2시간 30분을 안내합니다. 이후 같은 노선버스를 타면 됩니다. 가쓰타역에서는 이바라키교통이 공원행 버스 1일 승차권도 판매합니다.',
          '공원은 매우 넓습니다. 언덕 외에도 둘러보고 싶다면 자전거 대여(성인 3시간 600엔)와 공원 내 순환 열차 "시사이드 트레인"(1일권 600엔, 3세 이상)을 이용할 수 있습니다.',
        ],
      },
      {
        id: 'not-yet',
        heading: '2027년에 아직 발표되지 않은 것',
        list: ['2027년 개화 예측', '2027년 시즌 요금 적용 기간', '2027년 무료 입장일이나 특별 운영 시간'],
        body: ['작년 날짜로 빈칸을 채우지 않습니다. 공원이 발표하면 확인한 날짜와 함께 여기에 추가하겠습니다.'],
      },
    ],
    faqLabel: '자주 묻는 질문',
    faq: [
      { q: '히타치 해변공원 네모필라는 언제가 가장 예쁜가요?', a: '공원이 안내하는 관람 시기는 4월 중순부터 5월 초순입니다. 정확한 절정 시기는 해마다 날씨에 따라 달라지므로 4월에 공원의 개화 정보를 확인하세요.' },
      { q: '2027년 네모필라 일정은 발표됐나요?', a: '2026년 9월 27일 기준으로 아직입니다. 2027년 개화 예측과 시즌 요금 기간 모두 발표되지 않았으며, 발표되면 업데이트합니다.' },
      { q: '네모필라를 보려면 얼마가 드나요?', a: '꽃 시즌에는 성인 800엔, 65세 이상 560엔이며 중학생 이하는 무료입니다.' },
      { q: '봄에 휴원하는 날이 있나요?', a: '평소에는 매주 화요일이 휴원이지만, 3월 26일부터 5월 31일까지는 매일 개원합니다.' },
      { q: '같은 꽃을 집에서 키울 수 있나요?', a: '공원이 쓰는 품종은 "인시그니스 블루"이며, 일반 원예점에서 구할 수 있다고 공원은 설명합니다.' },
    ],
    sourcesLabel: '출처',
    sources: [
      { label: '국영 히타치 해변공원 — 네모필라(공식, 2026년 9월 27일 확인)', url: NEMOPHILA_URL },
      { label: '국영 히타치 해변공원 — 개원일·운영 시간(공식)', url: SCHEDULE_URL },
      { label: '국영 히타치 해변공원 — 요금(공식)', url: TICKET_URL },
      { label: '국영 히타치 해변공원 — 열차·버스 교통, 나리타공항 포함(공식, 2026년 9월 27일 확인)', url: ACCESS_URL },
      { label: '국영 히타치 해변공원 — 공식 사이트', url: PARK_URL },
    ],
    updatedLabel: '최종 업데이트',
    updatedDate: UPDATED,
    authorLabel: '작성',
    author: 'IBATOCO 편집부',
    disclaimer: '개화 시기는 날씨에 따라 달라지며, 요금과 운영 시간도 바뀔 수 있습니다. 출발 전 반드시 공식 사이트를 확인하세요.',
    related: {
      label: '이어서 읽기',
      items: [
        { title: '도쿄에서 히타치 해변공원 가는 법', text: '열차와 버스로 가는 실제 경로, 고속버스 대안, 총 소요 시간.', href: '/ko/hitachi-seaside-park-from-tokyo/' },
      ],
    },
    place: { name: '국영 히타치 해변공원', address: '〒312-0012 이바라키현 히타치나카시 마와타리 오누마 605-4', url: PARK_URL },
  },
};
