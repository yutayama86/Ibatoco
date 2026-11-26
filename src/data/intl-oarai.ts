/**
 * 大洗磯前神社と神磯の鳥居・大洗の日帰り（英語・繁體中文・한국어）。
 *
 * なぜこのページか:
 *  海外の検索は "Oarai Isosaki Shrine" "torii in the sea Ibaraki" "Kamiiso no Torii sunrise" で来る。
 *  写真の太陽は朝日だが、夕日と思って夕方に来る人が多いと神社が注意している。
 *  「朝に行く」「岩に登らない」「大洗鹿島線はICカード不可」を先に出すことが、旅行者にとっての一番の価値。
 *
 * 事実の扱い（2026-11-26 に公式サイトで再確認）:
 *  - 神磯：御祭神が降臨したと伝わる磯、足を踏み入れてはいけない場所、徳川光圀が景色を讃えた、
 *    冬至のころ鳥居と朝日が一枚に収まる、夕日と間違われるが朝日、元日の初日の出奉拝式
 *    … oarai-isosakijinja.net/keidai/kamiiso/
 *  - 開門 5〜8月 5:30〜18:00 / 9〜4月 6:00〜17:00（本文の記載。meta description は区分が異なるため本文を採用）、
 *    御朱印・授与所 8:30〜16:30、駐車場は日の出〜19時・夜間不可・料金の記載なし、
 *    大洗駅から徒歩約40分（約3km）・うみまちラインで約15分「大洗磯前神社下」、
 *    水戸駅から茨城交通50番で約30分、住所 … oarai-isosakijinja.net/annnai/
 *  - 初詣：12/31 17時に一時閉門・23時前後に開門、元日 祈祷0時〜16時頃・朱印0時〜18時頃・閉門19時頃、
 *    駐車場約160台・12/31夜〜日の出の長時間駐車は遠慮、大洗駅からシャトルバス約30分おき、有料の初日の出バス
 *    … oarai-isosakijinja.net/syougatu/（ページに年の記載なし。毎年の案内として扱い、出発前の確認を促す）
 *  - 2027年元日の日の出 6:49（国立天文台暦計算室・水戸）… 日本語記事 oarai-hatsuhinode-2027（2026-11-10 確認）
 *  - 鹿島臨海鉄道 大洗鹿島線：水戸〜大洗 大人420円、交通系ICカード不可（現金のみ）、14〜16分ほど、
 *    日中おおむね30分おき … rintetsu.co.jp（2026-11-03 確認、日本語記事 kashima-rinkai-oarai-kashima-line-guide）
 *  - うみまちライン：大人200円、1日フリー乗車券 大人500円（アクアワールド入館料1割引）、
 *    大洗駅からアクアワールドまで約20分 … 大洗町・アクアワールド公式（2026-11-03 確認、日本語記事 oarai-day-trip-model-course）
 *  - アクアワールド：9:00〜17:00（最終入館16:00）、冬の平日短縮（2026/12/1〜4・14〜18・21〜22、2027/1/12〜2/26 は
 *    9:00〜16:00・最終入館15:00）、2026/12/7〜11 メンテナンス休館、年末年始営業 … aquaworld-oarai.com/guide/
 *  - 入場料 大人2,300円・小中学生1,100円・幼児400円・3歳未満無料、2027/3/8 から料金改定（新料金は未記載）、
 *    WEBチケットあり（訪日客向けの版もある）… aquaworld-oarai.com/guide/admission/
 *  - 上野→水戸 ひたち1号 7:00→8:13 … JR東日本 時刻表（2026-11-03 確認）
 *  - JRの運賃、うみまちラインの時刻、2027年の交通規制は書かない。
 *  - 写真は載せない（海外ガイドは自前写真のみの方針）。
 *  日本語版 /events/oarai-isosaki-jinja-guide/ は 2026-12 中旬まで観測窓のため、hreflang の ja はまだ登録しない（i18n.ts 参照）。
 *  アクアワールドの料金は 2027-03-08 に改定されるので、その前に新料金へ更新する。
 */
