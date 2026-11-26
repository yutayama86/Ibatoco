/**
 * 袋田の滝（大子町）の海外向けガイド（英語・繁體中文・한국어）。
 *
 * なぜこのページか:
 *  海外の検索は "Fukuroda Falls" "Fukuroda Falls frozen" "day trip from Tokyo" で来る。
 *  英語圏の既存ガイドには、2025年7月改定前の旧料金（大人300円）が多く残っている。
 *  公式の現行料金・冬の営業時間・凍結の実際（毎年凍るわけではない）を正確に出すことが差別化になる。
 *
 * 事実の扱い（2026-11-26 に大子町観光協会の公式サイトで再確認）:
 *  - 高さ120m・幅73m、「四度の滝」の由来（四段に落ちる／西行の言い伝え）、
 *    営業時間（5〜10月 8:00〜18:00 / 11月 8:00〜17:00 / 12〜4月 9:00〜17:00）、無休、
 *    トンネル利用料（個人 大人500円・子供300円、20名以上 大人400円・子供200円）、
 *    WEBチケット、第2観瀑台（2008年設置・3デッキ・全景）… fukuroda-falls.html
 *  - 袋田駅→滝本 バス約10分・大人260円、常陸大子駅→滝本 約15分・大人420円、滝本から徒歩約10分、
 *    袋田駅からタクシー約10分・徒歩約40分、袋田駅発バス 10:40/12:33/14:30、
 *    滝本発袋田駅行き 11:03/13:53/15:30、那珂ICから約50分、町営無料駐車場2か所 … fukuroda-falls/access.html
 *  - 氷瀑：例年12月下旬〜2月の厳冬期、凍らない年もある、完全凍結は最近では2012年、朝方をすすめる
 *    … fukuroda-falls/hyobaku.html（2026-11-03 確認。日本語記事 fukuroda-falls-winter-guide と同じ根拠）
 *  - ライトアップ「大子来人」2026-11-07〜2027-01-31、12/1〜1/31 は観瀑トンネル 9:00〜19:00、
 *    点灯 16:30〜19:00 … fukuroda-falls/daigolight.html（2026-11-03 確認）
 *  - 水郡線：水戸発で常陸大子まで行く列車は1日13本・日中おおむね2時間に1本、
 *    例 水戸11:15発→袋田12:29着、常陸大子発は11:23の次が14:09 … JR東日本 時刻表（2026年11月、2026-11-03 確認）
 *  - 常磐線：特急ひたち1号 上野7:00発→水戸8:13着 … JR東日本 時刻表（2026-11-03 確認）
 *  - 運賃（JR）は書かない。公式の金額を確認していないため。
 *  - 「日本三名瀑」は大子町観光協会・県資料で使われる通称として書く（公的な指定ではない）。国の名勝は日本語エリアガイドの記載に合わせる。
 *  - 写真は載せない。手元の袋田の滝の写真は Wikimedia の借用で、海外ガイドは自前写真のみの方針のため。
 *  直訳はしない。市場ごとに導入・強調点を変える。
 *  ライトアップの日付は 2027-01-31 で終わる。2月以降に更新するときは該当行を外す。
 */
import type { IntlGuide } from './intl-guides';
import type { Locale } from './i18n';

const FALLS_URL = 'https://www.daigo-kanko.jp/fukuroda-falls.html';
const ACCESS_URL = 'https://www.daigo-kanko.jp/fukuroda-falls/access.html';
const HYOBAKU_URL = 'https://www.daigo-kanko.jp/fukuroda-falls/hyobaku.html';
const LIGHT_URL = 'https://www.daigo-kanko.jp/fukuroda-falls/daigolight.html';
const JR_MITO_SUIGUN_URL = 'https://timetables.jreast.co.jp/2611/timetable/tt1471/1471040.html';
const UPDATED = '2026-11-26';

