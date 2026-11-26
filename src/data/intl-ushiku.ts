/**
 * 牛久大仏（英語・繁體中文・한국어）。
 *
 * なぜこのページか:
 *  海外の検索は "Ushiku Daibutsu" "giant Buddha near Tokyo" "tallest bronze Buddha" で来る。
 *  胎内に入れること、85mの展望台、正月三が日は拝観無料、10〜2月は16:30閉園で胎内の受付が15:45まで、
 *  を先に出すのが旅行者にとっての価値。
 *
 * 事実の扱い（2026-11-26 に牛久大仏の公式サイトで再確認）:
 *  - 高さ120m（阿弥陀如来の十二の光明にちなむ）、1995年に青銅製仏像として世界一高いとギネス登録、
 *    胎内5層（光の世界・念仏の間・知恩報徳の世界（写経席約77）・蓮華蔵世界（胎内仏約3,400体）・霊鷲山の間（仏舎利））、
 *    地上85mの胸部の展望台（天候によりスカイツリー・富士山）、写経 別途500円〜 … daibutu.net/daibutu.html
 *  - 拝観料（セット 大人900円・子供500円、庭園のみ 600円・400円、3歳以下無料、15名以上の団体あり）、
 *    開園 9:30、閉園 3〜9月 平日17:00・土日祝17:30 / 10〜2月 16:30、受付終了 セット45分前・庭園30分前、
 *    年中無休、胎内と浄土庭園はペット不可 … daibutu.net/ryokin.html
 *  - 牛久駅東口2番乗り場から「牛久大仏・牛久浄苑」行きまたは「あみプレミアムアウトレット」行き、
 *    「牛久大仏」下車、約20〜30分、運賃560円（公式アクセスページの表記）、タクシー 牛久駅東口・荒川沖駅東口から約15分、
 *    圏央道 阿見東ICから約2km … daibutu.net/koutu.html
 *    （日本語記事は「平日730円・土日祝の直行便560円」と書いている。公式アクセスページは現在560円のみの表記のため、
 *     海外版では「公式は560円と案内、乗る便の運賃は関東鉄道で確認」と書く）
 *  - 2026年大晦日の花火は中止、大晦日23:00開門・元旦1:00閉門、2027年1月1〜3日の初詣参拝 9:30〜16:00 は拝観無料、
 *    駐車場は無料・820台 … daibutu.net/（トップ）
 *  - 東京からの所要時間は、牛久市の案内「都心まで50分」をそのまま使う（市の資料。路線・種別は特定しない）。
 *    特急が牛久駅に停まるかは書かない（このページ用に確認していないため）。
 *  - 住所は番地まで公式で確認していないため、市までにとどめる。
 *  - 写真は載せない（海外ガイドは自前写真のみの方針）。
 *  日本語版 /events/ushiku-daibutsu-guide/ は 2026-11-15 の title 変更で観測窓（14日）中のため、
 *  hreflang の ja はまだ登録しない（i18n.ts 参照）。
 *  正月（1/1〜3）の記載は 2027-01-04 以降に外す。
 */
import type { IntlGuide } from './intl-guides';
import type { Locale } from './i18n';

const TOP_URL = 'https://daibutu.net/';
const ABOUT_URL = 'https://daibutu.net/daibutu.html';
const FEE_URL = 'https://daibutu.net/ryokin.html';
const ACCESS_URL = 'https://daibutu.net/koutu.html';
const CITY_ACCESS_URL = 'https://www.city.ushiku.lg.jp/data/doc/1599703818_doc_1_0.pdf';
const UPDATED = '2026-11-26';

