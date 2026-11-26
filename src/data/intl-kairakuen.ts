/**
 * 偕楽園の梅と水戸の梅まつり（英語・繁體中文・한국어）。
 *
 * なぜこのページか:
 *  海外の検索は "Kairakuen plum blossom" "Mito plum festival" "plum blossoms near Tokyo" で来る。
 *  桜より前の2〜3月に東京から日帰りできる花の行き先として出す。
 *  梅まつり期間は入園料が上がり、県民無料・朝9時まで無料の対象外になるため、
 *  「いつ行くといくらか」を正確に出すことが差別化になる。
 *
 * 事実の扱い（2026-11-26 に公式サイトで再確認）:
 *  - 第131回 水戸の梅まつり 2027-02-11（木・祝）〜03-22（月・祝）、会場 偕楽園・弘道館、
 *    偕楽園 約100品種3,000本・弘道館 約60品種800本、開花状況は1月下旬から … mitokoumon.com/ume/
 *  - まつり期間の偕楽園 6:00〜19:00・大人500円/小中学生250円/70歳以上250円、
 *    弘道館 9:00〜17:00・大人420円/小中学生210円/70歳以上210円、
 *    UME The Lights 2027 は2月12日（金）から金・土・日・祝日と2月22日（月）、18:00〜20:30（最終入場20:00）、
 *    前売 高校生以上800円・当日1,000円、小学生未満無料、前売は2027年1月以降 … mitokoumon.com/ume/ume_event.html
 *  - UME The Lights の終了日は公式に「3月15日（日）」とあるが、2027-03-15 は月曜日で日付と曜日が合わない。
 *    確定の日付として書かない（日本語記事 mito-ume-matsuri-2027 と同じ扱い）。
 *  - 昼に入園していても UME The Lights は17時にいったん退園しチケットが必要 … 日本語記事（2026-11-10 確認）
 *  - 水戸駅北口4番（茨城交通）・6番（関東鉄道）から偕楽園方面バス約20分、
 *    弘道館は水戸駅北口から徒歩約8分（坂道あり）、偕楽園臨時駅は未定 … mitokoumon.com/ume/ume_acc.html
 *  - 通常時の入園料 大人320円・小人160円・70歳以上160円、梅まつり期間を除き茨城県民無料・開門〜9時は無料、
 *    開園時間 2月中旬〜9月30日 6:00〜19:00 / 10月1日〜2月中旬 7:00〜18:00、
 *    好文亭 大人230円・休館 12/29〜31 … ibaraki-kairakuen.jp/guide/
 *  - 東門は改修工事のため2026-11-06から使えず仮設入園ゲート、工事は2027年2月まで予定 … 偕楽園お知らせ（2026-11-10 確認）
 *  - 特急ひたち1号 上野7:00発→水戸8:13着、ひたち18号 水戸15:27発→上野16:36着 … JR東日本 時刻表（2026-11-03 確認）
 *  - 運賃（JR・バス）は書かない。公式の金額をこのページ用に確認していないため。
 *  - 開花の見頃の予想はしない。公式の開花状況は1月下旬から掲載。
 *  - 写真は載せない（海外ガイドは自前写真のみの方針）。
 *  直訳はしない。市場ごとに導入・強調点を変える。
 *  2027年の梅まつりが終わったら（3月下旬）、翌年の日程・料金に更新するか、通年の内容に書き換える。
 */
import type { IntlGuide } from './intl-guides';
import type { Locale } from './i18n';

const UME_URL = 'https://mitokoumon.com/ume/';
const UME_EVENT_URL = 'https://mitokoumon.com/ume/ume_event.html';
const UME_ACCESS_URL = 'https://mitokoumon.com/ume/ume_acc.html';
const KAIRAKUEN_URL = 'https://ibaraki-kairakuen.jp/';
const KAIRAKUEN_GUIDE_URL = 'https://ibaraki-kairakuen.jp/guide/';
const UPDATED = '2026-11-26';

