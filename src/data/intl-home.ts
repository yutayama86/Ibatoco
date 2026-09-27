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
    ],
    trustHeading: '저희가 일하는 방식',
    trustBody: [
      '이 사이트의 숫자는 모두 공식 출처—공원, 운수사, 시정촌, 현—에서 가져오며 원문 링크를 함께 답니다. 확인하지 못한 내용은 추측으로 채우지 않고 그렇다고 밝힙니다.',
      '요금과 운영 시간, 시간표는 바뀔 수 있습니다. 출발 전 공식 사이트에서 확인해 주세요.',
    ],
  },
};