export const FUKURODA_FALLS: Record<Exclude<Locale, 'ja'>, IntlGuide> = {
  en: {
    slug: 'fukuroda-falls',
    translationKey: 'fukuroda-falls',
    title: 'Fukuroda Falls from Tokyo: Frozen Falls, Hours, Tickets & Access',
    description: 'How to visit Fukuroda Falls in Daigo, Ibaraki, from Tokyo by train and bus: the current ¥500 tunnel fee, seasonal hours, when the falls may freeze (and why it is not every year), and the bus times that decide your day.',
    h1: 'Fukuroda Falls: A Day Trip from Tokyo to the "Four-Times Falls"',
    lead: [
      'Fukuroda Falls, in the mountain town of Daigo in northern Ibaraki, drops 120 meters down a rock face 73 meters wide in four separate tiers. It is often counted among Japan’s three great waterfalls.',
      'Its other name, Yodo-no-taki, means the “four-times falls.” The local tourism association gives two reasons: the water falls in four steps, and the 12th-century poet-monk Saigyo is said to have praised it by saying you cannot truly appreciate it unless you come once in each season.',
      'Many English guides still list the old ¥300 ticket. The tunnel fee is now ¥500 for adults. This guide uses only what we could confirm with the Daigo Tourism Association and JR East.',
    ],
    routeChain: {
      label: 'The route at a glance',
      steps: [
        { place: 'Ueno / Tokyo', note: 'JR Joban Line limited express' },
        { place: 'Mito Station', note: 'change to the JR Suigun Line' },
        { place: 'Fukuroda Station', note: 'bus about 10 min' },
        { place: 'Takimoto stop', note: 'walk about 10 min' },
        { place: 'Fukuroda Falls tunnel' },
      ],
    },
    quickAnswerLabel: 'Quick answers',
    quickAnswer: [
      { q: 'How much is the ticket?', a: '¥500 for adults (15 and over, excluding junior high students) and ¥300 for elementary and junior high students. Groups of 20 or more pay ¥400 / ¥200.' },
      { q: 'What are the hours?', a: 'May–October 8:00–18:00, November 8:00–17:00, December–April 9:00–17:00. Open every day.' },
      { q: 'Does it freeze every winter?', a: 'No. The tourism association says the ice-fall season is usually late December to February, but some years it barely freezes. The last full freeze it mentions was in 2012.' },
      { q: 'Can I do it without a car?', a: 'Yes, but plan around the trains and buses. Suigun Line trains run roughly every two hours during the day, and the bus from Fukuroda Station runs only a few times a day.' },
      { q: 'How long should I stay?', a: 'About an hour for the tunnel and both viewing decks. Your return train usually decides the rest.' },
    ],
    sections: [
      {
        id: 'getting-there',
        heading: 'How to get there from Tokyo',
        body: [
          'Take the JR Joban Line limited express to Mito, then the JR Suigun Line to Fukuroda Station. From there, a local bus goes to the Takimoto stop, about a 10-minute walk from the falls.',
          'An example from JR East’s November 2026 timetable: the limited express Hitachi 1 leaves Ueno at 7:00 and reaches Mito at 8:13. On the Suigun Line, the 11:15 from Mito arrives at Fukuroda at 12:29, which connects with the 12:33 bus.',
        ],
        table: [
          ['Train 1', 'JR Joban Line limited express to Mito (e.g. Ueno 7:00 → Mito 8:13). All seats are reserved.'],
          ['Train 2', 'JR Suigun Line from Mito to Fukuroda Station. Trains that go as far as Hitachi-Daigo run about every two hours during the day. Some Suigun Line trains stop short of Fukuroda, so check the destination before boarding.'],
          ['Bus', 'Fukuroda Station → Takimoto: about 10 minutes, ¥260 for adults. Departures listed by the tourism association: 10:40, 12:33, 14:30.'],
          ['Bus back', 'Takimoto → Fukuroda Station: 11:03, 13:53, 15:30.'],
          ['Other options', 'Taxi from Fukuroda Station: about 10 minutes. On foot: about 40 minutes. From Hitachi-Daigo Station, the bus to Takimoto takes about 15 minutes (¥420).'],
          ['By car', 'About 50 minutes from Naka IC on the Joban Expressway. Two free town parking lots, 1.2–1.4 km from the falls.'],
        ],
      },
      {
        id: 'timing',
        heading: 'The one thing that decides your day: the timetable',
        body: [
          'The bus from Fukuroda Station has only a few departures, and the Suigun Line runs about every two hours. Pick your return train before you leave Tokyo, then work backward.',
          'Going back toward Mito, there is a gap of over two and a half hours after midday: departures from Hitachi-Daigo jump from 11:23 to 14:09. A taxi from Fukuroda Station gives you more flexibility if the bus times do not fit.',
        ],
      },
      {
        id: 'inside',
        heading: 'What you will see',
        body: [
          'You reach the falls through a tunnel cut into the rock. At the end is the first viewing deck, close to the base of the falls, and a passage to a suspension bridge.',
          'An elevator takes you up to the second viewing deck, added in 2008. Its three platforms show all four tiers at once. This is where most photos of the whole falls are taken.',
          'The tourism association sells web tickets (via asoview) that let you skip the ticket window.',
        ],
      },
      {
        id: 'winter',
        heading: 'Winter: will the falls be frozen?',
        body: [
          'In a long cold spell, the falls can turn partly white with ice, which is known in Japanese as hyobaku. The tourism association puts the usual season at late December to February, but says some winters barely freeze. It last describes a full freeze in 2012.',
          'Ice melts as the sun rises, so the association recommends going in the cold early morning. In winter the tunnel opens at 9:00.',
          'Before you go, check the association’s ice-fall report (氷瀑速報), which shows how much of the falls is frozen, the temperature, and the time each photo was taken. We do not predict freezing here.',
        ],
      },
      {
        id: 'light-up',
        heading: 'Evening light-up (until January 31, 2027)',
        body: [
          'The “Daigo Light” illumination runs daily from November 7, 2026 to January 31, 2027. From December 1 to January 31, the tunnel stays open from 9:00 to 19:00, and the falls are lit from 16:30 to 19:00.',
          'If you stay for the light-up, check your return train first. The last Suigun Line train toward Mito leaves Fukuroda at 20:34.',
        ],
      },
    ],
    faqLabel: 'FAQ',
    faq: [
      { q: 'Is Fukuroda Falls worth a day trip from Tokyo?', a: 'Yes, if you plan around the Suigun Line and bus times. It is a long day by train, so some visitors combine it with Mito or stay a night in Daigo.' },
      { q: 'Why do some websites say the ticket is ¥300?', a: 'That was the old price. The Daigo Tourism Association now lists ¥500 for adults and ¥300 for children.' },
      { q: 'When is the best chance to see the falls frozen?', a: 'In cold mornings between late December and February, according to the tourism association. It does not happen every year, so check the ice-fall report before you go.' },
      { q: 'Is it open in winter?', a: 'Yes. It is open every day, 9:00–17:00 from December to April, and until 19:00 during the light-up period from December 1 to January 31.' },
      { q: 'Do I need to book?', a: 'No booking is required. Web tickets are available if you want to skip the ticket window.' },
    ],
    sourcesLabel: 'Sources',
    sources: [
      { label: 'Daigo Tourism Association — Fukuroda Falls (official, Japanese)', url: FALLS_URL },
      { label: 'Daigo Tourism Association — Access, bus times and parking (official, Japanese)', url: ACCESS_URL },
      { label: 'Daigo Tourism Association — Ice-fall report (official, Japanese)', url: HYOBAKU_URL },
      { label: 'Daigo Tourism Association — Daigo Light illumination (official, Japanese)', url: LIGHT_URL },
      { label: 'JR East — Mito Station, Suigun Line timetable', url: JR_MITO_SUIGUN_URL },
    ],
    updatedLabel: 'Last updated',
    updatedDate: UPDATED,
    authorLabel: 'Written by',
    author: 'IBATOCO Editorial Team',
    disclaimer: 'Fees, hours and timetables can change. Please check the official websites before you travel.',
    related: {
      label: 'Read next',
      items: [
        { title: 'How to Get to Hitachi Seaside Park from Tokyo', text: 'Ibaraki’s flower hill on the coast, with the train-and-bus route from Tokyo.', href: '/en/hitachi-seaside-park-from-tokyo/' },
      ],
    },
    place: { name: 'Fukuroda Falls', address: '3-19 Fukuroda, Daigo, Kuji District, Ibaraki, Japan', url: FALLS_URL },
  },

  'zh-tw': {
    slug: 'fukuroda-falls',
    translationKey: 'fukuroda-falls',
    title: '袋田瀑布怎麼去？從東京出發交通、門票、冰瀑時期與點燈攻略',
    description: '日本三大名瀑之一的袋田瀑布（茨城縣大子町）。整理從東京搭電車與巴士的走法、2025年起調整的門票500日圓、各季節開放時間、冰瀑何時可能出現，以及冬季點燈。依大子町觀光協會官方資料查證。',
    h1: '袋田瀑布：從東京出發的交通、門票與冰瀑攻略',
    lead: [
      '袋田瀑布位於茨城縣北部的山城大子町，高120公尺、寬73公尺，水流分成四段落下，常被列為日本三大名瀑之一。',
      '它又叫「四度瀑布」。一說是因為水流分四段，另一說是平安時代的歌僧西行讚嘆：一年四季各來一次，才能真正體會它的美。',
      '網路上不少資料還寫著舊票價300日圓，目前大人門票是500日圓。本篇只寫能在大子町觀光協會與JR東日本官方資料確認的內容。',
    ],
    routeChain: {
      label: '路線一次看懂',
      steps: [
        { place: '上野／東京', note: 'JR常磐線特急' },
        { place: '水戶站', note: '轉乘JR水郡線' },
        { place: '袋田站', note: '巴士約10分鐘' },
        { place: '「滝本」站牌', note: '步行約10分鐘' },
        { place: '袋田瀑布隧道入口' },
      ],
    },
    quickAnswerLabel: '快速重點',
    quickAnswer: [
      { q: '門票多少？', a: '大人（15歲以上，國中生除外）500日圓，國小・國中生300日圓。20人以上團體400日圓／200日圓。' },
      { q: '開放時間？', a: '5～10月 8:00～18:00，11月 8:00～17:00，12～4月 9:00～17:00。全年無休。' },
      { q: '冬天一定會結冰嗎？', a: '不一定。觀光協會表示冰瀑季節通常在12月下旬到2月，但有些年份幾乎不結冰；完全結冰最近一次是2012年。' },
      { q: '不開車能去嗎？', a: '可以，但要配合班次。水郡線白天大約2小時一班，袋田站出發的巴士一天只有幾班。' },
      { q: '要待多久？', a: '隧道加兩個觀瀑台約1小時，其餘時間通常由回程電車決定。' },
    ],
    sections: [
      {
        id: 'getting-there',
        heading: '從東京怎麼去',
        body: [
          '搭JR常磐線特急到水戶，轉JR水郡線到袋田站，再搭路線巴士到「滝本」站牌，步行約10分鐘即可抵達。',
          '以JR東日本2026年11月時刻表為例：特急常陸1號上野7:00發、水戶8:13到。水郡線水戶11:15發、袋田12:29到，可以接上12:33的巴士。',
        ],
        table: [
          ['電車①', 'JR常磐線特急到水戶（例：上野7:00→水戶8:13），全車對號座。'],
          ['電車②', 'JR水郡線水戶→袋田站。開到常陸大子的班次白天約2小時一班；部分班次不到袋田，上車前請確認終點站。'],
          ['巴士', '袋田站→滝本 約10分鐘，大人260日圓。觀光協會列出的班次：10:40、12:33、14:30。'],
          ['回程巴士', '滝本→袋田站：11:03、13:53、15:30。'],
          ['其他方式', '袋田站搭計程車約10分鐘，步行約40分鐘。從常陸大子站搭巴士到滝本約15分鐘（420日圓）。'],
          ['自駕', '常磐自動車道那珂IC約50分鐘。有兩處町營免費停車場，距瀑布約1.2～1.4公里。'],
        ],
      },
      {
        id: 'timing',
        heading: '行程成敗的關鍵：班次表',
        body: [
          '袋田站出發的巴士一天只有幾班，水郡線也大約2小時一班。建議出發前先決定回程電車，再往回推算。',
          '往水戶方向的回程，中午過後有超過兩個半小時的空檔：常陸大子發車的班次從11:23直接跳到14:09。巴士時間對不上時，從袋田站搭計程車會比較彈性。',
        ],
      },
      {
        id: 'inside',
        heading: '可以看到什麼',
        body: [
          '穿過鑿入岩壁的隧道，盡頭是靠近瀑潭的第一觀瀑台，還有通往吊橋的通道。',
          '搭電梯可上到2008年設置的第二觀瀑台，三個平台能一次看到四段瀑布的全景，大多數全景照片都是在這裡拍的。',
          '觀光協會有提供網路票（asoview），可以不用在窗口排隊。',
        ],
      },
      {
        id: 'winter',
        heading: '冬天：瀑布會結冰嗎？',
        body: [
          '寒冷天氣持續時，瀑布會部分結冰變白，日文稱為「氷瀑（冰瀑）」。觀光協會表示通常在12月下旬到2月的嚴冬期，但有的冬天幾乎不結冰；完全結冰最近一次是2012年。',
          '冰會隨日出融化，觀光協會建議在氣溫低的早上前往。冬季隧道9:00開放。',
          '出發前請查看觀光協會的「氷瀑速報」，會刊出結冰比例、氣溫與拍攝時間。本篇不做結冰預測。',
        ],
      },
      {
        id: 'light-up',
        heading: '夜間點燈（至2027年1月31日）',
        body: [
          '「大子來人（Daigo Light）」點燈活動於2026年11月7日至2027年1月31日每天舉行。12月1日至1月31日，隧道開放9:00～19:00，瀑布點燈16:30～19:00。',
          '想看點燈的話，請先確認回程電車。往水戶方向的水郡線末班車袋田20:34發。',
        ],
      },
    ],
    faqLabel: '常見問題',
    faq: [
      { q: '從東京當天來回可行嗎？', a: '可行，但要配合水郡線與巴士班次。搭電車行程較長，也有人會搭配水戶，或在大子住一晚。' },
      { q: '為什麼有些網站寫門票300日圓？', a: '那是舊價格。大子町觀光協會目前公布的是大人500日圓、兒童300日圓。' },
      { q: '什麼時候最有機會看到冰瀑？', a: '依觀光協會說明，12月下旬到2月的寒冷早晨。並非每年都會結冰，出發前請看氷瀑速報。' },
      { q: '冬天有開放嗎？', a: '有。全年無休，12～4月9:00～17:00；12月1日至1月31日點燈期間開放到19:00。' },
      { q: '需要預約嗎？', a: '不需要。想省去排隊可以買網路票。' },
    ],
    sourcesLabel: '資料來源',
    sources: [
      { label: '大子町觀光協會｜袋田瀑布（官方，日文）', url: FALLS_URL },
      { label: '大子町觀光協會｜交通、巴士時刻與停車場（官方，日文）', url: ACCESS_URL },
      { label: '大子町觀光協會｜氷瀑速報（官方，日文）', url: HYOBAKU_URL },
      { label: '大子町觀光協會｜大子來人點燈（官方，日文）', url: LIGHT_URL },
      { label: 'JR東日本｜水戶站 水郡線時刻表', url: JR_MITO_SUIGUN_URL },
    ],
    updatedLabel: '最後更新',
    updatedDate: UPDATED,
    authorLabel: '撰文',
    author: 'IBATOCO 編輯部',
    disclaimer: '票價、開放時間與班次可能變動，出發前請務必確認官方網站。',
    related: {
      label: '延伸閱讀',
      items: [
        { title: '國營常陸海濱公園怎麼去？從東京出發完整攻略', text: '茨城海岸的花海山丘，以及從東京搭電車與巴士的走法。', href: '/zh-tw/hitachi-seaside-park-from-tokyo/' },
      ],
    },
    place: { name: '袋田瀑布', address: '日本茨城縣久慈郡大子町袋田3-19', url: FALLS_URL },
  },

  ko: {
    slug: 'fukuroda-falls',
    translationKey: 'fukuroda-falls',
    title: '후쿠로다 폭포 가는 법: 도쿄에서 교통·입장료·얼음 폭포 시기·라이트업',
    description: '일본 3대 폭포로 꼽히는 이바라키현 다이고마치의 후쿠로다 폭포. 도쿄에서 전철과 버스로 가는 법, 2025년부터 바뀐 입장료 500엔, 계절별 운영 시간, 폭포가 언제 얼 수 있는지, 겨울 라이트업까지 다이고마치 관광협회 공식 정보로 정리했습니다.',
    h1: '후쿠로다 폭포: 도쿄에서 가는 법과 겨울 얼음 폭포',
    lead: [
      '후쿠로다 폭포는 이바라키현 북부의 산골 마을 다이고마치에 있습니다. 높이 120m, 폭 73m의 암벽을 물이 네 단으로 나뉘어 떨어지며, 흔히 일본 3대 폭포 중 하나로 꼽힙니다.',
      '별명은 ‘요도노타키(네 번의 폭포)’입니다. 물이 네 단으로 떨어지기 때문이라는 설과, 12세기 승려 시인 사이교가 “사계절에 한 번씩 와 봐야 진짜 멋을 안다”고 감탄했다는 설이 전해집니다.',
      '인터넷에는 아직 예전 요금 300엔이 많이 남아 있지만, 지금 어른 입장료는 500엔입니다. 이 글은 다이고마치 관광협회와 JR 동일본 공식 정보로 확인한 내용만 담았습니다.',
    ],
    routeChain: {
      label: '한눈에 보는 경로',
      steps: [
        { place: '우에노 / 도쿄', note: 'JR 조반선 특급' },
        { place: '미토역', note: 'JR 스이군선으로 환승' },
        { place: '후쿠로다역', note: '버스 약 10분' },
        { place: '‘다키모토’ 정류장', note: '도보 약 10분' },
        { place: '후쿠로다 폭포 터널 입구' },
      ],
    },
    quickAnswerLabel: '핵심 요약',
    quickAnswer: [
      { q: '입장료는?', a: '어른(15세 이상, 중학생 제외) 500엔, 초등·중학생 300엔. 20명 이상 단체는 400엔/200엔.' },
      { q: '운영 시간은?', a: '5~10월 8:00~18:00, 11월 8:00~17:00, 12~4월 9:00~17:00. 연중무휴.' },
      { q: '겨울이면 꼭 얼어요?', a: '아닙니다. 관광협회는 얼음 폭포 시즌을 보통 12월 하순~2월로 보지만, 거의 얼지 않는 해도 있다고 합니다. 완전히 언 것은 최근 2012년이라고 안내합니다.' },
      { q: '차 없이 갈 수 있나요?', a: '가능합니다. 다만 스이군선은 낮에 약 2시간에 1대, 후쿠로다역 출발 버스는 하루 몇 대뿐이라 시간표에 맞춰야 합니다.' },
      { q: '얼마나 머물면 되나요?', a: '터널과 전망대 두 곳에 약 1시간. 나머지는 돌아가는 열차 시간이 정합니다.' },
    ],
    sections: [
      {
        id: 'getting-there',
        heading: '도쿄에서 가는 법',
        body: [
          'JR 조반선 특급으로 미토까지 가서 JR 스이군선으로 갈아타고 후쿠로다역에서 내립니다. 역에서 노선버스로 ‘다키모토’ 정류장까지 가면 폭포까지 걸어서 약 10분입니다.',
          'JR 동일본의 2026년 11월 시간표 예시입니다. 특급 히타치 1호는 우에노 7:00 출발, 미토 8:13 도착입니다. 스이군선 미토 11:15 출발 열차는 후쿠로다에 12:29에 도착해 12:33 버스와 이어집니다.',
        ],
        table: [
          ['열차 1', 'JR 조반선 특급으로 미토까지(예: 우에노 7:00 → 미토 8:13). 전석 지정석입니다.'],
          ['열차 2', 'JR 스이군선 미토 → 후쿠로다역. 히타치다이고까지 가는 열차는 낮에 약 2시간에 1대입니다. 후쿠로다까지 가지 않는 열차도 있으니 행선지를 확인하세요.'],
          ['버스', '후쿠로다역 → 다키모토 약 10분, 어른 260엔. 관광협회 안내 출발 시각: 10:40, 12:33, 14:30.'],
          ['돌아오는 버스', '다키모토 → 후쿠로다역: 11:03, 13:53, 15:30.'],
          ['다른 방법', '후쿠로다역에서 택시 약 10분, 도보 약 40분. 히타치다이고역에서 다키모토까지 버스 약 15분(420엔).'],
          ['자동차', '조반 자동차도 나카 IC에서 약 50분. 폭포에서 1.2~1.4km 떨어진 무료 공영 주차장이 두 곳 있습니다.'],
        ],
      },
      {
        id: 'timing',
        heading: '하루를 좌우하는 것: 시간표',
        body: [
          '후쿠로다역 출발 버스는 하루 몇 대뿐이고, 스이군선도 약 2시간에 1대입니다. 도쿄를 나서기 전에 돌아올 열차를 먼저 정하고 거꾸로 계획하세요.',
          '미토 방향으로 돌아올 때는 점심 이후 2시간 반 넘게 열차가 없습니다. 히타치다이고 출발이 11:23 다음 14:09입니다. 버스 시간이 맞지 않으면 후쿠로다역에서 택시를 타는 편이 유연합니다.',
        ],
      },
      {
        id: 'inside',
        heading: '무엇을 볼 수 있나',
        body: [
          '암벽을 뚫은 터널을 지나면 끝에 폭포 아래쪽과 가까운 제1전망대와, 흔들다리로 가는 통로가 있습니다.',
          '엘리베이터로 올라가는 제2전망대(2008년 설치)에는 데크가 세 곳 있어 네 단의 폭포 전체를 한 번에 볼 수 있습니다. 폭포 전체 사진은 대부분 여기서 찍습니다.',
          '관광협회는 창구에 줄 서지 않고 들어갈 수 있는 웹 티켓(asoview)도 안내합니다.',
        ],
      },
      {
        id: 'winter',
        heading: '겨울: 폭포가 얼어 있을까?',
        body: [
          '추위가 이어지면 폭포가 부분적으로 하얗게 얼어붙습니다. 일본어로 ‘효바쿠(얼음 폭포)’라고 합니다. 관광협회는 보통 12월 하순~2월의 혹한기로 보지만, 거의 얼지 않는 겨울도 있다고 합니다. 완전히 언 것은 최근 2012년이라고 안내합니다.',
          '얼음은 해가 뜨면 녹기 때문에 관광협회는 기온이 낮은 아침을 권합니다. 겨울에는 터널이 9:00에 엽니다.',
          '가기 전에 관광협회의 ‘효바쿠 속보(氷瀑速報)’를 확인하세요. 얼어 있는 비율, 기온, 촬영 시각이 나옵니다. 이 글에서는 결빙을 예측하지 않습니다.',
        ],
      },
      {
        id: 'light-up',
        heading: '야간 라이트업(2027년 1월 31일까지)',
        body: [
          '라이트업 ‘다이고 라이트’는 2026년 11월 7일부터 2027년 1월 31일까지 매일 열립니다. 12월 1일~1월 31일에는 터널이 9:00~19:00, 폭포 점등은 16:30~19:00입니다.',
          '라이트업을 볼 생각이라면 돌아가는 열차부터 확인하세요. 미토 방향 스이군선 막차는 후쿠로다 20:34 출발입니다.',
        ],
      },
    ],
    faqLabel: '자주 묻는 질문',
    faq: [
      { q: '도쿄에서 당일치기가 가능한가요?', a: '스이군선과 버스 시간에 맞추면 가능합니다. 전철로는 긴 하루가 되므로 미토와 묶거나 다이고에서 1박하는 사람도 있습니다.' },
      { q: '입장료가 300엔이라는 사이트가 있던데요?', a: '예전 요금입니다. 다이고마치 관광협회는 현재 어른 500엔, 어린이 300엔으로 안내합니다.' },
      { q: '얼음 폭포를 볼 확률이 가장 높은 때는?', a: '관광협회에 따르면 12월 하순~2월의 추운 아침입니다. 매년 어는 것은 아니니 효바쿠 속보를 확인하세요.' },
      { q: '겨울에도 문을 여나요?', a: '네. 연중무휴이며 12~4월은 9:00~17:00, 라이트업 기간인 12월 1일~1월 31일은 19:00까지입니다.' },
      { q: '예약이 필요한가요?', a: '필요 없습니다. 줄을 서지 않으려면 웹 티켓을 이용하세요.' },
    ],
    sourcesLabel: '출처',
    sources: [
      { label: '다이고마치 관광협회｜후쿠로다 폭포(공식, 일본어)', url: FALLS_URL },
      { label: '다이고마치 관광협회｜교통·버스 시간·주차장(공식, 일본어)', url: ACCESS_URL },
      { label: '다이고마치 관광협회｜효바쿠 속보(공식, 일본어)', url: HYOBAKU_URL },
      { label: '다이고마치 관광협회｜다이고 라이트 라이트업(공식, 일본어)', url: LIGHT_URL },
      { label: 'JR 동일본｜미토역 스이군선 시간표', url: JR_MITO_SUIGUN_URL },
    ],
    updatedLabel: '최종 업데이트',
    updatedDate: UPDATED,
    authorLabel: '작성',
    author: 'IBATOCO 편집부',
    disclaimer: '요금과 운영 시간, 교통 시간표는 변경될 수 있습니다. 출발 전 공식 사이트에서 확인해 주세요.',
    related: {
      label: '이어서 읽기',
      items: [
        { title: '도쿄에서 히타치 해변공원 가는 법', text: '이바라키 해안의 꽃 언덕과, 도쿄에서 전철·버스로 가는 경로.', href: '/ko/hitachi-seaside-park-from-tokyo/' },
      ],
    },
    place: { name: '후쿠로다 폭포', address: '일본 이바라키현 구지군 다이고마치 후쿠로다 3-19', url: FALLS_URL },
  },
};