export const KAIRAKUEN_PLUM: Record<Exclude<Locale, 'ja'>, IntlGuide> = {
  en: {
    slug: 'kairakuen-plum-blossoms',
    translationKey: 'kairakuen-plum-blossoms',
    title: 'Kairakuen Plum Blossoms 2027: Mito Plum Festival Dates, Tickets & Access from Tokyo',
    description: 'The 2027 Mito Plum Festival runs February 11 – March 22 at Kairakuen and Kodokan. Festival-period tickets, opening hours, the evening illumination, and how to get there from Tokyo by train and bus.',
    h1: 'Kairakuen Plum Blossoms: Mito Plum Festival 2027 Guide',
    lead: [
      'Before the cherry blossoms, Japan has plum blossoms. One of the best places to see them near Tokyo is Kairakuen, a garden in Mito with about 3,000 plum trees of around 100 varieties.',
      'The 131st Mito Plum Festival runs from February 11 to March 22, 2027, at Kairakuen and at Kodokan, the former domain school, which has about 800 plum trees of its own.',
      'One thing to know: during the festival, Kairakuen’s ticket price goes up and the usual free-entry rules do not apply. This guide uses only what we could confirm with the festival organizer, the garden and JR East.',
    ],
    routeChain: {
      label: 'The route at a glance',
      steps: [
        { place: 'Ueno / Tokyo', note: 'JR Joban Line limited express' },
        { place: 'Mito Station', note: 'e.g. about 73 minutes from Ueno' },
        { place: 'North Exit bus stop No. 4 or 6', note: 'about 20 minutes' },
        { place: 'Kairakuen' },
      ],
    },
    quickAnswerLabel: 'Quick answers',
    quickAnswer: [
      { q: 'When is the 2027 festival?', a: 'February 11 (national holiday) to March 22, 2027, at Kairakuen and Kodokan. Both are open every day during the festival.' },
      { q: 'How much is Kairakuen during the festival?', a: '¥500 for adults, ¥250 for elementary and junior high students, and ¥250 for people aged 70 and over. Outside the festival, adults pay ¥320.' },
      { q: 'What are the hours?', a: 'During the festival, Kairakuen is open 6:00–19:00 and Kodokan 9:00–17:00.' },
      { q: 'When will the plums be at their best?', a: 'The organizer has not announced it yet. It starts posting bloom updates from late January. Plum varieties bloom early, mid and late season, so the flowering spreads over weeks.' },
      { q: 'How far is it from Tokyo?', a: 'The limited express from Ueno to Mito takes a little over an hour (e.g. Ueno 7:00 → Mito 8:13), then about 20 minutes by bus.' },
    ],
    sections: [
      {
        id: 'getting-there',
        heading: 'How to get there from Tokyo',
        body: [
          'Take the JR Joban Line limited express (Hitachi or Tokiwa) from Ueno, Tokyo or Shinagawa to Mito. All seats are reserved. In JR East’s November 2026 timetable, the Hitachi 1 leaves Ueno at 7:00 and arrives at Mito at 8:13. For the way back, the Hitachi 18 leaves Mito at 15:27 and reaches Ueno at 16:36.',
          'From Mito Station, buses go to Kairakuen from the North Exit bus terminal.',
        ],
        table: [
          ['Bus stop No. 4 (Ibaraki Kotsu)', 'Buses bound for Rekishikan / Kairakuen, about 20 minutes. For the Kobuntei main gate, get off at “Kobuntei Omotemon Iriguchi” (about 5 minutes on foot). For the east side, get off at “Kairakuen Higashimon / Tokiwa Jinja Kitasando” or “Kairakuen / Tokiwa Jinja-mae” (3 minutes on foot).'],
          ['Bus stop No. 6 (Kanto Railway)', 'Buses bound for Kairakuen, about 20 minutes. Get off at the last stop, “Kairakuen,” then walk 5 minutes.'],
          ['To Kodokan', 'About 8 minutes on foot from Mito Station North Exit. There is a slope on the way.'],
          ['Festival-only station', 'In some years a temporary JR station opens next to Kairakuen during the festival. For 2027, the organizer says details will be posted once decided.'],
        ],
      },
      {
        id: 'tickets',
        heading: 'Tickets and hours during the festival',
        body: [
          'Kairakuen and Kodokan charge separately. During the festival, Kairakuen’s free-entry rules (free for Ibaraki residents, and free for everyone before 9:00) do not apply.',
        ],
        table: [
          ['Kairakuen — adults', '¥500 (groups of 20+: ¥380)'],
          ['Kairakuen — elementary and junior high students', '¥250 (groups: ¥190)'],
          ['Kairakuen — aged 70 and over', '¥250'],
          ['Kairakuen — hours', '6:00–19:00 during the festival'],
          ['Kodokan — adults', '¥420 (groups of 20+: ¥320)'],
          ['Kodokan — elementary and junior high students / aged 70 and over', '¥210'],
          ['Kodokan — hours', '9:00–17:00 during the festival'],
          ['Kobuntei (the villa inside Kairakuen)', 'Separate fee: ¥230 for adults'],
        ],
      },
      {
        id: 'east-gate',
        heading: 'Note: the East Gate is under repair',
        body: [
          'Since November 6, 2026, Kairakuen’s East Gate has been closed for repair work, and visitors enter through a temporary gate about 50 meters to the north. The work is planned to finish in February 2027, but it may move earlier or later. Check the garden’s official news before you go.',
        ],
      },
      {
        id: 'night',
        heading: 'At night: UME The Lights 2027',
        body: [
          'The evening illumination “Kairakuen UME The Lights 2027” starts on Friday, February 12, and runs on Fridays, Saturdays, Sundays and national holidays, plus Monday, February 22, from 18:00 to 20:30 (last entry 20:00).',
          'Tickets are separate from daytime admission: ¥800 in advance or ¥1,000 on the day for high school age and older, and ¥400 / ¥500 for elementary and junior high students. Children under elementary school age are free. Advance tickets go on sale from January 2027. If you visited during the day, you need to leave at 17:00 and come back in with a night ticket.',
          'The official site lists the last day as “March 15 (Sun),” but March 15, 2027 is a Monday. We have not printed an end date until the organizer corrects it.',
        ],
      },
      {
        id: 'outside-festival',
        heading: 'Visiting outside the festival',
        body: [
          'Outside the festival, Kairakuen’s main garden costs ¥320 for adults and is free for everyone from opening time until 9:00. From October 1 to mid-February it opens at 7:00, so an early arrival is free. Areas outside the main garden are always open.',
        ],
      },
    ],
    faqLabel: 'FAQ',
    faq: [
      { q: 'Is Kairakuen free before 9:00 during the plum festival?', a: 'No. Free entry before 9:00, and free entry for Ibaraki residents, apply only outside the festival period.' },
      { q: 'When is the best time to see the plum blossoms?', a: 'It depends on the year, and the organizer has not announced 2027 timing yet. Bloom updates start in late January on the festival’s official site.' },
      { q: 'Can I see Kairakuen and Kodokan in one day?', a: 'Yes. Kodokan is about 8 minutes on foot from Mito Station, and Kairakuen is about 20 minutes by bus. They charge separately.' },
      { q: 'Is the night illumination included in the daytime ticket?', a: 'No. UME The Lights needs its own ticket, and daytime visitors leave at 17:00 before the evening session.' },
      { q: 'Is it a day trip from Tokyo?', a: 'Yes. The limited express to Mito takes a little over an hour from Ueno, so it is one of the easiest flower trips from Tokyo.' },
    ],
    sourcesLabel: 'Sources',
    sources: [
      { label: 'Mito Plum Festival official site (Japanese)', url: UME_URL },
      { label: 'Mito Plum Festival — Events and fees (Japanese)', url: UME_EVENT_URL },
      { label: 'Mito Plum Festival — Access (Japanese)', url: UME_ACCESS_URL },
      { label: 'Kairakuen official site — Visitor guide and fees (Japanese)', url: KAIRAKUEN_GUIDE_URL },
    ],
    updatedLabel: 'Last updated',
    updatedDate: UPDATED,
    authorLabel: 'Written by',
    author: 'IBATOCO Editorial Team',
    disclaimer: 'Dates, fees, hours and timetables can change. Please check the official websites before you travel.',
    related: {
      label: 'Read next',
      items: [
        { title: 'Fukuroda Falls: A Day Trip from Tokyo', text: 'Change at Mito for the Suigun Line to reach this four-tier waterfall in the mountains.', href: '/en/fukuroda-falls/' },
        { title: 'How to Get to Hitachi Seaside Park from Tokyo', text: 'The flower hill on the coast, reached from Katsuta Station, just past Mito on the Joban Line.', href: '/en/hitachi-seaside-park-from-tokyo/' },
      ],
    },
    place: { name: 'Kairakuen', address: '1-3-3 Tokiwacho, Mito, Ibaraki, Japan', url: KAIRAKUEN_URL },
  },

  'zh-tw': {
    slug: 'kairakuen-plum-blossoms',
    translationKey: 'kairakuen-plum-blossoms',
    title: '2027水戶梅花祭｜偕樂園賞梅期間、門票、夜間點燈與東京交通攻略',
    description: '第131回水戶梅花祭於2027年2月11日至3月22日在偕樂園與弘道館舉行。整理梅花祭期間門票、開放時間、夜間點燈「UME The Lights」，以及從東京搭電車與巴士的走法。依官方資料查證。',
    h1: '偕樂園賞梅：2027水戶梅花祭攻略',
    lead: [
      '櫻花之前，日本先開的是梅花。離東京不遠的賞梅名所之一，就是水戶的偕樂園：園內約有100個品種、3,000棵梅樹。',
      '第131回水戶梅花祭將於2027年2月11日至3月22日舉行，會場是偕樂園，以及水戶藩的藩校「弘道館」（約800棵梅樹）。',
      '要特別注意：梅花祭期間偕樂園門票會調漲，平常的免費入園規定也不適用。本篇只寫能在主辦單位、偕樂園與JR東日本官方資料確認的內容。',
    ],
    routeChain: {
      label: '路線一次看懂',
      steps: [
        { place: '上野／東京', note: 'JR常磐線特急' },
        { place: '水戶站', note: '例：上野出發約73分鐘' },
        { place: '北口4號或6號乘車處', note: '巴士約20分鐘' },
        { place: '偕樂園' },
      ],
    },
    quickAnswerLabel: '快速重點',
    quickAnswer: [
      { q: '2027年梅花祭是什麼時候？', a: '2027年2月11日（國定假日）至3月22日，會場為偕樂園與弘道館，期間每天開放。' },
      { q: '梅花祭期間偕樂園門票多少？', a: '大人500日圓，國小・國中生250日圓，70歲以上250日圓。梅花祭以外的期間大人320日圓。' },
      { q: '開放時間？', a: '梅花祭期間偕樂園6:00～19:00，弘道館9:00～17:00。' },
      { q: '什麼時候最好看？', a: '主辦單位尚未公布。1月下旬起會在官網更新開花狀況。梅花有早開、中開、晚開的品種，花期會延續好幾週。' },
      { q: '從東京要多久？', a: '上野搭特急到水戶一個多小時（例：上野7:00→水戶8:13），再搭巴士約20分鐘。' },
    ],
    sections: [
      {
        id: 'getting-there',
        heading: '從東京怎麼去',
        body: [
          '從上野、東京或品川搭JR常磐線特急（常陸號・常磐號）到水戶，全車對號座。依JR東日本2026年11月時刻表，常陸1號上野7:00發、水戶8:13到；回程常陸18號水戶15:27發、上野16:36到。',
          '從水戶站北口巴士總站搭車前往偕樂園。',
        ],
        table: [
          ['北口4號乘車處（茨城交通）', '搭往「歷史館・偕樂園方面」的巴士約20分鐘。走好文亭表門在「好文亭表門入口」下車（步行約5分）；走東側在「偕楽園東門・常磐神社北参道」或「偕楽園・常磐神社前」下車（步行3分）。'],
          ['北口6號乘車處（關東鐵道）', '搭往「偕樂園」的巴士約20分鐘，在終點下車後步行5分。'],
          ['前往弘道館', '水戶站北口步行約8分鐘，途中有坡道。'],
          ['梅花祭限定車站', '部分年份梅花祭期間會開設偕樂園臨時站。2027年主辦單位表示「決定後公布」。'],
        ],
      },
      {
        id: 'tickets',
        heading: '梅花祭期間的門票與時間',
        body: [
          '偕樂園與弘道館分開收費。梅花祭期間，偕樂園平常的免費規定（茨城縣民免費、開門至9點前免費）不適用。',
        ],
        table: [
          ['偕樂園 大人', '500日圓（20人以上團體380日圓）'],
          ['偕樂園 國小・國中生', '250日圓（團體190日圓）'],
          ['偕樂園 70歲以上', '250日圓'],
          ['偕樂園 開放時間', '梅花祭期間 6:00～19:00'],
          ['弘道館 大人', '420日圓（20人以上團體320日圓）'],
          ['弘道館 國小・國中生／70歲以上', '210日圓'],
          ['弘道館 開放時間', '梅花祭期間 9:00～17:00'],
          ['好文亭（偕樂園內的建築）', '另外收費：大人230日圓'],
        ],
      },
      {
        id: 'east-gate',
        heading: '注意：東門整修中',
        body: [
          '偕樂園東門自2026年11月6日起因整修工程封閉，改由東門北側約50公尺處的臨時入園口進入。工程預計2027年2月完成，可能提前或延後，出發前請查看偕樂園官網的最新消息。',
        ],
      },
      {
        id: 'night',
        heading: '夜晚：UME The Lights 2027',
        body: [
          '夜間點燈「偕樂園 UME The Lights 2027」自2月12日（五）起，於週五、六、日、國定假日及2月22日（一）舉行，時間18:00～20:30（最後入場20:00）。',
          '門票與白天分開：高中生以上預售800日圓、當日1,000日圓，國小・國中生400／500日圓，未上小學免費。預售票2027年1月起開賣。白天已入園的人需在17:00先離場，再購買夜間票入場。',
          '官網寫的最後一天是「3月15日（日）」，但2027年3月15日是星期一。主辦單位更正前，本篇不寫結束日期。',
        ],
      },
      {
        id: 'outside-festival',
        heading: '梅花祭以外的時期',
        body: [
          '梅花祭以外，偕樂園本園大人320日圓，從開門到上午9點前任何人都免費。10月1日至2月中旬7:00開門，早點到就能免費入園。本園以外的區域全天開放。',
        ],
      },
    ],
    faqLabel: '常見問題',
    faq: [
      { q: '梅花祭期間9點前也免費嗎？', a: '不免費。9點前免費與茨城縣民免費，都只適用於梅花祭以外的期間。' },
      { q: '什麼時候賞梅最好？', a: '每年不同，2027年主辦單位尚未公布。1月下旬起官網會更新開花狀況。' },
      { q: '偕樂園和弘道館一天逛得完嗎？', a: '可以。弘道館距水戶站步行約8分鐘，偕樂園搭巴士約20分鐘，兩處分開收費。' },
      { q: '夜間點燈包含在白天門票裡嗎？', a: '不包含。UME The Lights需要另購門票，白天入園者需在17:00先離場。' },
      { q: '可以從東京當天來回嗎？', a: '可以。上野搭特急到水戶一個多小時，是從東京出發最輕鬆的賞花行程之一。' },
    ],
    sourcesLabel: '資料來源',
    sources: [
      { label: '水戶梅花祭官方網站（日文）', url: UME_URL },
      { label: '水戶梅花祭｜活動與票價（日文）', url: UME_EVENT_URL },
      { label: '水戶梅花祭｜交通資訊（日文）', url: UME_ACCESS_URL },
      { label: '偕樂園官方網站｜參觀須知與票價（日文）', url: KAIRAKUEN_GUIDE_URL },
    ],
    updatedLabel: '最後更新',
    updatedDate: UPDATED,
    authorLabel: '撰文',
    author: 'IBATOCO 編輯部',
    disclaimer: '日期、票價、開放時間與班次可能變動，出發前請務必確認官方網站。',
    related: {
      label: '延伸閱讀',
      items: [
        { title: '袋田瀑布：從東京出發的交通、門票與冰瀑攻略', text: '在水戶轉乘水郡線，就能到山中的四段瀑布。', href: '/zh-tw/fukuroda-falls/' },
        { title: '國營常陸海濱公園怎麼去？從東京出發完整攻略', text: '海岸的花海山丘，在常磐線上水戶再過去一點的勝田站下車。', href: '/zh-tw/hitachi-seaside-park-from-tokyo/' },
      ],
    },
    place: { name: '偕樂園', address: '日本茨城縣水戶市常磐町1-3-3', url: KAIRAKUEN_URL },
  },

  ko: {
    slug: 'kairakuen-plum-blossoms',
    translationKey: 'kairakuen-plum-blossoms',
    title: '2027 미토 매화 축제: 가이라쿠엔 매화 기간·입장료·야간 라이트업·도쿄에서 가는 법',
    description: '제131회 미토 매화 축제는 2027년 2월 11일~3월 22일 가이라쿠엔과 고도칸에서 열립니다. 축제 기간 입장료와 운영 시간, 야간 라이트업 ‘UME The Lights’, 도쿄에서 전철·버스로 가는 법을 공식 정보로 정리했습니다.',
    h1: '가이라쿠엔 매화: 2027 미토 매화 축제 가이드',
    lead: [
      '일본은 벚꽃보다 매화가 먼저 핍니다. 도쿄에서 가까운 매화 명소 중 하나가 미토의 가이라쿠엔으로, 약 100품종 3,000그루의 매화나무가 있습니다.',
      '제131회 미토 매화 축제는 2027년 2월 11일부터 3월 22일까지 가이라쿠엔과, 미토번의 번교였던 고도칸(매화 약 800그루)에서 열립니다.',
      '꼭 알아 둘 점: 축제 기간에는 가이라쿠엔 입장료가 오르고, 평소의 무료 입장 규정도 적용되지 않습니다. 이 글은 주최 측, 가이라쿠엔, JR 동일본 공식 정보로 확인한 내용만 담았습니다.',
    ],
    routeChain: {
      label: '한눈에 보는 경로',
      steps: [
        { place: '우에노 / 도쿄', note: 'JR 조반선 특급' },
        { place: '미토역', note: '예: 우에노에서 약 73분' },
        { place: '북쪽 출구 4번 또는 6번 승강장', note: '버스 약 20분' },
        { place: '가이라쿠엔' },
      ],
    },
    quickAnswerLabel: '핵심 요약',
    quickAnswer: [
      { q: '2027년 축제는 언제?', a: '2027년 2월 11일(공휴일)~3월 22일. 가이라쿠엔과 고도칸에서 열리며 기간 중 매일 엽니다.' },
      { q: '축제 기간 가이라쿠엔 입장료는?', a: '어른 500엔, 초등·중학생 250엔, 70세 이상 250엔. 축제 기간 외에는 어른 320엔입니다.' },
      { q: '운영 시간은?', a: '축제 기간 가이라쿠엔 6:00~19:00, 고도칸 9:00~17:00.' },
      { q: '언제가 가장 예쁜가요?', a: '주최 측이 아직 발표하지 않았습니다. 1월 하순부터 공식 사이트에 개화 상황이 올라옵니다. 일찍·중간·늦게 피는 품종이 있어 꽃이 몇 주에 걸쳐 핍니다.' },
      { q: '도쿄에서 얼마나 걸려요?', a: '우에노에서 미토까지 특급으로 1시간 남짓(예: 우에노 7:00 → 미토 8:13), 그다음 버스로 약 20분입니다.' },
    ],
    sections: [
      {
        id: 'getting-there',
        heading: '도쿄에서 가는 법',
        body: [
          '우에노·도쿄·시나가와에서 JR 조반선 특급(히타치·도키와)을 타고 미토까지 갑니다. 전석 지정석입니다. JR 동일본 2026년 11월 시간표 기준으로 히타치 1호는 우에노 7:00 출발, 미토 8:13 도착입니다. 돌아올 때는 히타치 18호가 미토 15:27 출발, 우에노 16:36 도착입니다.',
          '미토역 북쪽 출구 버스터미널에서 가이라쿠엔행 버스를 탑니다.',
        ],
        table: [
          ['북쪽 출구 4번 승강장(이바라키교통)', '‘역사관·가이라쿠엔 방면’ 버스로 약 20분. 고분테이 정문으로 들어가려면 ‘고분테이오모테몬이리구치’에서 내려 도보 약 5분, 동쪽으로 들어가려면 ‘가이라쿠엔히가시몬·도키와진자키타산도’ 또는 ‘가이라쿠엔·도키와진자마에’에서 내려 도보 3분.'],
          ['북쪽 출구 6번 승강장(간토철도)', '‘가이라쿠엔행’ 버스로 약 20분. 종점 ‘가이라쿠엔’에서 내려 도보 5분.'],
          ['고도칸까지', '미토역 북쪽 출구에서 도보 약 8분. 가는 길에 언덕이 있습니다.'],
          ['축제 기간 한정 역', '해에 따라 축제 기간에 가이라쿠엔 임시역이 열립니다. 2027년은 주최 측이 ‘결정되는 대로 게재’한다고 밝혔습니다.'],
        ],
      },
      {
        id: 'tickets',
        heading: '축제 기간의 입장료와 시간',
        body: [
          '가이라쿠엔과 고도칸은 따로 요금을 받습니다. 축제 기간에는 가이라쿠엔의 평소 무료 규정(이바라키 현민 무료, 개문~오전 9시 무료)이 적용되지 않습니다.',
        ],
        table: [
          ['가이라쿠엔 어른', '500엔(20명 이상 단체 380엔)'],
          ['가이라쿠엔 초등·중학생', '250엔(단체 190엔)'],
          ['가이라쿠엔 70세 이상', '250엔'],
          ['가이라쿠엔 운영 시간', '축제 기간 6:00~19:00'],
          ['고도칸 어른', '420엔(20명 이상 단체 320엔)'],
          ['고도칸 초등·중학생 / 70세 이상', '210엔'],
          ['고도칸 운영 시간', '축제 기간 9:00~17:00'],
          ['고분테이(가이라쿠엔 안의 건물)', '별도 요금: 어른 230엔'],
        ],
      },
      {
        id: 'east-gate',
        heading: '주의: 동문 보수 공사 중',
        body: [
          '가이라쿠엔 동문은 2026년 11월 6일부터 보수 공사로 닫혀 있고, 동문에서 북쪽으로 약 50m 떨어진 임시 입구로 들어갑니다. 공사는 2027년 2월 완료 예정이지만 앞당겨지거나 늦어질 수 있습니다. 가기 전에 가이라쿠엔 공식 사이트의 새 소식을 확인하세요.',
        ],
      },
      {
        id: 'night',
        heading: '밤: UME The Lights 2027',
        body: [
          '야간 라이트업 ‘가이라쿠엔 UME The Lights 2027’은 2월 12일(금)부터 금·토·일·공휴일과 2월 22일(월)에 18:00~20:30(최종 입장 20:00)에 열립니다.',
          '낮 입장권과는 별도입니다. 고등학생 이상 예매 800엔·당일 1,000엔, 초등·중학생 400엔/500엔, 미취학 아동 무료. 예매는 2027년 1월부터 시작합니다. 낮에 입장했더라도 17:00에 한 번 나간 뒤 야간 티켓으로 다시 들어가야 합니다.',
          '공식 사이트에는 마지막 날이 ‘3월 15일(일)’로 적혀 있지만 2027년 3월 15일은 월요일입니다. 주최 측이 바로잡기 전까지 이 글에는 종료일을 적지 않았습니다.',
        ],
      },
      {
        id: 'outside-festival',
        heading: '축제 기간이 아닐 때',
        body: [
          '축제 기간 외에는 가이라쿠엔 본원이 어른 320엔이고, 개문부터 오전 9시까지는 누구나 무료입니다. 10월 1일~2월 중순은 7:00에 문을 열기 때문에 일찍 가면 무료로 들어갈 수 있습니다. 본원 이외의 구역은 항상 개방되어 있습니다.',
        ],
      },
    ],
    faqLabel: '자주 묻는 질문',
    faq: [
      { q: '축제 기간에도 오전 9시 전에는 무료인가요?', a: '아닙니다. 9시 전 무료와 이바라키 현민 무료는 축제 기간 외에만 적용됩니다.' },
      { q: '매화가 가장 예쁜 시기는?', a: '해마다 다르고, 2027년은 아직 발표되지 않았습니다. 1월 하순부터 축제 공식 사이트에 개화 상황이 올라옵니다.' },
      { q: '가이라쿠엔과 고도칸을 하루에 볼 수 있나요?', a: '가능합니다. 고도칸은 미토역에서 도보 약 8분, 가이라쿠엔은 버스로 약 20분입니다. 요금은 따로입니다.' },
      { q: '야간 라이트업은 낮 입장권에 포함되나요?', a: '포함되지 않습니다. UME The Lights는 별도 티켓이 필요하고, 낮 입장객은 17:00에 한 번 나가야 합니다.' },
      { q: '도쿄에서 당일치기가 되나요?', a: '됩니다. 우에노에서 미토까지 특급으로 1시간 남짓이라 도쿄에서 가장 가기 쉬운 꽃구경 중 하나입니다.' },
    ],
    sourcesLabel: '출처',
    sources: [
      { label: '미토 매화 축제 공식 사이트(일본어)', url: UME_URL },
      { label: '미토 매화 축제｜행사·요금 안내(일본어)', url: UME_EVENT_URL },
      { label: '미토 매화 축제｜교통 안내(일본어)', url: UME_ACCESS_URL },
      { label: '가이라쿠엔 공식 사이트｜이용 안내·요금(일본어)', url: KAIRAKUEN_GUIDE_URL },
    ],
    updatedLabel: '최종 업데이트',
    updatedDate: UPDATED,
    authorLabel: '작성',
    author: 'IBATOCO 편집부',
    disclaimer: '날짜, 요금, 운영 시간, 교통 시간표는 변경될 수 있습니다. 출발 전 공식 사이트에서 확인해 주세요.',
    related: {
      label: '이어서 읽기',
      items: [
        { title: '후쿠로다 폭포: 도쿄에서 가는 법과 겨울 얼음 폭포', text: '미토에서 스이군선으로 갈아타면 산속의 4단 폭포에 갈 수 있습니다.', href: '/ko/fukuroda-falls/' },
        { title: '도쿄에서 히타치 해변공원 가는 법', text: '해안의 꽃 언덕. 조반선으로 미토를 조금 지난 가쓰타역에서 내립니다.', href: '/ko/hitachi-seaside-park-from-tokyo/' },
      ],
    },
    place: { name: '가이라쿠엔', address: '일본 이바라키현 미토시 도키와초 1-3-3', url: KAIRAKUEN_URL },
  },
};
