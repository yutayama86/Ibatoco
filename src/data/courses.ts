/**
 * モデルコース（/course/・/course/[slug]/）のデータ。
 * 中身は各街ページの半日コース（HitachiAreaGuide.astro・area-guides.ts の route）を元に、
 * 施設・交通の公式ページで 2026-11-08 に確かめ直したもの。
 *
 * - 時刻は「この順で回るときの目安」。営業時間・運行時刻ではない。
 * - 店名は出さない（定休日や営業の有無を追えないため）。
 * - 写真の出典は credit / creditUrl、イラストは isIllustration で「イメージイラスト」と表示する。
 * - 期間のある注記（菊まつり等）は showUntil（YYYY-MM-DD、日本時間）を過ぎると出さない。
 */

export interface CourseImage {
  src: string;
  alt: string;
  width: number;
  height: number;
  credit?: string;
  creditUrl?: string;
  isIllustration?: boolean;
}

export interface CourseStop {
  label: 'START' | 'WALK' | 'VIEW' | 'VISIT' | 'LUNCH' | 'GOAL';
  place: string;
  short: string;
  time: string;
  heading: string[];
  text: string;
  /** 行き方・開いている時間など、公式ページで確かめた事実 */
  facts: { label: string; text: string }[];
  image?: CourseImage;
  link?: { href: string; label: string };
}

export interface Course {
  slug: string;
  areaSlug: string;
  areaName: string;
  kicker: string;
  title: string[];
  cardTitle: string;
  summary: string;
  /** 一覧の特集枠の一行目（なければ「半日で回る、日立市。」の形） */
  listLead?: string;
  lead: string[];
  duration: 'halfday' | 'day';
  durationLabel: string;
  transport: string;
  publicTransport: boolean;
  pageTitle: string;
  description: string;
  cover: CourseImage;
  inset?: CourseImage & { caption: string };
  stops: CourseStop[];
  seasonal?: { text: string; showUntil: string; sourceLabel: string; sourceUrl: string }[];
  tips: string[];
  /** 同じ街のイバトコの記事で、行程が違うもの（1日コースなど） */
  relatedArticle?: { href: string; label: string; text: string };
  checkedAt: string;
  sources: { label: string; url: string }[];
}

const CHECKED = '2026-11-08';

const HITACHI_STATION: CourseImage = { src: '/images/area/hitachi/station.jpg', alt: '海に面した日立駅のガラス張りの通路', width: 1280, height: 853, credit: 'Σ64 / CC BY 4.0', creditUrl: 'https://commons.wikimedia.org/wiki/File:Hitachi_Station,_Ibaraki_01.jpg' };