export const USHIKU_DAIBUTSU: Record<Exclude<Locale, 'ja'>, IntlGuide> = {
  en: {
    slug: 'ushiku-daibutsu',
    translationKey: 'ushiku-daibutsu',
    title: 'Ushiku Daibutsu: Visiting the 120 m Giant Buddha from Tokyo — Tickets, Hours & Access',
    description: 'Ushiku Daibutsu in Ibaraki is a 120 m bronze Buddha you can go inside, with a viewing floor at 85 m. Tickets, seasonal hours and last entry, free entry on January 1–3, 2027, and the bus from JR Ushiku Station.',
    h1: 'Ushiku Daibutsu: The 120-Meter Buddha You Can Walk Inside',
    lead: [
      'Ushiku Daibutsu, a standing Amida Buddha in Ushiku, southern Ibaraki, is 120 meters tall. In 1995 it was registered by Guinness World Records as the tallest bronze statue of a Buddha in the world. Its height comes from the twelve lights of Amida Buddha.',
      'You can go inside. The interior has five levels, and an elevator takes you to a viewing floor in the Buddha’s chest, 85 meters above the ground. On clear days, the official site says you may see Tokyo Skytree or Mount Fuji.',
      'This guide uses only what we could confirm with the Daibutsu’s official site and Ushiku City.',
    ],
    routeChain: {
      label: 'The route at a glance',
      steps: [
        { place: 'Central Tokyo', note: 'JR Joban Line, about 50 min (Ushiku City)' },
        { place: 'JR Ushiku Station', note: 'East Exit, bus stop No. 2' },
        { place: 'Bus, about 20–30 min', note: 'get off at “Ushiku Daibutsu”' },
        { place: 'Ushiku Daibutsu' },
      ],
    },
    quickAnswerLabel: 'Quick answers',
    quickAnswer: [
      { q: 'How much is it?', a: 'Full visit including the inside of the Buddha: ¥900 for adults (junior high and older), ¥500 for children (age 4 to elementary school). Garden only: ¥600 / ¥400. Age 3 and under: free. Prices are the same all year.' },
      { q: 'What are the hours?', a: 'Opens at 9:30. Closes at 16:30 from October to February. From March to September it closes at 17:00 on weekdays and 17:30 on weekends and holidays. Open every day.' },
      { q: 'What is the last entry?', a: 'Tickets that include the inside stop selling 45 minutes before closing (15:45 in October–February). Garden tickets stop 30 minutes before closing.' },
      { q: 'Is it free at New Year?', a: 'Yes. The official site says admission is free from January 1 to 3, 2027, with New Year visits from 9:30 to 16:00. The New Year’s Eve fireworks for 2026 are cancelled.' },
      { q: 'Can I bring my dog?', a: 'Not into the Buddha or the Pure Land garden.' },
    ],
    sections: [
      {
        id: 'getting-there',
        heading: 'How to get there from Tokyo',
        body: [
          'Ushiku City describes the city as about 50 minutes from central Tokyo. The nearest station is JR Ushiku Station on the Joban Line.',
        ],
        table: [
          ['Bus', 'From Ushiku Station East Exit, bus stop No. 2, take a bus bound for “Ushiku Daibutsu / Ushiku Joen” or “Ami Premium Outlets,” and get off at “Ushiku Daibutsu.” About 20–30 minutes. The official access page lists the fare as ¥560; check the fare for your bus with Kanto Railway.'],
          ['Taxi', 'About 15 minutes from Ushiku Station East Exit or Arakawaoki Station East Exit.'],
          ['By car', 'About 2 km (3 minutes) from Ami-Higashi IC on the Ken-O Expressway. Parking is free, with 820 spaces.'],
        ],
      },
      {
        id: 'inside',
        heading: 'Inside the Buddha',
        body: [
          'The visit inside follows five levels. You start in “the World of Light,” a dark room that represents worldly desires, until a door opens on a single beam of light. Other levels include a hall for hand-copying sutras with about 77 seats (from ¥500 extra), a golden room surrounded by about 3,400 small Buddha statues where sutras are read morning and evening, and a room that holds Buddhist relics.',
          'The viewing floor is in the Buddha’s chest, 85 meters up, with views in all four directions.',
        ],
      },
      {
        id: 'timing',
        heading: 'When to go',
        body: [
          'Prices stay the same all year, but closing time changes. In October to February the site closes at 16:30, and tickets that include the inside stop at 15:45. If you are coming from Tokyo in winter, aim to arrive by early afternoon.',
        ],
      },
      {
        id: 'new-year',
        heading: 'New Year 2026–2027',
        body: [
          'The official site says the midnight fireworks on December 31, 2026 are cancelled, to comply with laws on the use of fire and out of consideration for neighbours. The gate opens at 23:00 on New Year’s Eve and closes at 1:00 on New Year’s Day, with year-end and New Year services.',
          'From January 1 to 3, 2027, New Year visits are open from 9:30 to 16:00, and admission is free.',
        ],
      },
    ],
    faqLabel: 'FAQ',
    faq: [
      { q: 'How tall is Ushiku Daibutsu?', a: '120 meters. Guinness World Records registered it in 1995 as the tallest bronze Buddha statue.' },
      { q: 'Can you go inside?', a: 'Yes, with the full ticket (¥900 for adults). It has five levels and a viewing floor at 85 meters.' },
      { q: 'How long should I plan?', a: 'Allow time for the bus each way (about 20–30 minutes) and the closing time, which is 16:30 from October to February.' },
      { q: 'Is it a day trip from Tokyo?', a: 'Yes. Ushiku City describes the city as about 50 minutes from central Tokyo.' },
      { q: 'Is parking free?', a: 'Yes. The official site lists free parking for 820 cars.' },
    ],
    sourcesLabel: 'Sources',
    sources: [
      { label: 'Ushiku Daibutsu — About the Daibutsu (official, Japanese)', url: ABOUT_URL },
      { label: 'Ushiku Daibutsu — Admission and hours (official, Japanese)', url: FEE_URL },
      { label: 'Ushiku Daibutsu — Access (official, Japanese)', url: ACCESS_URL },
      { label: 'Ushiku Daibutsu — Official news, New Year 2027 (Japanese)', url: TOP_URL },
      { label: 'Ushiku City — City guide with access (PDF, Japanese)', url: CITY_ACCESS_URL },
    ],
    updatedLabel: 'Last updated',
    updatedDate: UPDATED,
    authorLabel: 'Written by',
    author: 'IBATOCO Editorial Team',
    disclaimer: 'Fees, hours and timetables can change. Please check the official websites before you travel.',
    related: {
      label: 'Read next',
      items: [
        { title: 'Kairakuen Plum Blossoms: Mito Plum Festival 2027 Guide', text: 'Further up the same Joban Line, Mito’s plum garden blooms in February and March.', href: '/en/kairakuen-plum-blossoms/' },
        { title: 'How to Get to Hitachi Seaside Park from Tokyo', text: 'The flower hill on the coast, also on the Joban Line.', href: '/en/hitachi-seaside-park-from-tokyo/' },
      ],
    },
    place: { name: 'Ushiku Daibutsu', address: 'Ushiku, Ibaraki, Japan', url: TOP_URL },
  },

  'zh-tw': {
    slug: 'ushiku-daibutsu',
    translationKey: 'ushiku-daibutsu',
    title: '牛久大佛怎麼去？120公尺巨大佛像的門票、開放時間與東京交通攻略',
    description: '茨城縣的牛久大佛高120公尺，可以進入佛像內部，胸部85公尺處有展望台。整理門票、各季節開放時間與最後受理時間、2027年1月1～3日免費參拜，以及從JR牛久站搭巴士的走法。',
    h1: '牛久大佛：可以走進去的120公尺大佛',
    lead: [
      '牛久大佛是位於茨城縣南部牛久市的阿彌陀如來立像，高120公尺。1995年以「世界最高的青銅製佛像」登錄金氏世界紀錄。高度取自阿彌陀如來的「十二光明」。',
      '佛像可以入內參觀。內部分為5層，搭電梯可到佛像胸部、離地85公尺的展望台。官方表示天氣好時有機會看到晴空塔或富士山。',
      '本篇只寫能在牛久大佛官網與牛久市資料確認的內容。',
    ],
    routeChain: {
      label: '路線一次看懂',
      steps: [
        { place: '東京市中心', note: 'JR常磐線，約50分鐘（牛久市說明）' },
        { place: 'JR牛久站', note: '東口2號乘車處' },
        { place: '巴士約20～30分鐘', note: '在「牛久大仏」下車' },
        { place: '牛久大佛' },
      ],
    },
    quickAnswerLabel: '快速重點',
    quickAnswer: [
      { q: '門票多少？', a: '含佛像內部的全套參觀：大人（國中生以上）900日圓，兒童（4歲～國小）500日圓。只逛庭園：600／400日圓。3歲以下免費。全年票價相同。' },
      { q: '開放時間？', a: '9:30開園。10～2月16:30閉園；3～9月平日17:00、週末與假日17:30閉園。全年無休。' },
      { q: '最後受理時間？', a: '含內部的票在閉園前45分鐘停售（10～2月為15:45），庭園票在閉園前30分鐘停售。' },
      { q: '新年免費嗎？', a: '是的。官網表示2027年1月1日至3日免費參拜，時間9:30～16:00。2026年除夕的煙火已取消。' },
      { q: '可以帶狗嗎？', a: '佛像內部與淨土庭園不可攜帶寵物。' },
    ],
    sections: [
      {
        id: 'getting-there',
        heading: '從東京怎麼去',
        body: [
          '牛久市介紹「距離東京市中心約50分鐘」。最近的車站是JR常磐線的牛久站。',
        ],
        table: [
          ['巴士', '從牛久站東口2號乘車處，搭往「牛久大仏・牛久浄苑」或「あみプレミアムアウトレット」的巴士，在「牛久大仏」下車，約20～30分鐘。官方交通頁標示票價560日圓，實際搭乘班次的票價請向關東鐵道確認。'],
          ['計程車', '從牛久站東口或荒川沖站東口約15分鐘。'],
          ['自駕', '圈央道阿見東IC約2公里（約3分鐘）。停車場免費，共820個車位。'],
        ],
      },
      {
        id: 'inside',
        heading: '佛像內部',
        body: [
          '內部參觀共5層。從代表煩惱的黑暗空間「光的世界」開始，門一打開會看到一道象徵慈悲的光。其他樓層包括約77個座位的抄經空間（另付500日圓起）、被約3,400尊小佛像環繞的金色空間（早晚誦經），以及安置佛舍利的房間。',
          '展望台在佛像胸部、離地85公尺，可以眺望四方。',
        ],
      },
      {
        id: 'timing',
        heading: '什麼時候去',
        body: [
          '全年票價相同，但閉園時間會變。10～2月16:30閉園，含內部的票15:45停售。冬天從東京出發，建議中午過後不久就抵達。',
        ],
      },
      {
        id: 'new-year',
        heading: '2026～2027年跨年',
        body: [
          '官網表示，為遵守用火相關法令並顧及鄰近居民，2026年12月31日午夜的煙火取消。除夕23:00開門、元旦1:00關門，期間有歲末與新春法會。',
          '2027年1月1日至3日，新年參拜時間9:30～16:00，免費參拜。',
        ],
      },
    ],
    faqLabel: '常見問題',
    faq: [
      { q: '牛久大佛有多高？', a: '120公尺。1995年登錄金氏世界紀錄，為世界最高的青銅製佛像。' },
      { q: '可以進去嗎？', a: '可以，買全套票（大人900日圓）即可。內部有5層，85公尺處有展望台。' },
      { q: '要安排多少時間？', a: '來回巴士各約20～30分鐘，並注意10～2月16:30閉園。' },
      { q: '可以從東京當天來回嗎？', a: '可以。牛久市介紹距離東京市中心約50分鐘。' },
      { q: '停車免費嗎？', a: '免費。官網標示有820個免費車位。' },
    ],
    sourcesLabel: '資料來源',
    sources: [
      { label: '牛久大佛｜大佛介紹（官方，日文）', url: ABOUT_URL },
      { label: '牛久大佛｜門票與開放時間（官方，日文）', url: FEE_URL },
      { label: '牛久大佛｜交通（官方，日文）', url: ACCESS_URL },
      { label: '牛久大佛｜官方最新消息・2027新年（日文）', url: TOP_URL },
      { label: '牛久市｜城市介紹與交通（PDF，日文）', url: CITY_ACCESS_URL },
    ],
    updatedLabel: '最後更新',
    updatedDate: UPDATED,
    authorLabel: '撰文',
    author: 'IBATOCO 編輯部',
    disclaimer: '票價、開放時間與班次可能變動，出發前請務必確認官方網站。',
    related: {
      label: '延伸閱讀',
      items: [
        { title: '偕樂園賞梅：2027水戶梅花祭攻略', text: '沿著同一條常磐線往北，水戶的梅花在2～3月盛開。', href: '/zh-tw/kairakuen-plum-blossoms/' },
        { title: '國營常陸海濱公園怎麼去？從東京出發完整攻略', text: '同樣在常磐線上的海岸花海山丘。', href: '/zh-tw/hitachi-seaside-park-from-tokyo/' },
      ],
    },
    place: { name: '牛久大佛', address: '日本茨城縣牛久市', url: TOP_URL },
  },

  ko: {
    slug: 'ushiku-daibutsu',
    translationKey: 'ushiku-daibutsu',
    title: '우시쿠 대불 가는 법: 120m 거대 불상의 입장료·운영 시간·도쿄에서 가는 길',
    description: '이바라키현의 우시쿠 대불은 높이 120m로, 불상 안으로 들어가 85m 높이의 전망층까지 올라갈 수 있습니다. 입장료, 계절별 운영 시간과 마감, 2027년 1월 1~3일 무료 참배, JR 우시쿠역에서 버스로 가는 법을 정리했습니다.',
    h1: '우시쿠 대불: 안으로 걸어 들어가는 120m 불상',
    lead: [
      '우시쿠 대불은 이바라키현 남부 우시쿠시에 있는 아미타여래 입상으로, 높이가 120m입니다. 1995년 ‘세계에서 가장 높은 청동 불상’으로 기네스 세계 기록에 등록되었습니다. 높이는 아미타여래의 ‘열두 가지 광명’에서 따왔습니다.',
      '불상 안에 들어갈 수 있습니다. 내부는 5층으로 나뉘고, 엘리베이터로 불상 가슴 부분, 지상 85m의 전망층까지 올라갑니다. 공식 사이트는 날씨가 좋으면 스카이트리나 후지산이 보일 수 있다고 안내합니다.',
      '이 글은 우시쿠 대불 공식 사이트와 우시쿠시 자료로 확인한 내용만 담았습니다.',
    ],
    routeChain: {
      label: '한눈에 보는 경로',
      steps: [
        { place: '도쿄 도심', note: 'JR 조반선, 약 50분(우시쿠시 안내)' },
        { place: 'JR 우시쿠역', note: '동쪽 출구 2번 승강장' },
        { place: '버스 약 20~30분', note: '‘우시쿠다이부쓰’에서 하차' },
        { place: '우시쿠 대불' },
      ],
    },
    quickAnswerLabel: '핵심 요약',
    quickAnswer: [
      { q: '입장료는?', a: '불상 내부를 포함한 전체 관람: 어른(중학생 이상) 900엔, 어린이(4세~초등학생) 500엔. 정원만: 600엔/400엔. 3세 이하 무료. 1년 내내 같은 요금입니다.' },
      { q: '운영 시간은?', a: '9:30 개원. 10~2월은 16:30 폐원, 3~9월은 평일 17:00·주말과 공휴일 17:30 폐원. 연중무휴.' },
      { q: '입장 마감은?', a: '내부 포함 티켓은 폐원 45분 전(10~2월은 15:45), 정원 티켓은 폐원 30분 전에 판매를 마칩니다.' },
      { q: '새해에는 무료인가요?', a: '네. 공식 사이트는 2027년 1월 1~3일 9:30~16:00 새해 참배를 무료로 안내합니다. 2026년 섣달그믐 불꽃놀이는 취소되었습니다.' },
      { q: '반려견을 데려갈 수 있나요?', a: '불상 내부와 정토 정원에는 들어갈 수 없습니다.' },
    ],
    sections: [
      {
        id: 'getting-there',
        heading: '도쿄에서 가는 법',
        body: [
          '우시쿠시는 ‘도심까지 약 50분’이라고 소개합니다. 가장 가까운 역은 JR 조반선 우시쿠역입니다.',
        ],
        table: [
          ['버스', '우시쿠역 동쪽 출구 2번 승강장에서 ‘우시쿠다이부쓰·우시쿠조엔’행 또는 ‘아미 프리미엄 아웃렛’행 버스를 타고 ‘우시쿠다이부쓰’에서 내립니다. 약 20~30분. 공식 교통 안내에는 요금이 560엔으로 적혀 있으니, 타는 버스의 요금은 간토철도에서 확인하세요.'],
          ['택시', '우시쿠역 동쪽 출구 또는 아라카와오키역 동쪽 출구에서 약 15분.'],
          ['자동차', '겐오 자동차도 아미히가시 IC에서 약 2km(약 3분). 주차장은 무료이며 820대 규모입니다.'],
        ],
      },
      {
        id: 'inside',
        heading: '불상 내부',
        body: [
          '내부는 5층을 따라 둘러봅니다. 번뇌를 상징하는 어두운 공간 ‘빛의 세계’에서 시작해, 문이 열리면 자비를 상징하는 한 줄기 빛이 보입니다. 이 밖에 약 77석의 사경 공간(별도 500엔부터), 약 3,400체의 작은 불상에 둘러싸인 금빛 공간(아침저녁 독경), 불사리를 모신 방이 있습니다.',
          '전망층은 불상 가슴 부분, 지상 85m에 있어 사방을 내려다볼 수 있습니다.',
        ],
      },
      {
        id: 'timing',
        heading: '언제 갈까',
        body: [
          '요금은 1년 내내 같지만 폐원 시간이 바뀝니다. 10~2월은 16:30에 문을 닫고, 내부 포함 티켓은 15:45에 판매를 마칩니다. 겨울에 도쿄에서 간다면 이른 오후까지 도착하도록 계획하세요.',
        ],
      },
      {
        id: 'new-year',
        heading: '2026~2027년 연말연시',
        body: [
          '공식 사이트에 따르면 2026년 12월 31일 자정 불꽃놀이는 불 사용에 관한 법령 준수와 이웃 주민을 배려해 취소되었습니다. 섣달그믐 23:00에 문을 열고 새해 1:00에 닫으며, 연말·새해 법회가 열립니다.',
          '2027년 1월 1~3일에는 9:30~16:00 새해 참배가 무료입니다.',
        ],
      },
    ],
    faqLabel: '자주 묻는 질문',
    faq: [
      { q: '우시쿠 대불의 높이는?', a: '120m입니다. 1995년 세계에서 가장 높은 청동 불상으로 기네스 세계 기록에 등록되었습니다.' },
      { q: '안에 들어갈 수 있나요?', a: '네, 전체 관람권(어른 900엔)으로 들어갈 수 있습니다. 내부는 5층이고 85m에 전망층이 있습니다.' },
      { q: '시간은 얼마나 잡아야 하나요?', a: '버스로 편도 약 20~30분이 걸리고, 10~2월은 16:30에 문을 닫는 점을 감안하세요.' },
      { q: '도쿄에서 당일치기가 되나요?', a: '됩니다. 우시쿠시는 도심까지 약 50분이라고 소개합니다.' },
      { q: '주차는 무료인가요?', a: '네. 공식 사이트에 무료 주차 820대로 안내되어 있습니다.' },
    ],
    sourcesLabel: '출처',
    sources: [
      { label: '우시쿠 대불｜대불 소개(공식, 일본어)', url: ABOUT_URL },
      { label: '우시쿠 대불｜입장료·운영 시간(공식, 일본어)', url: FEE_URL },
      { label: '우시쿠 대불｜교통(공식, 일본어)', url: ACCESS_URL },
      { label: '우시쿠 대불｜공식 새 소식·2027 새해(일본어)', url: TOP_URL },
      { label: '우시쿠시｜도시 안내·교통(PDF, 일본어)', url: CITY_ACCESS_URL },
    ],
    updatedLabel: '최종 업데이트',
    updatedDate: UPDATED,
    authorLabel: '작성',
    author: 'IBATOCO 편집부',
    disclaimer: '요금과 운영 시간, 교통 시간표는 변경될 수 있습니다. 출발 전 공식 사이트에서 확인해 주세요.',
    related: {
      label: '이어서 읽기',
      items: [
        { title: '가이라쿠엔 매화: 2027 미토 매화 축제 가이드', text: '같은 조반선을 따라 북쪽으로, 미토의 매화는 2~3월에 핍니다.', href: '/ko/kairakuen-plum-blossoms/' },
        { title: '도쿄에서 히타치 해변공원 가는 법', text: '같은 조반선에 있는 해안의 꽃 언덕.', href: '/ko/hitachi-seaside-park-from-tokyo/' },
      ],
    },
    place: { name: '우시쿠 대불', address: '일본 이바라키현 우시쿠시', url: TOP_URL },
  },
};
