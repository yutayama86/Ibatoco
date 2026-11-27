/**
 * 笠間（笠間稲荷神社・笠間焼・陶芸体験）の海外向けガイド（英語・繁體中文・한국어）。
 *
 * なぜこのページか:
 *  海外の検索は "Kasama Inari Shrine" "Kasama pottery" "pottery experience near Tokyo" で来る。
 *  神社・陶芸美術館・工芸の丘・周遊バスがそろって月曜休みになりやすいこと、
 *  陶芸体験の作品は仕上がりまで約3か月かかること（短期旅行者には重要）を先に出す。
 *
 * 事実の扱い（2026-11-27 に下記の公式ページを再確認。初版は日本語記事の確認内容で作成）:
 *  再確認で追加：工芸の丘の年末年始休業 12/25〜1/1、陶芸美術館の休館 12/29〜1/1・月曜が祝日なら翌平日、
 *  八重藤は樹齢約400年・昭和42年に県の天然記念物、御本殿は昭和63年に国の重要文化財（keidai.html / about）。
 *  周遊バスの笠間駅発の時刻範囲は時刻表PDFを再確認していないため外した。
 *  - 笠間稲荷神社：社伝で白雉2年（651年）創建、年間350万余の参拝者（公式）、御本殿は国の重要文化財、
 *    八重藤は県の天然記念物、笠間稲荷美術館 9:00〜16:30（入館16:00）・一般300円、
 *    JR水戸線 笠間駅から徒歩約20分・タクシー約5分 … kasama.or.jp（2026-09-28〜11-03 確認、日本語記事 kasama-inari-jinja-guide）
 *  - 茨城県陶芸美術館 9:30〜17:00（入場16:30）・月曜休館、企画展の時期 一般950円／コレクション展のみ 一般360円
 *    … tougei.museum.ibk.ed.jp（2026-11-03 確認、日本語記事 kasama-day-trip-model-course）
 *  - 笠間工芸の丘 10:00〜17:00・月曜休館（祝日・連休は翌日）、陶芸体験 ろくろ・手ひねり・絵付け、仕上がりまで約3か月
 *    … kasama-crafthills.com（2026-09-29〜11-03 確認、日本語記事 kasama-geijutsu-no-mori-guide）
 *  - 笠間芸術の森公園 入園無料・8:30〜17:00 … 笠間市（2026-09-29 確認）
 *  - かさま観光周遊バス：連絡ルート（友部駅北口、約16分）と周遊ルート（笠間駅、約40分）、道の駅かさまで乗り換え、
 *    1日自由乗車券のみ 平日300円・土日祝と春秋の観光シーズン500円、未就学児無料、各ルート1日7便、
 *    周遊ルートの笠間駅発 10:08〜17:08、月曜運休（祝日は翌日）、現金・クレジット・QR・いばっピ
 *    … 笠間市（2026-11-03 確認、日本語記事 kasama-kanko-shuyu-bus-guide）
 *  - 特急ひたち1号 上野7:00発→友部8:03着 … JR東日本 時刻表（2026-11-03 確認）
 *  - 友部〜笠間のJR水戸線の所要時間・運賃、陶芸体験の料金・予約方法・海外発送の可否は書かない（確認していないため）。
 *  - 写真は載せない（海外ガイドは自前写真のみの方針）。
 */
import type { IntlGuide } from './intl-guides';
import type { Locale } from './i18n';

const SHRINE_URL = 'https://www.kasama.or.jp/';
const SHRINE_ACCESS_URL = 'https://www.kasama.or.jp/access/index.html';
const SHRINE_MUSEUM_URL = 'https://www.kasama.or.jp/sanpai/museum.html';
const CERAMIC_MUSEUM_URL = 'https://www.tougei.museum.ibk.ed.jp/viewer/info.html?idSubTop=0&id=5';
const CRAFTHILLS_URL = 'https://kasama-crafthills.com/%e3%81%94%e5%88%a9%e7%94%a8%e6%a1%88%e5%86%85/';
const BUS_URL = 'https://www.city.kasama.lg.jp/page/page000356.html';
const UPDATED = '2026-11-27';