export const COURSES: Course[] = [
  {
    slug: 'hitachi',
    areaSlug: 'hitachi',
    areaName: '日立市',
    kicker: 'HITACHI ／ WALKING JOURNEY 01',
    title: ['海の見える駅から、', '街を見渡す丘へ。'],
    cardTitle: '海の見える駅から、街を見渡す丘へ。',
    summary: '日立駅、平和通り、かみね公園をつなぐ。',
    listLead: '海辺のまちを、半日で。',
    lead: ['電車を降りたら、目の前は太平洋。', '海辺のまちを、自分の速さでめぐろう。'],
    duration: 'halfday',
    durationLabel: '半日',
    transport: '徒歩・バス',
    publicTransport: true,
    pageTitle: '日立の半日モデルコース｜日立駅・平和通り・かみね公園を歩く｜イバトコ',
    description: '海の見える日立駅から、桜並木の平和通りを歩き、バスでかみね公園の展望台へ。日立市の公式情報で確かめた、電車とバスで回れる半日のモデルコースです。',
    cover: HITACHI_STATION,
    inset: { src: '/images/area/hitachi/city-from-kamine.jpg', alt: 'かみね公園から見た日立の市街と太平洋', width: 1280, height: 853, credit: 'Σ64 / CC BY 4.0', creditUrl: 'https://commons.wikimedia.org/wiki/File:Hitachi_City_from_Kamine_Park_04.jpg', caption: '坂道の先に、街と海。' },
    stops: [
      {
        label: 'START', place: '日立駅', short: '海を眺める', time: '10:00',
        heading: ['はじまりは、', '海の見える駅。'],
        text: '改札を出て、ガラスの自由通路を東の端へ。展望イベントホールの大きな窓の向こうは、太平洋です。駅舎のデザイン監修は日立市出身の建築家・妹島和世氏。まずはここで、旅の気分に切り替えてから歩きはじめます。',
        facts: [
          { label: '見どころ', text: '2011年完成のガラス張りの橋上駅舎。2012年グッドデザイン賞、2014年ブルネル賞（駅舎部門）優秀賞。' },
          { label: '開いている時間', text: '展望イベントホール（ぷらっとひたち）は9:00〜19:00。催しで貸し切りになる日もあります。' },
        ],
        image: HITACHI_STATION,
        link: { href: '/area/hitachi/', label: '日立市の案内を見る' },
      },
      {
        label: 'WALK', place: '平和通り', short: 'まちを歩く', time: '10:40',
        heading: ['まちの速さで、', 'ゆっくり歩こう。'],
        text: '駅前から国道6号まで、約1キロのまっすぐな大通り。両側にソメイヨシノが並び、春は桜のトンネルになります。秋や冬は葉の落ちた並木越しに、街の日常が見えてきます。',
        facts: [
          { label: '距離', text: '日立駅前から国道6号まで約1km。1951年に全線が開通した通りです。' },
          { label: '桜', text: 'かみね公園とあわせて「日本さくら名所100選」。' },
        ],
        image: { src: '/images/area/hitachi/sakura-festival.jpg', alt: '桜が咲く日立さくらまつりの平和通り', width: 1280, height: 853, credit: 'Σ64 / CC BY 4.0', creditUrl: 'https://commons.wikimedia.org/wiki/File:Hitachi_Sakura_Festival,_Ibaraki_01.jpg' },
      },
      {
        label: 'VIEW', place: 'かみね公園', short: '丘から見渡す', time: '11:20',
        heading: ['丘の上から、', '街と海を見渡す。'],
        text: 'バスで高台へ。頂上の展望台からは、太平洋から阿武隈の山並みまで360度が見渡せます。歩いてきた駅と通りを上から確かめて、今日のよりみちを振り返ります。子ども連れなら、動物園に時間を取って。',
        facts: [
          { label: '行き方', text: 'JR日立駅中央口から路線バスで「神峰公園口」下車。' },
          { label: '園内', text: '展望台のほか、約70種480点の動物がいる動物園、遊園地、吉田正音楽記念館、郷土博物館。施設ごとに開館日が異なります。' },
        ],
        image: { src: '/images/area/hitachi/kamine-park.jpg', alt: '日立市のかみね公園', width: 1280, height: 853, credit: 'Σ64 / CC BY 4.0', creditUrl: 'https://commons.wikimedia.org/wiki/File:Kamine_Park,_Ibaraki_07.jpg' },
      },
    ],
    tips: [
      '高台から降りたら、駅の周りで昼食に。午後も使えるなら、海の幸を目当てに道の駅日立おさかなセンターへ足をのばす手もあります。',
      'バスの時刻と各施設の開館日は、出かける前に確かめてください。',
    ],
    checkedAt: CHECKED,
    sources: [
      { label: '日立駅｜日立市', url: 'https://www.city.hitachi.lg.jp/citypromotion/hitachi_donnamachi/1007477/1011149/1010610/1004743/1004744.html' },
      { label: 'ぷらっとひたち（展望イベントホール）｜日立市', url: 'https://www.city.hitachi.lg.jp/machizukuri_kankyo/toshikyotenseibi/1002775/1002777.html' },
      { label: '平和通り｜日立市', url: 'https://www.city.hitachi.lg.jp/machizukuri_kankyo/kankyo/1004377/1009842/1009552.html' },
      { label: 'かみね公園｜日立市', url: 'https://www.city.hitachi.lg.jp/shisetsu/kanko_bunka/1007556/1003143/index.html' },
      { label: 'かみね公園の施設｜日立市', url: 'https://www.city.hitachi.lg.jp/shisetsu/kanko_bunka/1007556/1003143/1003145.html' },
    ],
  },
  {
    slug: 'kasama',
    areaSlug: 'kasama',
    areaName: '笠間市',
    kicker: 'KASAMA ／ WALKING JOURNEY 02',
    title: ['門前から、', '焼きものの森へ。'],
    cardTitle: '門前から、焼きものの森へ。',
    summary: '笠間稲荷神社から、器の街を歩く。',
    lead: ['お稲荷さんの門前町から、焼きものの丘へ。', '周遊バスでつなぐ、笠間の半日。'],
    duration: 'halfday',
    durationLabel: '半日',
    transport: '徒歩・周遊バス',
    publicTransport: true,
    pageTitle: '笠間の半日モデルコース｜笠間稲荷神社から笠間芸術の森公園へ｜イバトコ',
    description: '笠間稲荷神社に参拝し、門前通りを歩いて、かさま観光周遊バスで笠間芸術の森公園へ。神社・県・市の公式情報で確かめた、笠間の半日モデルコースです。',
    cover: { src: '/images/v42/kasama-market-print.webp', alt: '笠間の器と菊の店先をイメージした版画調のイラスト', width: 960, height: 640, isIllustration: true },
    stops: [
      {
        label: 'START', place: '笠間稲荷神社', short: '門前で参る', time: '09:30',
        heading: ['まずは、', 'お稲荷さんへ。'],
        text: '日本三大稲荷のひとつに数えられ、社伝では651年の創建。江戸時代末期に再建された本殿は、国の重要文化財です。本殿を囲む彫刻を見てから、門前の賑わいへ。',
        facts: [
          { label: '行き方', text: 'JR水戸線笠間駅から徒歩約20分、タクシーで約5分。かさま観光周遊バスなら「笠間稲荷神社前」下車。' },
          { label: '駐車場', text: '境内駐車場（無料・25台）と地蔵前駐車場（90台、時期により有料）。' },
        ],
        link: { href: '/area/kasama/', label: '笠間市の案内を見る' },
      },
      {
        label: 'WALK', place: '門前通り', short: '参道を歩く', time: '10:30',
        heading: ['参道の店を、', 'のぞきながら。'],
        text: '参拝を終えたら、神社の前から延びる門前通りへ。気になる店をのぞきながら歩いて、次に向かう焼きものの丘の前に、器の街の気配をつかんでおきます。',
        facts: [
          { label: 'ひとこと', text: '店ごとに営業日が違います。目当ての店があれば、事前に確かめてください。' },
        ],
      },
      {
        label: 'VISIT', place: '笠間芸術の森公園', short: '焼きものの丘へ', time: '11:30',
        heading: ['焼きものの森で、', '好きな器を探す。'],
        text: '周遊バスで「工芸の丘・陶芸美術館」へ。伝統工芸と新しい造形美術をテーマにした県の公園で、園内には茨城県陶芸美術館、隣には体験工房のある笠間工芸の丘 クラフトヒルズKASAMAがあります。器を見比べて、自分の好みを探す時間に。',
        facts: [
          { label: '行き方', text: '笠間駅から車で約5分。かさま観光周遊バスなら「工芸の丘・陶芸美術館」下車。' },
          { label: '開いている時間', text: '公園は8:30〜17:00（12/31・1/1休み）。陶芸美術館は9:30〜17:00（入館16:30まで）、クラフトヒルズKASAMAは10:00〜17:00。どちらも月曜休み（祝日のときは翌日）。' },
        ],
        image: { src: '/images/v42/pottery.webp', alt: '笠間焼の器をイメージしたイラスト', width: 420, height: 525, isIllustration: true },
      },
    ],
    seasonal: [
      { text: '11月23日（月・祝）までは「笠間の菊まつり」。笠間稲荷神社ほかが会場です。期間中の土・日・祝日は、地蔵前駐車場が有料になります。', showUntil: '2026-11-23', sourceLabel: '笠間の菊まつり｜笠間稲荷神社', sourceUrl: 'https://www.kasama.or.jp/event/kiku.html' },
    ],
    tips: [
      'かさま観光周遊バスは2026年4月から、笠間駅発の周遊ルートと友部駅発の連絡ルートの2系統。運賃は1日乗車券のみで、平日300円、土日祝日と観光シーズンは500円です。時刻表は笠間市の案内で確かめてください。',
      '窯元やギャラリーは、定休日が店ごとに異なります。',
    ],
    relatedArticle: { href: '/events/kasama-day-trip-model-course/', label: '笠間の日帰りモデルコースを読む', text: '茨城県陶芸美術館や笠間工芸の丘まで1日で回るなら、開館時間・料金・休館日をまとめた記事へ。' },
    checkedAt: CHECKED,
    sources: [
      { label: '笠間稲荷神社について｜笠間稲荷神社', url: 'https://www.kasama.or.jp/about/index.html' },
      { label: 'アクセス｜笠間稲荷神社', url: 'https://www.kasama.or.jp/access/index.html' },
      { label: '笠間の菊まつり｜笠間稲荷神社', url: 'https://www.kasama.or.jp/event/kiku.html' },
      { label: '笠間芸術の森公園｜茨城県', url: 'https://www.pref.ibaraki.jp/doboku/kogai/kikaku/geimori_park.html' },
      { label: 'かさま観光周遊バス｜笠間市', url: 'https://www.city.kasama.lg.jp/page/page016941.html' },
    ],
  },
  {
    slug: 'hitachinaka',
    areaSlug: 'hitachinaka',
    areaName: 'ひたちなか市',
    kicker: 'HITACHINAKA ／ WALKING JOURNEY 03',
    title: ['花の丘から、', '海辺のまちへ。'],
    cardTitle: '花の丘から、海辺のまちへ。',
    summary: '海浜公園から、湊線で市場の街へ。',
    lead: ['季節の花が咲く丘から、海沿いの小さな鉄道へ。', 'ひたちなかの景色を、一日かけてたどる。'],
    duration: 'day',
    durationLabel: '一日',
    transport: '路線バス・湊線・徒歩',
    publicTransport: true,
    pageTitle: 'ひたちなかの日帰りモデルコース｜ひたち海浜公園から那珂湊おさかな市場へ｜イバトコ',
    description: '国営ひたち海浜公園で季節の花を見て、阿字ヶ浦の海辺へ。ひたちなか海浜鉄道湊線で那珂湊おさかな市場へ向かう、公式情報で確かめた日帰りのモデルコースです。',
    cover: { src: '/images/theme/nemophila-hitachi-seaside-park.jpg', alt: '国営ひたち海浜公園のみはらしの丘に咲くネモフィラ', width: 1108, height: 739, credit: 'イバトコ編集部' },
    stops: [
      {
        label: 'START', place: '国営ひたち海浜公園', short: '花の丘へ', time: '09:30',
        heading: ['開園に合わせて、', 'みはらしの丘へ。'],
        text: '春のネモフィラ、秋のコキア。季節の花を先に見ておきたいなら、開園の時間に合わせて入ります。花の見頃は年によって動くので、公園の開花情報を見てから出かけて。',
        facts: [
          { label: '行き方', text: 'JR勝田駅東口2番乗り場から路線バスで「海浜公園西口」まで約15分。' },
          { label: '開いている時間', text: '11月〜2月は9:30〜16:30。火曜休園（祝日の場合は翌平日）、12/31・1/1と2月上旬も休み。春や秋の花の時期などは休まず開きます。' },
        ],
        image: { src: '/images/theme/nemophila-hitachi-seaside-park.jpg', alt: 'みはらしの丘のネモフィラ', width: 1108, height: 739, credit: 'イバトコ編集部' },
        link: { href: '/area/hitachinaka/', label: 'ひたちなか市の案内を見る' },
      },
      {
        label: 'WALK', place: '阿字ヶ浦', short: '海を眺める', time: '12:00',
        heading: ['弓なりの海岸で、', '太平洋を眺める。'],
        text: '公園の南口から、阿字ヶ浦の海辺へ。弓なりに弧を描く海岸線が続きます。夏は海水浴場になる浜も、季節を外せば静かです。',
        facts: [
          { label: '行き方', text: '公園の南口と阿字ヶ浦駅のあいだは徒歩約20分。阿字ヶ浦駅からはスマイルあおぞらバスで海浜公園西口へも行けます。' },
          { label: '海水浴場', text: '夏は海水浴場になります（2026年は7月18日〜8月23日）。' },
        ],
      },
      {
        label: 'LUNCH', place: '那珂湊おさかな市場', short: '市場で昼に', time: '13:00',
        heading: ['湊線に乗って、', '市場で昼ごはん。'],
        text: '阿字ヶ浦駅から、ひたちなか海浜鉄道湊線で那珂湊駅へ。鮮魚店と飲食店が軒を連ねる市場で、寿司や海鮮丼を選びます。',
        facts: [
          { label: '行き方', text: '湊線「那珂湊駅」から徒歩約10分。' },
          { label: '混雑', text: '土日祝日や年末年始、ゴールデンウィークは周辺道路が混みます。休日は市の無料臨時駐車場が開かれます。' },
        ],
      },
    ],
    tips: [
      '帰りは湊線で勝田駅へ。土産に干し芋を探すなら、品種で選ぶと違いがわかります。',
      'バスと湊線の時刻、公園の休園日は、出かける前に確かめてください。',
    ],
    checkedAt: CHECKED,
    sources: [
      { label: '開園時間・休園日｜国営ひたち海浜公園', url: 'https://www.hitachikaihin.jp/guide/schedule.html' },
      { label: '電車・バスでのアクセス｜国営ひたち海浜公園', url: 'https://www.hitachikaihin.jp/access/train-bus.html' },
      { label: 'ひたちなか市の海水浴場｜ひたちなか市', url: 'https://www.city.hitachinaka.lg.jp/business/kankoshinko/1002713/1010142.html' },
      { label: '那珂湊おさかな市場｜ひたちなか市', url: 'https://www.city.hitachinaka.lg.jp/business/kankoshinko/1002713/1002719.html' },
      { label: '那珂湊おさかな市場（公式）', url: 'https://www.nakaminato-osakanaichiba.jp/' },
    ],
  },
];

export const getCourse = (slug: string) => COURSES.find((course) => course.slug === slug);
