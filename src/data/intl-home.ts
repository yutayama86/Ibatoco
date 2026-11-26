/**
 * 海外向けトップページの文言（言語ごとに独立して設計）。
 * 日本語トップの翻訳ではなく、「東京から来る外国人旅行者」を入口にした構成にする。
 * リンクは TRANSLATIONS に登録済みの実在ページだけ（リンク切れが構造上できない）。
 */
import type { Locale } from './i18n';

export interface IntlHome {
  title: string;
  description: string;
  kicker: string;
  h1: string;
  lead: string[];
  /** 冒頭の写真（Kakidai / Wikimedia Commons / CC BY-SA 4.0。日本語TOPのFVと同じ原本）の代替テキストとクレジット表記 */
  heroPhoto: { alt: string; credit: string; cropped: string };
  whyHeading: string;
  why: { title: string; text: string }[];
  guidesHeading: string;
  guidesIntro: string;
  guides: { key: string; title: string; text: string; cta: string }[];
  trustHeading: string;
  trustBody: string[];
}

export const INTL_HOME: Record<Exclude<Locale, 'ja'>, IntlHome> = {
  en: {
    title: 'Ibaraki Travel Guide — Just Beyond Tokyo | IBATOCO',
    description: 'Ibaraki is about two hours from Tokyo: seaside parks, flower hills, waterfalls and coastal towns. Practical, fact-checked travel guides written by a local media team based in Ibaraki.',
    kicker: 'IBARAKI, JAPAN',
    heroPhoto: { alt: 'Blue nemophila in bloom at Hitachi Seaside Park', credit: 'Photo', cropped: 'cropped' },
    h1: 'Just beyond Tokyo, a coast most visitors never reach.',
    lead: [
      'Ibaraki sits on the Pacific coast northeast of Tokyo — close enough for a day trip, far enough that it never feels like a tourist queue.',
      'We are a local media team based here. We visit places ourselves, talk to the people who run them, and publish only what we can confirm with official sources.',
    ],
    whyHeading: 'Why come here',
    why: [
      { title: 'Reachable in about two hours', text: 'Limited express trains run from Tokyo Station into Ibaraki, so a day trip is realistic without renting a car.' },
      { title: 'Seasons you can plan around', text: 'Blue nemophila hills in spring, deep red kochia in autumn, and a coastline that changes completely between summer and winter.' },
      { title: 'Fewer crowds than the usual routes', text: 'You will still find famous views here, but rarely the queues of Japan’s most-visited circuits.' },
    ],
    guidesHeading: 'Start here',
    guidesIntro: 'We are building these guides one at a time, and we would rather publish a few well-checked pages than many thin ones.',
    guides: [
      {
        key: 'hitachi-seaside-park-from-tokyo',
        title: 'How to Get to Hitachi Seaside Park from Tokyo',
        text: 'The blue flower hill, and exactly how to reach it by train and bus — with admission fees and season dates from the park’s official site.',
        cta: 'Read the guide',
      },
      {
        key: 'hitachi-seaside-park-nemophila',
        title: 'Nemophila at Hitachi Seaside Park: When to Go in 2027',
        text: 'Bloom season, flower-season admission, opening hours and closed days — and what the park has not announced for 2027 yet.',
        cta: 'Read the guide',
      },
      {
        key: 'fukuroda-falls',
        title: 'Fukuroda Falls: A Day Trip from Tokyo',
        text: 'A four-tier waterfall in the mountains of northern Ibaraki — the current ticket price, winter hours, when it may freeze, and the bus times that decide your day.',
        cta: 'Read the guide',
      },
      {
        key: 'kairakuen-plum-blossoms',
        title: 'Kairakuen Plum Blossoms: Mito Plum Festival 2027',
        text: 'Japan’s plum season comes before the cherry blossoms. Festival dates (February 11 – March 22), the festival-period ticket price, the night illumination, and the bus from Mito Station.',
        cta: 'Read the guide',
      },
      {
        key: 'oarai-isosaki-shrine',
        title: 'Oarai Isosaki Shrine: The Torii in the Sea at Sunrise',
        text: 'A torii on a sea rock — and it is a sunrise view, not a sunset. Shrine hours, New Year’s Day, the cash-only line from Mito, and Aqua World Oarai nearby.',
        cta: 'Read the guide',
      },
      {
        key: 'ushiku-daibutsu',
        title: 'Ushiku Daibutsu: The 120-Meter Buddha You Can Walk Inside',
        text: 'A bronze Buddha with a viewing floor at 85 meters. Tickets, winter closing times, free entry on January 1–3, and the bus from JR Ushiku Station.',
        cta: 'Read the guide',
      },
      {
        key: 'mount-tsukuba',
        title: 'Mount Tsukuba: A Day Trip from Akihabara',
        text: 'About 45 minutes by train from Akihabara. Cable car and ropeway fares, the winter closure dates, and an easy up-one-way, down-the-other route.',
        cta: 'Read the guide',
      },
    ],
    trustHeading: 'How we work',
    trustBody: [
      'Every figure on this site comes from an official source — the park, the operator, the city or the prefecture — and we link to it. Where we could not confirm something, we say so instead of guessing.',
      'Fees, opening hours and timetables change. Please check the official website before you travel.',
    ],
  },

  'zh-tw': {
    title: '茨城旅遊指南｜從東京出發的近郊小旅行 | IBATOCO',
    description: '茨城距離東京約兩小時，有海濱公園、粉蝶花山丘、瀑布與海岸小鎮。由茨城在地媒體實際走訪、查證官方資料後撰寫的實用旅遊指南。',
    kicker: '日本 茨城',
    heroPhoto: { alt: '國營常陸海濱公園盛開的粉蝶花（Nemophila）', credit: '照片', cropped: '經裁切' },
    h1: '距離東京兩小時，多數旅客還沒去過的海岸。',
    lead: [
      '茨城位於東京東北方的太平洋沿岸——近到可以當天來回，卻又不像熱門景點那樣總是在排隊。',
      '我們是在地的茨城媒體。親自走訪、與當地經營者對話，只刊登能在官方資料查證的內容。',
    ],
    whyHeading: '為什麼值得來',
    why: [
      { title: '約兩小時就到', text: '從東京車站有特急直達茨城，不用租車也能安排一日遊。' },
      { title: '季節分明，好安排行程', text: '春天的藍色粉蝶花、秋天的紅色掃帚草，還有夏冬截然不同的海岸線。' },
      { title: '人潮相對少', text: '這裡一樣有代表性的風景，但很少出現日本熱門路線那種人擠人的狀況。' },
    ],
    guidesHeading: '從這裡開始',
    guidesIntro: '我們一篇一篇慢慢做。比起大量但空泛的內容，我們寧可先把少數幾篇查證清楚。',
    guides: [
      {
        key: 'hitachi-seaside-park-from-tokyo',
        title: '國營常陸海濱公園怎麼去？從東京出發完整攻略',
        text: '藍色的粉蝶花山丘，以及搭電車與巴士前往的實際走法。門票與季節期間皆引用公園官方資料。',
        cta: '閱讀攻略',
      },
      {
        key: 'hitachi-seaside-park-nemophila',
        title: '2027常陸海濱公園粉蝶花：什麼時候去最好',
        text: '花期、花季門票、開園時間與休園日，以及公園尚未公布的2027年資訊。',
        cta: '閱讀攻略',
      },
      {
        key: 'fukuroda-falls',
        title: '袋田瀑布：從東京出發的交通、門票與冰瀑攻略',
        text: '茨城北部山中的四段瀑布。目前的門票、冬季開放時間、冰瀑可能出現的時期，以及決定行程的巴士班次。',
        cta: '閱讀攻略',
      },
      {
        key: 'kairakuen-plum-blossoms',
        title: '偕樂園賞梅：2027水戶梅花祭攻略',
        text: '比櫻花更早的梅花季。梅花祭日期（2月11日至3月22日）、期間門票、夜間點燈，以及從水戶站搭巴士的走法。',
        cta: '閱讀攻略',
      },
      {
        key: 'oarai-isosaki-shrine',
        title: '大洗磯前神社：海上鳥居的日出',
        text: '立在海中礁石上的鳥居，看的是日出不是夕陽。開門時間、元旦初日出、水戶出發只收現金的鐵道，以及附近的大洗水族館。',
        cta: '閱讀攻略',
      },
      {
        key: 'ushiku-daibutsu',
        title: '牛久大佛：可以走進去的120公尺大佛',
        text: '離地85公尺有展望台的青銅大佛。門票、冬季閉園時間、1月1～3日免費參拜，以及從JR牛久站搭巴士的走法。',
        cta: '閱讀攻略',
      },
      {
        key: 'mount-tsukuba',
        title: '筑波山：從秋葉原出發的一日遊',
        text: '從秋葉原搭電車約45分鐘。地面纜車與空中纜車票價、冬季停駛日，以及上下山各搭一種的簡單路線。',
        cta: '閱讀攻略',
      },
    ],
    trustHeading: '我們的做法',
    trustBody: [
      '本站的數字都來自官方——公園、交通業者、市町村或茨城縣——並附上原始連結。無法查證的部分，我們會直接說明，而不是憑推測填空。',
      '票價、開放時間與班次可能變動，出發前請務必確認官方網站。',
    ],
  },

  ko: {
    title: '이바라키 여행 가이드 — 도쿄 근교 | IBATOCO',
    description: '이바라키는 도쿄에서 약 2시간. 해변공원과 꽃 언덕, 폭포와 바닷가 마을이 있습니다. 이바라키 현지 매체가 직접 찾아가 공식 자료로 확인해 쓴 실용 여행 가이드.',
    kicker: '일본 이바라키',
    heroPhoto: { alt: '히타치 해변공원에 핀 네모필라', credit: '사진', cropped: '일부 잘라냄' },
    h1: '도쿄에서 두 시간, 아직 많이 알려지지 않은 바닷가.',
    lead: [
      '이바라키는 도쿄 북동쪽 태평양 연안에 있습니다. 당일치기가 가능할 만큼 가깝지만, 유명 관광지처럼 줄을 서는 일은 드뭅니다.',
      '저희는 이곳에 기반을 둔 로컬 미디어입니다. 직접 찾아가고, 그곳을 지키는 사람들의 이야기를 듣고, 공식 자료로 확인된 것만 싣습니다.',
    ],
    whyHeading: '왜 이바라키인가',
    why: [
      { title: '약 2시간이면 도착', text: '도쿄역에서 특급열차가 이어져, 렌터카 없이도 당일치기가 가능합니다.' },
      { title: '계절이 뚜렷해 일정을 짜기 쉽다', text: '봄의 파란 네모필라, 가을의 붉은 코키아, 그리고 여름과 겨울이 완전히 다른 해안선.' },
      { title: '사람이 비교적 적다', text: '대표적인 절경은 그대로 있지만, 일본의 유명 코스처럼 붐비는 일은 많지 않습니다.' },
    ],
    guidesHeading: '여기서 시작하세요',
    guidesIntro: '한 편씩 천천히 만들고 있습니다. 얕은 글을 많이 쌓기보다, 확인된 글을 먼저 제대로 내놓으려 합니다.',
    guides: [
      {
        key: 'hitachi-seaside-park-from-tokyo',
        title: '도쿄에서 히타치 해변공원 가는 법',
        text: '파란 꽃 언덕까지 열차와 버스로 가는 실제 경로. 입장료와 시즌 기간은 공원 공식 자료를 인용했습니다.',
        cta: '가이드 읽기',
      },
      {
        key: 'hitachi-seaside-park-nemophila',
        title: '2027 히타치 해변공원 네모필라, 언제 가면 좋을까',
        text: '개화 시기, 꽃 시즌 입장료, 운영 시간과 휴원일, 그리고 공원이 아직 발표하지 않은 2027년 정보.',
        cta: '가이드 읽기',
      },
      {
        key: 'fukuroda-falls',
        title: '후쿠로다 폭포: 도쿄에서 가는 법과 겨울 얼음 폭포',
        text: '이바라키 북부 산속의 4단 폭포. 현재 입장료, 겨울 운영 시간, 얼음 폭포가 생길 수 있는 시기, 하루를 좌우하는 버스 시간.',
        cta: '가이드 읽기',
      },
      {
        key: 'kairakuen-plum-blossoms',
        title: '가이라쿠엔 매화: 2027 미토 매화 축제 가이드',
        text: '벚꽃보다 먼저 오는 매화 시즌. 축제 기간(2월 11일~3월 22일), 축제 기간 입장료, 야간 라이트업, 미토역에서 버스로 가는 법.',
        cta: '가이드 읽기',
      },
      {
        key: 'oarai-isosaki-shrine',
        title: '오아라이 이소사키 신사: 바다 위 도리이의 일출',
        text: '바다 바위 위의 도리이는 일몰이 아니라 일출 명소. 신사 운영 시간, 새해 첫 일출, 미토에서 현금만 받는 노선, 근처의 아쿠아월드.',
        cta: '가이드 읽기',
      },
      {
        key: 'ushiku-daibutsu',
        title: '우시쿠 대불: 안으로 걸어 들어가는 120m 불상',
        text: '지상 85m 전망층이 있는 청동 대불. 입장료, 겨울 폐원 시간, 1월 1~3일 무료 참배, JR 우시쿠역에서 가는 버스.',
        cta: '가이드 읽기',
      },
      {
        key: 'mount-tsukuba',
        title: '쓰쿠바산: 아키하바라에서 떠나는 당일치기',
        text: '아키하바라에서 열차로 약 45분. 케이블카·로프웨이 요금, 겨울 운휴일, 올라갈 때와 내려올 때 다르게 타는 코스.',
        cta: '가이드 읽기',
      },
    ],
    trustHeading: '저희가 일하는 방식',
    trustBody: [
      '이 사이트의 숫자는 모두 공식 출처—공원, 운수사, 시정촌, 현—에서 가져오며 원문 링크를 함께 답니다. 확인하지 못한 내용은 추측으로 채우지 않고 그렇다고 밝힙니다.',
      '요금과 운영 시간, 시간표는 바뀔 수 있습니다. 출발 전 공식 사이트에서 확인해 주세요.',
    ],
  },
};