export const KASAMA: Record<Exclude<Locale, 'ja'>, IntlGuide> = {
  en: {
    slug: 'kasama-day-trip',
    translationKey: 'kasama-day-trip',
    title: 'Kasama Day Trip: Kasama Inari Shrine, Kasama Pottery and the Loop Bus from Tokyo',
    description: 'A day in Kasama, Ibaraki: Kasama Inari Shrine, the Ibaraki Ceramic Art Museum and pottery workshops at Kasama Craft Hills. Hours, fees, the ¥300/¥500 one-day loop bus, and why to avoid Mondays.',
    h1: 'Kasama: A Shrine and Pottery Town Day Trip from Tokyo',
    lead: [
      'Kasama is a small town in central Ibaraki known for two things: Kasama Inari Shrine, which by shrine tradition was founded in 651, and Kasama-yaki pottery.',
      'In one day you can visit the shrine, see ceramics at the Ibaraki Ceramic Art Museum, and try making pottery at Kasama Craft Hills next door.',
      'Two things to know first: many places, and the town’s loop bus, are closed on Mondays. And pottery you make takes about three months to be finished.',
    ],
    routeChain: {
      label: 'The route at a glance',
      steps: [
        { place: 'Ueno / Tokyo', note: 'JR Joban Line limited express' },
        { place: 'Tomobe Station', note: 'e.g. Ueno 7:00 → Tomobe 8:03' },
        { place: 'JR Mito Line to Kasama, or the loop bus' },
        { place: 'Kasama Inari Shrine / Craft Hills' },
      ],
    },
    quickAnswerLabel: 'Quick answers',
    quickAnswer: [
      { q: 'Which day should I avoid?', a: 'Monday. The Ibaraki Ceramic Art Museum, Kasama Craft Hills and the Kasama loop bus are all closed on Mondays (the next day if Monday is a holiday).' },
      { q: 'How do I get around?', a: 'The Kasama tourism loop bus sells only a one-day pass: ¥300 on weekdays, ¥500 on weekends, holidays and in the spring and autumn tourist seasons.' },
      { q: 'Can I take my pottery home the same day?', a: 'No. At Kasama Craft Hills, the finished piece takes about three months. Ask the staff about delivery options before you book.' },
      { q: 'How far is the shrine from the station?', a: 'About 20 minutes on foot or about 5 minutes by taxi from JR Kasama Station.' },
      { q: 'How far is it from Tokyo?', a: 'The limited express from Ueno reaches Tomobe in about an hour (e.g. 7:00 → 8:03). Change there for Kasama.' },
    ],
    sections: [
      {
        id: 'getting-there',
        heading: 'How to get there from Tokyo',
        body: [
          'Take the JR Joban Line limited express to Tomobe. In JR East’s November 2026 timetable, the Hitachi 1 leaves Ueno at 7:00 and arrives at Tomobe at 8:03. From Tomobe, you can change to the JR Mito Line for Kasama Station, or use the town’s loop bus.',
        ],
        table: [
          ['Loop bus — connector route', 'From Tomobe Station North Exit to Michi-no-Eki Kasama: about 16 minutes. Change there to the sightseeing loop.'],
          ['Loop bus — sightseeing loop', 'From Kasama Station around the main sights (about 40 minutes), including the Art Forest Park east gate, the Ceramic Art Museum / Craft Hills and Inari Shrine. Seven runs a day; check the timetable on the city’s site.'],
          ['Loop bus fare', 'One-day pass only: ¥300 on weekdays, ¥500 on weekends, holidays and in the spring and autumn seasons. Preschool children ride free. Cash, credit cards, QR payment and the “Ibappi” IC card are accepted.'],
          ['Loop bus closed', 'Mondays (the next day if Monday is a holiday).'],
          ['Station to shrine', 'From JR Kasama Station: about 20 minutes on foot, about 5 minutes by taxi.'],
        ],
      },
      {
        id: 'shrine',
        heading: 'Kasama Inari Shrine',
        body: [
          'According to shrine tradition, Kasama Inari Shrine was founded in 651. The shrine says more than 3.5 million people visit each year. Its main hall is a nationally designated Important Cultural Property, and one of its two wisteria trees, about 400 years old, is a prefectural natural monument.',
          'The Kasama Inari Museum on the grounds shows old ceramics. It is open 9:00–16:30 (last entry 16:00), ¥300 for adults.',
        ],
      },
      {
        id: 'pottery',
        heading: 'Pottery: see it, then make it',
        table: [
          ['Ibaraki Ceramic Art Museum', 'Inside Kasama Art Forest Park. 9:30–17:00 (last entry 16:30). Closed Mondays (the next weekday if Monday is a holiday) and December 29 – January 1. ¥950 for adults during special exhibitions, ¥360 for the collection only.'],
          ['Kasama Craft Hills', 'Next to the museum. 10:00–17:00. Closed Mondays (the next day if Monday is a holiday) and December 25 – January 1. Pottery workshops: wheel throwing, hand-building and painting. The finished piece takes about three months.'],
          ['Kasama Art Forest Park', 'Free entry, 8:30–17:00.'],
        ],
      },
      {
        id: 'plan',
        heading: 'A simple plan',
        body: [
          'Morning at Kasama Inari Shrine; early afternoon at the Ceramic Art Museum (last entry 16:30); finish at Craft Hills, which stays open until 17:00. Go Tuesday to Sunday.',
        ],
      },
    ],
    faqLabel: 'FAQ',
    faq: [
      { q: 'Is the shrine open on Mondays?', a: 'The shrine itself is a place of worship; the museums and the loop bus are what close on Mondays. Check the shrine’s official site for its hours.' },
      { q: 'Do I need to book the pottery workshop?', a: 'Check Kasama Craft Hills’ official site before you go. We could not confirm booking rules and fees for this guide.' },
      { q: 'Can my pottery be sent overseas?', a: 'We could not confirm this. Ask Kasama Craft Hills directly before you book.' },
      { q: 'Is there free parking?', a: 'Kasama Art Forest Park’s car parks are usually free, but they are paid during big events such as the pottery festival in Golden Week.' },
      { q: 'Can I combine Kasama with Mito?', a: 'Yes. Tomobe is on the Joban Line on the way to Mito, so both fit into one trip.' },
    ],
    sourcesLabel: 'Sources',
    sources: [
      { label: 'Kasama Inari Shrine (official, Japanese)', url: SHRINE_URL },
      { label: 'Kasama Inari Shrine — Access (official, Japanese)', url: SHRINE_ACCESS_URL },
      { label: 'Kasama Inari Museum (official, Japanese)', url: SHRINE_MUSEUM_URL },
      { label: 'Ibaraki Ceramic Art Museum — Visitor information (official, Japanese)', url: CERAMIC_MUSEUM_URL },
      { label: 'Kasama Craft Hills — Visitor information (official, Japanese)', url: CRAFTHILLS_URL },
      { label: 'Kasama City — Kasama tourism loop bus (official, Japanese)', url: BUS_URL },
    ],
    updatedLabel: 'Last updated',
    updatedDate: UPDATED,
    authorLabel: 'Written by',
    author: 'IBATOCO Editorial Team',
    disclaimer: 'Hours, fees and timetables can change. Please check the official websites before you travel.',
    related: {
      label: 'Read next',
      items: [
        { title: 'Kairakuen Plum Blossoms: Mito Plum Festival 2027 Guide', text: 'Mito is just up the Joban Line from Tomobe.', href: '/en/kairakuen-plum-blossoms/' },
        { title: 'Mount Tsukuba: A Day Trip from Akihabara', text: 'Ibaraki’s best-known mountain, by Tsukuba Express.', href: '/en/mount-tsukuba/' },
      ],
    },
    place: { name: 'Kasama Inari Shrine', address: 'Kasama, Ibaraki, Japan', url: SHRINE_URL },
  },

  'zh-tw': {
    slug: 'kasama-day-trip',
    translationKey: 'kasama-day-trip',
    title: '笠間一日遊｜笠間稻荷神社、笠間燒陶藝體驗與周遊巴士・東京交通攻略',
    description: '茨城縣笠間的一日遊：笠間稻荷神社、茨城縣陶藝美術館，以及笠間工藝之丘的陶藝體驗。整理開放時間、門票、300／500日圓的周遊巴士一日券，以及為什麼要避開星期一。',
    h1: '笠間：神社與陶藝小鎮的東京出發一日遊',
    lead: [
      '笠間是茨城縣中部的小鎮，以兩樣東西聞名：依社傳創建於651年的笠間稻荷神社，以及「笠間燒」陶器。',
      '一天之內可以參拜神社、在茨城縣陶藝美術館看陶藝作品，再到隔壁的笠間工藝之丘親手做陶。',
      '先說兩件事：很多設施和鎮上的周遊巴士星期一休息；親手做的陶器要約3個月才會完成。',
    ],
    routeChain: {
      label: '路線一次看懂',
      steps: [
        { place: '上野／東京', note: 'JR常磐線特急' },
        { place: '友部站', note: '例：上野7:00→友部8:03' },
        { place: '轉JR水戶線到笠間，或搭周遊巴士' },
        { place: '笠間稻荷神社／工藝之丘' },
      ],
    },
    quickAnswerLabel: '快速重點',
    quickAnswer: [
      { q: '哪一天要避開？', a: '星期一。茨城縣陶藝美術館、笠間工藝之丘與笠間周遊巴士星期一都休息（遇假日則隔天）。' },
      { q: '怎麼移動？', a: '笠間觀光周遊巴士只賣一日券：平日300日圓，週末、假日與春秋觀光季500日圓。' },
      { q: '做的陶器當天能帶走嗎？', a: '不能。笠間工藝之丘的作品約需3個月完成。預約前請先向工作人員詢問寄送方式。' },
      { q: '神社離車站多遠？', a: '從JR笠間站步行約20分鐘，計程車約5分鐘。' },
      { q: '從東京要多久？', a: '上野搭特急到友部約1小時（例：7:00→8:03），在友部轉車到笠間。' },
    ],
    sections: [
      {
        id: 'getting-there',
        heading: '從東京怎麼去',
        body: [
          '搭JR常磐線特急到友部。依JR東日本2026年11月時刻表，常陸1號上野7:00發、友部8:03到。在友部可轉JR水戶線到笠間站，或搭鎮上的周遊巴士。',
        ],
        table: [
          ['周遊巴士・聯絡路線', '友部站北口→道之驛笠間 約16分鐘，在這裡轉觀光周遊路線。'],
          ['周遊巴士・觀光周遊路線', '從笠間站出發繞行主要景點（約40分鐘），經過藝術之森公園東門、陶藝美術館／工藝之丘、稻荷神社等。一天7班，時刻請看市公所網站的時刻表。'],
          ['周遊巴士票價', '只賣一日券：平日300日圓，週末、假日與春秋觀光季500日圓。學齡前兒童免費。可用現金、信用卡、QR支付與「いばっピ」IC卡。'],
          ['周遊巴士停駛', '星期一（遇假日則隔天）。'],
          ['車站到神社', 'JR笠間站步行約20分鐘，計程車約5分鐘。'],
        ],
      },
      {
        id: 'shrine',
        heading: '笠間稻荷神社',
        body: [
          '依社傳，笠間稻荷神社創建於651年。神社表示每年有超過350萬人前來參拜。本殿是日本國家重要文化財，境內兩株樹齡約400年的藤樹中，八重藤是茨城縣天然紀念物。',
          '境內的笠間稻荷美術館展出古陶器，開放9:00～16:30（最後入館16:00），大人300日圓。',
        ],
      },
      {
        id: 'pottery',
        heading: '陶藝：先看再做',
        table: [
          ['茨城縣陶藝美術館', '位於笠間藝術之森公園內。9:30～17:00（最後入館16:30）。星期一休館（遇假日則隔個平日），12月29日～1月1日休館。特展期間大人950日圓，只看館藏展360日圓。'],
          ['笠間工藝之丘', '在美術館旁。10:00～17:00。星期一休館（遇假日則隔天），12月25日～1月1日休館。陶藝體驗有拉坯、手捏與彩繪三種，作品約需3個月完成。'],
          ['笠間藝術之森公園', '免費入園，8:30～17:00。'],
        ],
      },
      {
        id: 'plan',
        heading: '簡單行程',
        body: [
          '上午參拜笠間稻荷神社，午後到陶藝美術館（最後入館16:30），最後到開到17:00的工藝之丘。建議星期二到星期日前往。',
        ],
      },
    ],
    faqLabel: '常見問題',
    faq: [
      { q: '神社星期一有開嗎？', a: '神社是參拜場所；星期一休息的是美術館與周遊巴士。神社的開放時間請看官網。' },
      { q: '陶藝體驗需要預約嗎？', a: '請出發前查看笠間工藝之丘官網。本篇無法確認預約規定與費用。' },
      { q: '作品可以寄到國外嗎？', a: '本篇無法確認，預約前請直接詢問笠間工藝之丘。' },
      { q: '有免費停車場嗎？', a: '笠間藝術之森公園的停車場平常免費，但黃金週陶炎祭等大型活動時會收費。' },
      { q: '可以和水戶一起去嗎？', a: '可以。友部就在常磐線前往水戶的途中，兩地能排在同一趟行程。' },
    ],
    sourcesLabel: '資料來源',
    sources: [
      { label: '笠間稻荷神社（官方，日文）', url: SHRINE_URL },
      { label: '笠間稻荷神社｜交通（官方，日文）', url: SHRINE_ACCESS_URL },
      { label: '笠間稻荷美術館（官方，日文）', url: SHRINE_MUSEUM_URL },
      { label: '茨城縣陶藝美術館｜參觀須知（官方，日文）', url: CERAMIC_MUSEUM_URL },
      { label: '笠間工藝之丘｜使用須知（官方，日文）', url: CRAFTHILLS_URL },
      { label: '笠間市｜笠間觀光周遊巴士（官方，日文）', url: BUS_URL },
    ],
    updatedLabel: '最後更新',
    updatedDate: UPDATED,
    authorLabel: '撰文',
    author: 'IBATOCO 編輯部',
    disclaimer: '開放時間、票價與班次可能變動，出發前請務必確認官方網站。',
    related: {
      label: '延伸閱讀',
      items: [
        { title: '偕樂園賞梅：2027水戶梅花祭攻略', text: '水戶就在友部沿常磐線再往前。', href: '/zh-tw/kairakuen-plum-blossoms/' },
        { title: '筑波山：從秋葉原出發的一日遊', text: '茨城最知名的山，搭筑波快線前往。', href: '/zh-tw/mount-tsukuba/' },
      ],
    },
    place: { name: '笠間稻荷神社', address: '日本茨城縣笠間市', url: SHRINE_URL },
  },

  ko: {
    slug: 'kasama-day-trip',
    translationKey: 'kasama-day-trip',
    title: '가사마 당일치기: 가사마 이나리 신사·가사마야키 도예 체험·순환버스와 도쿄에서 가는 법',
    description: '이바라키현 가사마에서 보내는 하루: 가사마 이나리 신사, 이바라키현 도예미술관, 가사마 공예의 언덕 도예 체험. 운영 시간, 요금, 300엔/500엔 1일 순환버스, 그리고 월요일을 피해야 하는 이유.',
    h1: '가사마: 도쿄에서 떠나는 신사와 도자기 마을 당일치기',
    lead: [
      '가사마는 이바라키현 중부의 작은 마을로, 신사 전승에 따르면 651년에 세워진 가사마 이나리 신사와 ‘가사마야키’ 도자기로 알려져 있습니다.',
      '하루 동안 신사에 참배하고, 이바라키현 도예미술관에서 작품을 본 뒤, 바로 옆 가사마 공예의 언덕에서 도예를 직접 체험할 수 있습니다.',
      '먼저 알아 둘 두 가지: 많은 시설과 마을 순환버스가 월요일에 쉽니다. 그리고 직접 만든 도자기는 완성까지 약 3개월이 걸립니다.',
    ],
    routeChain: {
      label: '한눈에 보는 경로',
      steps: [
        { place: '우에노 / 도쿄', note: 'JR 조반선 특급' },
        { place: '도모베역', note: '예: 우에노 7:00 → 도모베 8:03' },
        { place: 'JR 미토선으로 가사마, 또는 순환버스' },
        { place: '가사마 이나리 신사 / 공예의 언덕' },
      ],
    },
    quickAnswerLabel: '핵심 요약',
    quickAnswer: [
      { q: '피해야 할 요일은?', a: '월요일입니다. 이바라키현 도예미술관, 가사마 공예의 언덕, 가사마 순환버스가 모두 월요일에 쉽니다(월요일이 공휴일이면 다음 날).' },
      { q: '어떻게 이동하나요?', a: '가사마 관광 순환버스는 1일 승차권만 판매합니다. 평일 300엔, 주말·공휴일과 봄·가을 관광 시즌 500엔.' },
      { q: '만든 도자기를 당일 가져갈 수 있나요?', a: '아닙니다. 가사마 공예의 언덕에서는 완성까지 약 3개월이 걸립니다. 예약 전에 받는 방법을 직원에게 문의하세요.' },
      { q: '역에서 신사까지 얼마나 걸려요?', a: 'JR 가사마역에서 도보 약 20분, 택시 약 5분.' },
      { q: '도쿄에서 얼마나 걸려요?', a: '우에노에서 특급으로 도모베까지 약 1시간(예: 7:00 → 8:03). 도모베에서 갈아타고 가사마로 갑니다.' },
    ],
    sections: [
      {
        id: 'getting-there',
        heading: '도쿄에서 가는 법',
        body: [
          'JR 조반선 특급으로 도모베까지 갑니다. JR 동일본 2026년 11월 시간표 기준으로 히타치 1호는 우에노 7:00 출발, 도모베 8:03 도착입니다. 도모베에서 JR 미토선으로 가사마역까지 가거나, 마을 순환버스를 이용합니다.',
        ],
        table: [
          ['순환버스·연결 루트', '도모베역 북쪽 출구 → 미치노에키 가사마 약 16분. 여기서 관광 순환 루트로 갈아탑니다.'],
          ['순환버스·관광 순환 루트', '가사마역에서 주요 명소를 도는 노선(약 40분). 예술의 숲 공원 동문, 도예미술관·공예의 언덕, 이나리 신사 등을 지납니다. 하루 7편. 시각은 시청 사이트의 시간표를 확인하세요.'],
          ['순환버스 요금', '1일 승차권만: 평일 300엔, 주말·공휴일과 봄·가을 시즌 500엔. 미취학 아동 무료. 현금, 신용카드, QR 결제, ‘이밧피’ IC카드 사용 가능.'],
          ['순환버스 운휴', '월요일(공휴일이면 다음 날).'],
          ['역에서 신사까지', 'JR 가사마역에서 도보 약 20분, 택시 약 5분.'],
        ],
      },
      {
        id: 'shrine',
        heading: '가사마 이나리 신사',
        body: [
          '신사 전승에 따르면 가사마 이나리 신사는 651년에 세워졌습니다. 신사는 매년 350만 명 이상이 참배한다고 밝힙니다. 본전은 일본 국가 중요문화재, 수령 약 400년의 등나무 두 그루 중 겹꽃 등나무는 현 천연기념물입니다.',
          '경내의 가사마 이나리 미술관은 옛 도자기를 전시합니다. 9:00~16:30(최종 입관 16:00), 어른 300엔.',
        ],
      },
      {
        id: 'pottery',
        heading: '도자기: 보고, 만들어 보기',
        table: [
          ['이바라키현 도예미술관', '가사마 예술의 숲 공원 안. 9:30~17:00(최종 입장 16:30). 월요일(공휴일이면 다음 평일)과 12월 29일~1월 1일 휴관. 기획전 기간 어른 950엔, 소장품전만 360엔.'],
          ['가사마 공예의 언덕', '미술관 옆. 10:00~17:00. 월요일(공휴일이면 다음 날)과 12월 25일~1월 1일 휴관. 도예 체험: 물레, 손빚기, 그림 그리기. 완성까지 약 3개월.'],
          ['가사마 예술의 숲 공원', '무료 입장, 8:30~17:00.'],
        ],
      },
      {
        id: 'plan',
        heading: '간단한 일정',
        body: [
          '오전에 가사마 이나리 신사, 이른 오후에 도예미술관(최종 입장 16:30), 마지막으로 17:00까지 여는 공예의 언덕. 화요일~일요일에 가세요.',
        ],
      },
    ],
    faqLabel: '자주 묻는 질문',
    faq: [
      { q: '신사는 월요일에도 여나요?', a: '신사는 참배 장소이고, 월요일에 쉬는 것은 미술관과 순환버스입니다. 신사의 시간은 공식 사이트에서 확인하세요.' },
      { q: '도예 체험은 예약이 필요한가요?', a: '가기 전에 가사마 공예의 언덕 공식 사이트를 확인하세요. 이 글에서는 예약 규정과 요금을 확인하지 못했습니다.' },
      { q: '작품을 해외로 보낼 수 있나요?', a: '확인하지 못했습니다. 예약 전에 가사마 공예의 언덕에 직접 문의하세요.' },
      { q: '무료 주차장이 있나요?', a: '가사마 예술의 숲 공원 주차장은 평소 무료지만, 골든위크 도자기 축제 같은 큰 행사 때는 유료입니다.' },
      { q: '미토와 함께 갈 수 있나요?', a: '네. 도모베는 조반선으로 미토로 가는 길에 있어 한 번의 여행으로 묶을 수 있습니다.' },
    ],
    sourcesLabel: '출처',
    sources: [
      { label: '가사마 이나리 신사(공식, 일본어)', url: SHRINE_URL },
      { label: '가사마 이나리 신사｜교통(공식, 일본어)', url: SHRINE_ACCESS_URL },
      { label: '가사마 이나리 미술관(공식, 일본어)', url: SHRINE_MUSEUM_URL },
      { label: '이바라키현 도예미술관｜이용 안내(공식, 일본어)', url: CERAMIC_MUSEUM_URL },
      { label: '가사마 공예의 언덕｜이용 안내(공식, 일본어)', url: CRAFTHILLS_URL },
      { label: '가사마시｜가사마 관광 순환버스(공식, 일본어)', url: BUS_URL },
    ],
    updatedLabel: '최종 업데이트',
    updatedDate: UPDATED,
    authorLabel: '작성',
    author: 'IBATOCO 편집부',
    disclaimer: '운영 시간, 요금, 교통 시간표는 변경될 수 있습니다. 출발 전 공식 사이트에서 확인해 주세요.',
    related: {
      label: '이어서 읽기',
      items: [
        { title: '가이라쿠엔 매화: 2027 미토 매화 축제 가이드', text: '미토는 도모베에서 조반선으로 조금만 더.', href: '/ko/kairakuen-plum-blossoms/' },
        { title: '쓰쿠바산: 아키하바라에서 떠나는 당일치기', text: '쓰쿠바 익스프레스로 가는 이바라키의 대표 산.', href: '/ko/mount-tsukuba/' },
      ],
    },
    place: { name: '가사마 이나리 신사', address: '일본 이바라키현 가사마시', url: SHRINE_URL },
  },
};