import type { IntlGuide } from './intl-guides';
import type { Locale } from './i18n';

const SHRINE_URL = 'https://www.oarai-isosakijinja.net/';
const SHRINE_ACCESS_URL = 'https://www.oarai-isosakijinja.net/annnai/';
const KAMIISO_URL = 'https://www.oarai-isosakijinja.net/keidai/kamiiso/';
const NEWYEAR_URL = 'https://www.oarai-isosakijinja.net/syougatu/';
const AQUA_GUIDE_URL = 'https://www.aquaworld-oarai.com/guide/';
const AQUA_ADMISSION_URL = 'https://www.aquaworld-oarai.com/guide/admission/';
const RINTETSU_FARE_URL = 'https://www.rintetsu.co.jp/fare_chart';
const UPDATED = '2026-11-26';

export const OARAI_ISOSAKI: Record<Exclude<Locale, 'ja'>, IntlGuide> = {
  en: {
    slug: 'oarai-isosaki-shrine',
    translationKey: 'oarai-isosaki-shrine',
    title: 'Oarai Isosaki Shrine & the Torii in the Sea: Sunrise, Hours and Access from Tokyo',
    description: 'The torii on a sea rock at Oarai Isosaki Shrine is a sunrise view, not a sunset. When to go, shrine hours, New Year’s Day sunrise, how to get there from Tokyo via Mito (the Oarai line takes cash only), and pairing it with Aqua World Oarai.',
    h1: 'Oarai Isosaki Shrine: The Torii in the Sea at Sunrise',
    lead: [
      'On the coast of Oarai, a torii gate stands on a rock surrounded by Pacific waves. This is Kamiiso no Torii, at Oarai Isosaki Shrine. The shrine says the rock is where its deities are said to have come down to earth, and it is often called a symbol of the town.',
      'The first thing to know: every photo of the sun behind this torii shows the sunrise. The shrine says many people mistake it for a sunset and come in the evening. Go in the early morning.',
      'Second: the rock is a sacred, off-limits place. Do not step onto it. This guide uses only what we could confirm with the shrine, the aquarium and the rail operators.',
    ],
    routeChain: {
      label: 'The route at a glance',
      steps: [
        { place: 'Ueno / Tokyo', note: 'JR Joban Line limited express' },
        { place: 'Mito Station', note: 'change to the Oarai-Kashima Line (cash only)' },
        { place: 'Oarai Station', note: 'Umimachi Line bus about 15 min' },
        { place: 'Oarai Isosaki Jinja-shita stop' },
      ],
    },
    quickAnswerLabel: 'Quick answers',
    quickAnswer: [
      { q: 'Sunrise or sunset?', a: 'Sunrise. The shrine says the sun in the famous photos is always the morning sun. Around the winter solstice, the sunrise and the torii line up in one frame.' },
      { q: 'Can I walk onto the rock?', a: 'No. The rock (Kamiiso) is a sacred place that must not be entered.' },
      { q: 'What are the shrine’s hours?', a: 'May–August 5:30–18:00, September–April 6:00–17:00. Goshuin (shrine stamps) and charms: 8:30–16:30.' },
      { q: 'Can I use Suica or PASMO?', a: 'Not on the Oarai-Kashima Line from Mito to Oarai. It is cash only (¥420 for adults).' },
      { q: 'What time is sunrise on New Year’s Day 2027?', a: '6:49 in Mito, according to the National Astronomical Observatory of Japan.' },
    ],
    sections: [
      {
        id: 'getting-there',
        heading: 'How to get there from Tokyo',
        body: [
          'Take the JR Joban Line limited express to Mito. In JR East’s November 2026 timetable, the Hitachi 1 leaves Ueno at 7:00 and arrives at Mito at 8:13. From Mito, you have two options.',
        ],
        table: [
          ['Option A — Train + bus', 'Kashima Rinkai Railway Oarai-Kashima Line from Mito to Oarai: about 14–16 minutes, roughly every 30 minutes during the day, ¥420 for adults. IC cards (Suica, PASMO) are not accepted, so bring cash. From Oarai Station, take the town’s Umimachi Line bus to “Oarai Isosaki Jinja-shita” (about 15 minutes, ¥200 for adults).'],
          ['Option B — Direct bus', 'Ibaraki Kotsu bus route 50 from Mito Station to “Oarai Isosaki Jinja-shita”: about 30 minutes.'],
          ['On foot', 'About 40 minutes (about 3 km) from Oarai Station.'],
          ['By car', 'The shrine car park is up the lantern-lined slope beside the torii that crosses the road. It can be used from sunrise until 19:00, with no overnight parking.'],
        ],
      },
      {
        id: 'sunrise',
        heading: 'Seeing the sunrise',
        body: [
          'Photographers come for the sunrise in every season. The shrine says that around the winter solstice the rising sun comes closest to the torii, so both fit in one shot.',
          'If you are staying in Tokyo, a sunrise visit means a very early start or a night in Oarai or Mito. Check the sunrise time for your date before you go.',
          'Watch from the shore. Do not climb onto the rocks; the reef is off-limits.',
        ],
      },
      {
        id: 'new-year',
        heading: 'New Year’s Day (Hatsuhinode)',
        body: [
          'Seeing the first sunrise of the year, hatsuhinode, is a Japanese tradition, and Oarai is one of the places where people gather for it. On New Year’s morning the shrine’s priests go down to the shore for a sunrise ceremony.',
          'The shrine’s New Year guide says the gate closes at 17:00 on December 31 and reopens around 23:00. The shrine car park (about 160 spaces) fills up, and long stays from New Year’s Eve until sunrise are not allowed. A shuttle bus runs from Oarai Station about every 30 minutes, and a paid “first sunrise” bus is offered. The guide does not state a year, so check it again close to the date.',
          'Sunrise on January 1, 2027 is at 6:49 (Mito, National Astronomical Observatory of Japan).',
        ],
      },
      {
        id: 'aquarium',
        heading: 'Make it a day: Aqua World Oarai',
        body: [
          'Aqua World Ibaraki Prefectural Oarai Aquarium is in the same town, about 20 minutes from Oarai Station on the Umimachi Line. The Umimachi Line one-day pass (¥500 for adults) also gives 10% off aquarium admission.',
        ],
        table: [
          ['Hours', '9:00–17:00 (last entry 16:00). On some winter weekdays it closes at 16:00 (last entry 15:00): December 1–4, 14–18 and 21–22, 2026, and January 12 – February 26, 2027.'],
          ['Closed', 'December 7–11, 2026 for maintenance. Open over the New Year holidays.'],
          ['Admission', 'Adults ¥2,300, elementary and junior high students ¥1,100, children 3 and over ¥400, under 3 free. Prices change from March 8, 2027.'],
          ['Tickets', 'Web tickets are sold online, including a version for overseas visitors. The aquarium recommends buying in advance because entry can be delayed when it is busy.'],
        ],
      },
    ],
    faqLabel: 'FAQ',
    faq: [
      { q: 'Why do some people arrive in the evening?', a: 'The famous photos are often mistaken for sunsets. The shrine says they are all sunrises, so plan for the morning.' },
      { q: 'Is it a day trip from Tokyo?', a: 'Yes, for a daytime visit. For the sunrise itself, most visitors from Tokyo would need to stay overnight nearby.' },
      { q: 'Is there an entrance fee for the shrine?', a: 'Visiting the shrine is free. Goshuin and charms are offered at the counter from 8:30 to 16:30.' },
      { q: 'Do I need cash?', a: 'Yes, for the Oarai-Kashima Line between Mito and Oarai, which does not accept IC cards.' },
      { q: 'Can I combine it with Kairakuen in Mito?', a: 'Yes. Both are reached through Mito Station, so many visitors pair them in one trip.' },
    ],
    sourcesLabel: 'Sources',
    sources: [
      { label: 'Oarai Isosaki Shrine — Kamiiso no Torii (official, Japanese)', url: KAMIISO_URL },
      { label: 'Oarai Isosaki Shrine — Visitor information and access (official, Japanese)', url: SHRINE_ACCESS_URL },
      { label: 'Oarai Isosaki Shrine — New Year visit guide (official, Japanese)', url: NEWYEAR_URL },
      { label: 'Kashima Rinkai Railway — Fare chart (official, Japanese)', url: RINTETSU_FARE_URL },
      { label: 'Aqua World Oarai — Opening hours (official, Japanese)', url: AQUA_GUIDE_URL },
      { label: 'Aqua World Oarai — Admission (official, Japanese)', url: AQUA_ADMISSION_URL },
    ],
    updatedLabel: 'Last updated',
    updatedDate: UPDATED,
    authorLabel: 'Written by',
    author: 'IBATOCO Editorial Team',
    disclaimer: 'Hours, fees and timetables can change. Please check the official websites before you travel.',
    related: {
      label: 'Read next',
      items: [
        { title: 'Kairakuen Plum Blossoms: Mito Plum Festival 2027 Guide', text: 'Change at Mito for Oarai, and see the plum garden on the same trip.', href: '/en/kairakuen-plum-blossoms/' },
        { title: 'Fukuroda Falls: A Day Trip from Tokyo', text: 'A four-tier waterfall in the mountains, also reached from Mito.', href: '/en/fukuroda-falls/' },
      ],
    },
    place: { name: 'Oarai Isosaki Shrine', address: '6890 Isohamacho, Oarai, Higashiibaraki District, Ibaraki 311-1301, Japan', url: SHRINE_URL },
  },

  'zh-tw': {
    slug: 'oarai-isosaki-shrine',
    translationKey: 'oarai-isosaki-shrine',
    title: '大洗磯前神社「神磯鳥居」｜海上鳥居看日出的時間、開門時間與東京交通攻略',
    description: '大洗磯前神社的「神磯鳥居」立在海中礁石上，照片裡的太陽是日出不是夕陽。整理最佳時段、神社開門時間、元旦初日出、從東京經水戶前往的走法（大洗鹿島線只收現金），以及順遊大洗水族館。',
    h1: '大洗磯前神社：海上鳥居的日出',
    lead: [
      '在大洗的海岸，有一座鳥居立在太平洋浪花包圍的礁石上，這就是大洗磯前神社的「神磯鳥居」。神社說明，這片礁石是祭神降臨之處，也被視為大洗町的象徵。',
      '先說最重要的：這座鳥居與太陽的照片，拍的都是日出。神社提醒，很多人誤以為是夕陽而在傍晚前往。請在清晨去。',
      '第二：礁石是神聖的禁地，請勿踏入。本篇只寫能在神社、水族館與鐵道業者官方資料確認的內容。',
    ],
    routeChain: {
      label: '路線一次看懂',
      steps: [
        { place: '上野／東京', note: 'JR常磐線特急' },
        { place: '水戶站', note: '轉大洗鹿島線（只收現金）' },
        { place: '大洗站', note: '「うみまちライン」巴士約15分鐘' },
        { place: '「大洗磯前神社下」站牌' },
      ],
    },
    quickAnswerLabel: '快速重點',
    quickAnswer: [
      { q: '是日出還是夕陽？', a: '日出。神社表示知名照片裡的太陽都是早上的太陽。冬至前後，日出與鳥居能拍進同一個畫面。' },
      { q: '可以走上礁石嗎？', a: '不行。礁石「神磯」是不可踏入的神聖之地。' },
      { q: '神社開放時間？', a: '5～8月 5:30～18:00，9～4月 6:00～17:00。御朱印與授與所 8:30～16:30。' },
      { q: '可以刷Suica或PASMO嗎？', a: '水戶到大洗的大洗鹿島線不行，只收現金（大人420日圓）。' },
      { q: '2027年元旦幾點日出？', a: '依日本國立天文台資料，水戶為6:49。' },
    ],
    sections: [
      {
        id: 'getting-there',
        heading: '從東京怎麼去',
        body: [
          '搭JR常磐線特急到水戶。依JR東日本2026年11月時刻表，常陸1號上野7:00發、水戶8:13到。從水戶有兩種走法。',
        ],
        table: [
          ['方法A：電車＋巴士', '鹿島臨海鐵道大洗鹿島線 水戶→大洗 約14～16分鐘，白天約30分鐘一班，大人420日圓。不能用Suica、PASMO等IC卡，請備現金。大洗站轉搭町內循環巴士「うみまちライン」到「大洗磯前神社下」約15分鐘（大人200日圓）。'],
          ['方法B：直達巴士', '水戶站搭茨城交通50號巴士到「大洗磯前神社下」約30分鐘。'],
          ['步行', '從大洗站步行約40分鐘（約3公里）。'],
          ['自駕', '神社停車場在跨越馬路的鳥居旁、石燈籠坡道上方。可使用時間為日出至19:00，夜間不可停車。'],
        ],
      },
      {
        id: 'sunrise',
        heading: '看日出',
        body: [
          '一年四季都有攝影愛好者來拍日出。神社表示，冬至前後日出位置最靠近鳥居，太陽與鳥居能收進同一張照片。',
          '如果住在東京，要看日出得非常早出發，或在大洗、水戶住一晚。出發前請查好當天的日出時間。',
          '請在岸邊觀賞，不要爬上礁石。',
        ],
      },
      {
        id: 'new-year',
        heading: '元旦初日出',
        body: [
          '在元旦看「初日出」是日本的傳統，大洗是人們聚集迎接新年第一道曙光的地點之一。元旦早上，神社的神職人員會走到海邊舉行迎日出的儀式。',
          '依神社的初詣說明，12月31日17:00暫時關門，23:00前後再開門。神社停車場約160個車位會停滿，且不可從除夕夜一路停到日出。大洗站有約30分鐘一班的接駁巴士，另有收費的「初日出巴士」。說明頁沒有標示年份，臨近日期時請再確認。',
          '2027年1月1日的日出時間為6:49（水戶，日本國立天文台）。',
        ],
      },
      {
        id: 'aquarium',
        heading: '順遊：大洗水族館（Aqua World）',
        body: [
          '「Aqua World茨城縣大洗水族館」也在大洗町，從大洗站搭「うみまちライン」約20分鐘。うみまちライン一日券（大人500日圓）還可享水族館門票9折。',
        ],
        table: [
          ['開放時間', '9:00～17:00（最後入館16:00）。冬季部分平日提早到16:00關門（最後入館15:00）：2026年12月1～4日、14～18日、21～22日，以及2027年1月12日～2月26日。'],
          ['休館', '2026年12月7～11日維護休館。年末年始照常營業。'],
          ['門票', '大人2,300日圓，國小・國中生1,100日圓，3歲以上幼兒400日圓，未滿3歲免費。2027年3月8日起調整票價。'],
          ['購票', '有網路票，也有給訪日旅客的版本。館方建議事先購買，人多時沒有票可能要等待入場。'],
        ],
      },
    ],
    faqLabel: '常見問題',
    faq: [
      { q: '為什麼有人傍晚才去？', a: '知名照片常被誤認為夕陽。神社說明全是日出，請安排早上前往。' },
      { q: '可以從東京當天來回嗎？', a: '白天參拜可以。若要看日出，從東京出發多半需要在附近住一晚。' },
      { q: '參拜要門票嗎？', a: '參拜免費。御朱印與御守在8:30～16:30於授與所受理。' },
      { q: '需要現金嗎？', a: '需要。水戶到大洗的大洗鹿島線不能使用IC卡。' },
      { q: '可以和水戶的偕樂園一起去嗎？', a: '可以。兩處都經由水戶站，很多人安排在同一趟行程。' },
    ],
    sourcesLabel: '資料來源',
    sources: [
      { label: '大洗磯前神社｜神磯鳥居（官方，日文）', url: KAMIISO_URL },
      { label: '大洗磯前神社｜參拜須知與交通（官方，日文）', url: SHRINE_ACCESS_URL },
      { label: '大洗磯前神社｜初詣說明（官方，日文）', url: NEWYEAR_URL },
      { label: '鹿島臨海鐵道｜票價表（官方，日文）', url: RINTETSU_FARE_URL },
      { label: '大洗水族館｜營業時間（官方，日文）', url: AQUA_GUIDE_URL },
      { label: '大洗水族館｜門票（官方，日文）', url: AQUA_ADMISSION_URL },
    ],
    updatedLabel: '最後更新',
    updatedDate: UPDATED,
    authorLabel: '撰文',
    author: 'IBATOCO 編輯部',
    disclaimer: '開放時間、票價與班次可能變動，出發前請務必確認官方網站。',
    related: {
      label: '延伸閱讀',
      items: [
        { title: '偕樂園賞梅：2027水戶梅花祭攻略', text: '在水戶轉車去大洗，同一趟也能順道賞梅。', href: '/zh-tw/kairakuen-plum-blossoms/' },
        { title: '袋田瀑布：從東京出發的交通、門票與冰瀑攻略', text: '同樣從水戶出發，前往山中的四段瀑布。', href: '/zh-tw/fukuroda-falls/' },
      ],
    },
    place: { name: '大洗磯前神社', address: '日本茨城縣東茨城郡大洗町磯濱町6890', url: SHRINE_URL },
  },

  ko: {
    slug: 'oarai-isosaki-shrine',
    translationKey: 'oarai-isosaki-shrine',
    title: '오아라이 이소사키 신사 ‘가미이소 도리이’: 바다 위 도리이 일출 시간·운영 시간·도쿄에서 가는 법',
    description: '오아라이 이소사키 신사의 바다 바위 위 도리이는 일몰이 아니라 일출 명소입니다. 언제 가야 하는지, 신사 운영 시간, 새해 첫 일출, 미토를 거쳐 가는 법(오아라이선은 현금만 가능), 아쿠아월드 오아라이와 묶는 방법을 정리했습니다.',
    h1: '오아라이 이소사키 신사: 바다 위 도리이의 일출',
    lead: [
      '오아라이 해안에는 태평양 파도에 둘러싸인 바위 위에 도리이가 서 있습니다. 오아라이 이소사키 신사의 ‘가미이소 도리이’입니다. 신사는 이 바위를 신이 내려왔다고 전해지는 곳으로 소개하며, 마을의 상징으로도 꼽힙니다.',
      '가장 먼저 알아 둘 점: 이 도리이 뒤로 해가 보이는 사진은 모두 일출입니다. 신사는 일몰로 착각해 저녁에 오는 사람이 많다고 안내합니다. 이른 아침에 가세요.',
      '두 번째: 바위는 들어가면 안 되는 신성한 곳입니다. 올라가지 마세요. 이 글은 신사, 수족관, 철도 회사의 공식 정보로 확인한 내용만 담았습니다.',
    ],
    routeChain: {
      label: '한눈에 보는 경로',
      steps: [
        { place: '우에노 / 도쿄', note: 'JR 조반선 특급' },
        { place: '미토역', note: '오아라이가시마선 환승(현금만)' },
        { place: '오아라이역', note: '‘우미마치라인’ 버스 약 15분' },
        { place: '‘오아라이이소사키진자시타’ 정류장' },
      ],
    },
    quickAnswerLabel: '핵심 요약',
    quickAnswer: [
      { q: '일출인가요, 일몰인가요?', a: '일출입니다. 신사는 유명한 사진 속 해가 모두 아침 해라고 안내합니다. 동지 무렵에는 해와 도리이가 한 화면에 들어옵니다.' },
      { q: '바위 위로 걸어갈 수 있나요?', a: '안 됩니다. 바위(가미이소)는 들어가면 안 되는 신성한 장소입니다.' },
      { q: '신사 운영 시간은?', a: '5~8월 5:30~18:00, 9~4월 6:00~17:00. 고슈인(참배 도장)과 부적은 8:30~16:30.' },
      { q: 'Suica·PASMO를 쓸 수 있나요?', a: '미토~오아라이 구간의 오아라이가시마선은 안 되고 현금만 받습니다(어른 420엔).' },
      { q: '2027년 1월 1일 일출 시각은?', a: '일본 국립천문대 자료로 미토 기준 6:49입니다.' },
    ],
    sections: [
      {
        id: 'getting-there',
        heading: '도쿄에서 가는 법',
        body: [
          'JR 조반선 특급으로 미토까지 갑니다. JR 동일본 2026년 11월 시간표 기준으로 히타치 1호는 우에노 7:00 출발, 미토 8:13 도착입니다. 미토에서는 두 가지 방법이 있습니다.',
        ],
        table: [
          ['방법 A: 열차 + 버스', '가시마린카이철도 오아라이가시마선으로 미토 → 오아라이 약 14~16분, 낮에는 약 30분 간격, 어른 420엔. Suica·PASMO 등 교통카드를 쓸 수 없으니 현금을 준비하세요. 오아라이역에서 마을 순환버스 ‘우미마치라인’으로 ‘오아라이이소사키진자시타’까지 약 15분(어른 200엔).'],
          ['방법 B: 직행 버스', '미토역에서 이바라키교통 50번 버스로 ‘오아라이이소사키진자시타’까지 약 30분.'],
          ['도보', '오아라이역에서 약 40분(약 3km).'],
          ['자동차', '신사 주차장은 도로를 가로지르는 도리이 옆, 석등이 늘어선 언덕 위에 있습니다. 일출부터 19:00까지 이용할 수 있고 야간 주차는 안 됩니다.'],
        ],
      },
      {
        id: 'sunrise',
        heading: '일출 보기',
        body: [
          '사계절 내내 일출을 찍으러 사진가들이 찾아옵니다. 신사는 동지 무렵 해가 도리이에 가장 가까이 떠올라 한 장에 담을 수 있다고 안내합니다.',
          '도쿄에 묵는다면 일출을 보려면 아주 일찍 출발하거나 오아라이·미토에서 1박해야 합니다. 가기 전에 그날의 일출 시각을 확인하세요.',
          '해안에서 보고, 바위에는 올라가지 마세요.',
        ],
      },
      {
        id: 'new-year',
        heading: '새해 첫 일출(하쓰히노데)',
        body: [
          '1월 1일에 한 해의 첫 일출 ‘하쓰히노데’를 보는 것은 일본의 전통이고, 오아라이는 사람들이 모이는 곳 중 하나입니다. 새해 아침에는 신사의 신관들이 해안으로 내려가 일출 의식을 올립니다.',
          '신사의 새해 참배 안내에 따르면 12월 31일 17:00에 한 번 문을 닫고 23:00 전후에 다시 엽니다. 신사 주차장(약 160대)은 가득 차며, 섣달그믐 밤부터 일출까지 오래 세워 두는 것은 삼가 달라고 합니다. 오아라이역에서 약 30분 간격으로 셔틀버스가 다니고, 유료 ‘첫 일출 버스’도 있습니다. 안내 페이지에 연도가 적혀 있지 않으니 날짜가 가까워지면 다시 확인하세요.',
          '2027년 1월 1일 일출은 6:49입니다(미토, 일본 국립천문대).',
        ],
      },
      {
        id: 'aquarium',
        heading: '함께 둘러보기: 아쿠아월드 오아라이',
        body: [
          '‘아쿠아월드 이바라키현 오아라이 수족관’도 같은 마을에 있습니다. 오아라이역에서 우미마치라인으로 약 20분입니다. 우미마치라인 1일 승차권(어른 500엔)이 있으면 수족관 입장료가 10% 할인됩니다.',
        ],
        table: [
          ['운영 시간', '9:00~17:00(최종 입장 16:00). 겨울 일부 평일은 16:00 폐관(최종 입장 15:00): 2026년 12월 1~4일, 14~18일, 21~22일, 2027년 1월 12일~2월 26일.'],
          ['휴관', '2026년 12월 7~11일 정기 점검 휴관. 연말연시에는 영업합니다.'],
          ['입장료', '어른 2,300엔, 초등·중학생 1,100엔, 3세 이상 유아 400엔, 3세 미만 무료. 2027년 3월 8일부터 요금이 바뀝니다.'],
          ['티켓', '온라인 웹 티켓이 있고, 방일 여행객용 버전도 있습니다. 붐빌 때는 입장까지 기다릴 수 있어 미리 구입을 권합니다.'],
        ],
      },
    ],
    faqLabel: '자주 묻는 질문',
    faq: [
      { q: '왜 저녁에 오는 사람이 있나요?', a: '유명한 사진을 일몰로 착각하기 때문입니다. 신사는 모두 일출이라고 안내하니 아침으로 계획하세요.' },
      { q: '도쿄에서 당일치기가 되나요?', a: '낮 참배라면 됩니다. 일출을 보려면 대부분 근처에서 1박해야 합니다.' },
      { q: '신사 입장료가 있나요?', a: '참배는 무료입니다. 고슈인과 부적은 8:30~16:30에 받을 수 있습니다.' },
      { q: '현금이 필요한가요?', a: '네. 미토~오아라이의 오아라이가시마선은 교통카드를 쓸 수 없습니다.' },
      { q: '미토의 가이라쿠엔과 함께 갈 수 있나요?', a: '네. 둘 다 미토역을 거치므로 한 번의 여행으로 묶는 사람이 많습니다.' },
    ],
    sourcesLabel: '출처',
    sources: [
      { label: '오아라이 이소사키 신사｜가미이소 도리이(공식, 일본어)', url: KAMIISO_URL },
      { label: '오아라이 이소사키 신사｜참배 안내·교통(공식, 일본어)', url: SHRINE_ACCESS_URL },
      { label: '오아라이 이소사키 신사｜새해 참배 안내(공식, 일본어)', url: NEWYEAR_URL },
      { label: '가시마린카이철도｜운임표(공식, 일본어)', url: RINTETSU_FARE_URL },
      { label: '아쿠아월드 오아라이｜영업 안내(공식, 일본어)', url: AQUA_GUIDE_URL },
      { label: '아쿠아월드 오아라이｜입장료(공식, 일본어)', url: AQUA_ADMISSION_URL },
    ],
    updatedLabel: '최종 업데이트',
    updatedDate: UPDATED,
    authorLabel: '작성',
    author: 'IBATOCO 편집부',
    disclaimer: '운영 시간, 요금, 교통 시간표는 변경될 수 있습니다. 출발 전 공식 사이트에서 확인해 주세요.',
    related: {
      label: '이어서 읽기',
      items: [
        { title: '가이라쿠엔 매화: 2027 미토 매화 축제 가이드', text: '미토에서 오아라이로 갈아타기 전에 매화 정원도 함께.', href: '/ko/kairakuen-plum-blossoms/' },
        { title: '후쿠로다 폭포: 도쿄에서 가는 법과 겨울 얼음 폭포', text: '마찬가지로 미토에서 출발하는 산속의 4단 폭포.', href: '/ko/fukuroda-falls/' },
      ],
    },
    place: { name: '오아라이 이소사키 신사', address: '일본 이바라키현 히가시이바라키군 오아라이마치 이소하마초 6890', url: SHRINE_URL },
  },
};
