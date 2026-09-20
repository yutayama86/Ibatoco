/**
 * 茨城の「海／川／公園／山」テーマ特集データ。
 * 事実は公式・観光いばらきで裏取り（多くはエリアページ制作時に検証済み）。
 * 画像はCCライセンス／パブリックドメインで帰属を確認できたもののみ。クレジットは削除しない。
 * 見頃・日程・遊泳可否などは年・天候で変わるため、常緑表現＋公式確認導線とする。
 */

/**
 * 写真。creditUrl は借り物のときだけ入れる（ライセンス表示先）。
 * 自前で撮ったものは表示先が無いので省略し、文字だけ出す。
 */
export interface ThemeImage { src: string; alt: string; credit: string; creditUrl?: string; }
export interface ThemeSpot { name: string; area: string; areaSlug?: string; desc: string; image?: ThemeImage; mapQuery?: string; }
export interface ThemeSection { kicker: string; title: string; body: string; }
/**
 * 「いま、どうなっているか」を冒頭で出すための枠。
 * 見頃のように日ごとに変わるものを、常緑の本文と混ぜずに分けて置く。
 * 公式が予想を出している期間だけ入れ、過ぎたら消す（古い見頃を残さない）。
 */
export interface ThemeStatus {
  /** 公式を確認した日。画面に出すので、更新したら必ず直す */
  updatedAt: string;
  /**
   * 開催期間。入っている期間だけ「今週の茨城」に出る（src/lib/happenings.ts）。
   * 季節が終わったら status ごと消すこと（古い期間を残さない）。
   */
  period?: { from: string; to: string; label: string; place?: string; municipality?: string };
  heading: string;
  /** いま何が見られるか、次に何が変わるか。左が項目名、右が中身 */
  rows: [string, string][];
  /**
   * スポット別の「いま」。「茨城 紅葉 見頃」で来た人が最初に見る表。
   *
   * **公式が予想を出していないスポットは、出ていないと書く。**
   * 他のまとめサイトは前年の日付や独自予想で埋めているが、
   * それをやると読者が空振りする。イバトコが色づきを予想することはしない。
   * `confirmed` は「公式の発表を確認できたか」。表示の強弱にだけ使う。
   */
  spotBoard?: {
    heading: string;
    note?: string;
    rows: {
      spot: string;
      area: string;
      /** 市町村ページへつなぐ。44市町村のslug */
      areaSlug?: string;
      /** 例年の見頃 */
      usual: string;
      /** その年の公式発表。無ければ「発表なし」と書く */
      now: string;
      confirmed: boolean;
    }[];
  };
  note?: string;
  links?: { label: string; href: string }[];
}
export interface Theme {
  slug: 'umi' | 'kawa' | 'koen' | 'yama' | 'hana' | 'matsuri' | 'kouyou';
  kicker: string;
  title: string;
  lead: string;
  /** 見頃など、いま時点の状況。季節が終わったら消す */
  status?: ThemeStatus;
  hero: ThemeImage;
  sections: ThemeSection[];
  spotsHeading: string;
  spots: ThemeSpot[];
  practical: [string, string][];
  /** よくある質問。構造化データ（FAQPage）にも同じ内容を出す */
  faq?: { question: string; answer: string }[];
  sources: { label: string; url: string }[];
  related: { slug: string; name: string }[];
  checkedAt: string;
  metaTitle: string;
  metaDescription: string;
}

const CHECKED = '2026年8月13日';

// ---- 帰属確認済みの画像 ----
const IMG_OARAI: ThemeImage = { src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Sunrise_of_the_Pacific_Ocean_-_Oarai_coast.jpg/1280px-Sunrise_of_the_Pacific_Ocean_-_Oarai_coast.jpg', alt: '大洗海岸から望む太平洋の日の出', credit: '写真：t.kunikuni / CC BY-SA 2.0', creditUrl: 'https://commons.wikimedia.org/wiki/File:Sunrise_of_the_Pacific_Ocean_-_Oarai_coast.jpg' };
const IMG_FUKURODA: ThemeImage = { src: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Fukuroda%20Falls%2042.jpg?width=1280', alt: '大子町の袋田の滝', credit: '写真：Σ64 / CC BY 3.0', creditUrl: 'https://commons.wikimedia.org/wiki/File:Fukuroda_Falls_42.jpg' };
const IMG_NEMOPHILA: ThemeImage = { src: '/images/theme/nemophila-hitachi-seaside-park.jpg', alt: '国営ひたち海浜公園のみはらしの丘に咲くネモフィラ', credit: '写真：イバトコ編集部' };
const IMG_TSUKUBA: ThemeImage = { src: 'https://upload.wikimedia.org/wikipedia/commons/8/87/Mt.Tsukuba.jpg', alt: '筑波山', credit: '写真：RESPITE / パブリックドメイン', creditUrl: 'https://commons.wikimedia.org/wiki/File:Mt.Tsukuba.jpg' };
const IMG_HITACHI_STATION: ThemeImage = { src: '/images/area/hitachi/station.jpg', alt: '海に張り出した日立駅', credit: '写真：Σ64 / CC BY 4.0', creditUrl: 'https://commons.wikimedia.org/wiki/File:Hitachi_Station,_Ibaraki_01.jpg' };
const IMG_KAMINE: ThemeImage = { src: '/images/area/hitachi/kamine-park.jpg', alt: '日立市かみね公園', credit: '写真：Σ64 / CC BY 4.0', creditUrl: 'https://commons.wikimedia.org/wiki/File:Kamine_Park,_Ibaraki_07.jpg' };
const IMG_SAKURA: ThemeImage = { src: '/images/area/hitachi/sakura-festival.jpg', alt: '日立さくらまつりの平和通り', credit: '写真：Σ64 / CC BY 4.0', creditUrl: 'https://commons.wikimedia.org/wiki/File:Hitachi_Sakura_Festival,_Ibaraki_01.jpg' };
const IMG_OIWA: ThemeImage = { src: '/images/area/hitachi/oiwa-jinja.jpg', alt: '日立市・御岩神社の随神門', credit: '写真：Taisuke.Kasuya / CC BY-SA 4.0', creditUrl: 'https://commons.wikimedia.org/wiki/File:Zuishinmon_of_Oiwa-jinja_(Hitachi).jpg' };

export const THEMES: Record<Theme['slug'], Theme> = {
  umi: {
    slug: 'umi',
    kicker: 'IBARAKI COAST',
    title: '茨城の海',
    lead: '茨城の海岸線は、南北におよそ190キロメートル。北は五浦のような断崖と岩礁、南は鹿島灘のまっすぐな砂浜へと、表情を変えながら続きます。海に張り出した駅、波間に立つ鳥居、あんこうの揚がる漁港。太平洋に面したこの県の、海の入口をまとめました。',
    hero: IMG_OARAI,
    sections: [
      { kicker: '地形', title: '北は断崖、南は砂浜。', body: '県北の五浦や高戸小浜は、切り立った海食崖と入り江が続く荒々しい海。県南へ下ると、鹿島灘のまっすぐな砂浜に変わります。同じ県の海とは思えないほど、北と南で表情が違います。' },
      { kicker: '海の幸', title: '冬は、あんこうの季節。', body: '日立の久慈浜しらす、北茨城・大洗のあんこう、鹿島灘のはまぐり。とりわけ冬のあんこう鍋は茨城の看板です。水揚げや提供時期は年や店で変わるため、訪ねる前に確認を。' },
    ],
    spotsHeading: '海の名所',
    spots: [
      { name: '神磯の鳥居（大洗磯前神社）', area: '大洗町', areaSlug: 'oarai', desc: '斉衡3年(856年)、神が降り立ったと伝わる海辺の岩に立つ鳥居。波間の鳥居のうしろから昇る朝日は、茨城を代表する眺めです。日の出の時間は季節で大きく動くので、事前に調べて訪ねてください。', mapQuery: '大洗磯前神社 神磯の鳥居' },
      { name: '五浦海岸・六角堂', area: '北茨城市', areaSlug: 'kitaibaraki', desc: '岡倉天心が海に張り出す断崖に建てた六角形の堂。2011年の津波で流失し、翌年、創建当初の姿で再建されました。岩礁と入り江が続く荒々しい海は、天心や横山大観たちが拠点にした近代美術ゆかりの風景です。', mapQuery: '五浦海岸 六角堂 北茨城市' },
      { name: '日立駅と海岸', area: '日立市', areaSlug: 'hitachi', desc: '改札を抜けると、正面がまるごと海の日立駅。デザイン監修は日立市出身の建築家・妹島和世氏で、展望ホールから太平洋を一望できます。市内の海岸沿いには、烏帽子岩で知られる河原子など、高さの違う海の眺めが点在します。', image: IMG_HITACHI_STATION, mapQuery: '日立駅 茨城県日立市' },
      { name: '阿字ヶ浦海岸', area: 'ひたちなか市', areaSlug: 'hitachinaka', desc: '遠浅で人気の海水浴場。国営ひたち海浜公園にも近く、夏に賑わいます。' },
      { name: '高戸小浜海岸', area: '高萩市', areaSlug: 'takahagi', desc: '切り立った崖にはさまれた、二つの入り江を持つ景勝地。「日本の渚・百選」のひとつです。' },
      { name: '大洗サンビーチ', area: '大洗町', areaSlug: 'oarai', desc: '遠浅で家族連れに親しまれる海水浴場。すぐ近くに、サメの飼育数が日本一のアクアワールド茨城県大洗水族館があります。' },
      { name: '平潟港', area: '北茨城市', areaSlug: 'kitaibaraki', desc: 'あんこうの水揚げで知られる漁港。冬には新鮮な海の幸が集まり、あんこう料理を出す店が並びます。' },
      { name: '鹿島灘の砂浜', area: '鹿嶋市', areaSlug: 'kashima', desc: '鹿嶋から神栖・鉾田へと、まっすぐな砂浜が続きます。はまぐりの産地で、サーフィンでも知られます。' },
    ],
    practical: [
      ['日の出を見る', '神磯の鳥居や日立の海は日の出の名所です。日の出時刻は夏は早く、冬は遅く、季節で大きく変わります。事前に調べてから訪ねてください。'],
      ['海水浴', '遊泳期間・遊泳可否・監視員の有無は、海水浴場ごと・年ごとに変わります。開設情報を確認してから出かけてください。'],
      ['岩場と波', '五浦や河原子などの岩場は、足元が不安定で波にも注意が必要です。無理に近づかないでください。'],
      ['冬のあんこう', 'あんこう鍋は冬が中心です。平潟・大洗などで味わえますが、提供時期は店ごとに確認を。'],
    ],
    sources: [
      { label: '観光いばらき（県公式）', url: 'https://www.ibarakiguide.jp/' },
      { label: '大洗観光協会（公式）', url: 'https://www.oarai-info.jp/' },
      { label: '北茨城市ゆかりの人物・岡倉天心｜北茨城市', url: 'https://www.city.kitaibaraki.lg.jp/docs/2015022000264/' },
      { label: '高萩市観光協会（公式）', url: 'https://www.takahagi-kanko.jp/' },
    ],
    related: [
      { slug: 'oarai', name: '大洗町' }, { slug: 'kitaibaraki', name: '北茨城市' }, { slug: 'hitachi', name: '日立市' }, { slug: 'hitachinaka', name: 'ひたちなか市' }, { slug: 'takahagi', name: '高萩市' }, { slug: 'kashima', name: '鹿嶋市' }, { slug: 'kamisu', name: '神栖市' }, { slug: 'hokota', name: '鉾田市' },
    ],
    checkedAt: CHECKED,
    metaTitle: '茨城の海｜断崖の五浦から砂浜の鹿島灘まで・海岸の名所ガイド｜イバトコ',
    metaDescription: '南北190キロの茨城の海岸線。神磯の鳥居（大洗）、六角堂の五浦海岸（北茨城）、海に張り出す日立駅、日本の渚・百選の高戸小浜、鹿島灘の砂浜まで。海の名所と海の幸、訪ねる前の注意点をまとめました。',
  },

  kawa: {
    slug: 'kawa',
    kicker: 'IBARAKI RIVERS & LAKES',
    title: '茨城の川と湖',
    lead: '茨城には、性格の違う水辺があります。関東随一の清流とされる那珂川、日本三名瀑・袋田の滝を生む久慈川の流域、県境をなす大河・利根川。そして、琵琶湖に次ぐ日本第2の湖・霞ヶ浦。滝や渓谷から湖の帆引き船まで、この県の水辺の風景をまとめました。',
    hero: IMG_FUKURODA,
    sections: [
      { kicker: '清流', title: '那珂川と、久慈川の滝。', body: '那珂川は関東随一の清流とされ、鮎やカヌーの川。久慈川の流域には、大岩壁を四段に落ちる日本三名瀑・袋田の滝がかかります。山あいには、渓谷と吊橋、滝が集まっています。' },
      { kicker: '大河', title: '県境をなす、利根川。', body: '県南から県西の県境をなす利根川と、その支流の鬼怒川・小貝川。広い河川敷は花火大会の舞台にもなり、田園には花畑が広がります。' },
      { kicker: '湖', title: '日本第2の湖、霞ヶ浦。', body: '県南に広がる霞ヶ浦は、琵琶湖に次いで日本で2番目に広い湖。かつての漁法を復活させた観光帆引き船が、夏から秋にかけて湖上を進みます。海と淡水がまじる汽水湖・涸沼もあります。' },
    ],
    spotsHeading: '川と湖、滝と渓谷',
    spots: [
      { name: '袋田の滝', area: '大子町', areaSlug: 'daigo', desc: '高さ120メートル、幅73メートル。大岩壁を四段に落ちることから「四度（よど）の滝」とも呼ばれ、日本三名瀑のひとつ、国の名勝に数えられます。厳冬期には全体が凍る「氷瀑」が見られることもあります。', mapQuery: '袋田の滝 大子町' },
      { name: '竜神峡・竜神大吊橋', area: '常陸太田市', areaSlug: 'hitachiota', desc: '竜神峡にかかる、全長375メートルの歩行者専用吊橋（歩行者専用としては日本最大級）。橋の上からは高さ100メートルの日本一高いバンジージャンプもでき、新緑と紅葉の渓谷が広がります。', mapQuery: '竜神大吊橋 常陸太田市' },
      { name: '那珂川・御前山', area: '常陸大宮市', areaSlug: 'hitachiomiya', desc: '「関東の嵐山」と呼ばれる御前山のふもとを、関東随一の清流とされる那珂川が流れます。鮎釣りやカヌー、秋の紅葉が楽しめます。' },
      { name: '花貫渓谷・汐見滝吊り橋', area: '高萩市', areaSlug: 'takahagi', desc: '秋になると、汐見滝吊り橋のあたりで川の上に枝が張り出し、赤や黄に色づいた木々が橋を包む「紅葉のトンネル」になります。' },
      { name: '月待の滝', area: '大子町', areaSlug: 'daigo', desc: '裏側から眺められる珍しい滝。袋田の滝とあわせて、奥久慈の水辺をめぐれます。' },
      { name: '利根川', area: '境町', areaSlug: 'sakai', desc: '県南から県西の県境をなす大河。広い河川敷は花火大会の舞台にもなり、境町・古河・取手・利根町などに水辺の風景が続きます。' },
      { name: '小貝川ふれあい公園', area: '下妻市', areaSlug: 'shimotsuma', desc: '小貝川のほとりの公園。春はポピー、秋はコスモスが一面に咲く花畑で知られます。' },
      { name: '渡良瀬遊水地', area: '古河市', areaSlug: 'koga', desc: 'ラムサール条約に登録された広大な湿地。ヨシ原と水辺が広がり、サイクリングや熱気球で親しまれています。栃木・群馬・埼玉と接する、県の西端の水辺です。' },
      { name: '霞ヶ浦（帆引き船）', area: 'かすみがうら市', areaSlug: 'kasumigaura', desc: '琵琶湖に次いで日本で2番目に広い湖。もとは漁のための帆引き船が、いまは観光用として夏から秋に操業され、行方・土浦・かすみがうらの3市で見られます。湖岸にはつくば霞ヶ浦りんりんロードが延びています。', mapQuery: '霞ヶ浦 帆引き船' },
      { name: '涸沼', area: '茨城町', areaSlug: 'ibaraki-machi', desc: '海水と淡水がまじる汽水湖。2015年にラムサール条約に登録された湿地で、茨城町・鉾田市・大洗町の3市町にまたがります。渡り鳥の飛来地であり、ヤマトシジミの産地でもあります。' },
    ],
    practical: [
      ['滝の見頃', '袋田の滝は新緑・紅葉・氷瀑と季節で姿が変わります。氷瀑は年により凍らないこともあるため、大子町観光協会の凍結情報で確認してください。'],
      ['紅葉と混雑', '竜神峡・花貫渓谷・御前山は例年11月ごろが見頃。まつり期間は周辺が混雑し、交通規制やシャトルバス運行になることがあります。'],
      ['川遊びと増水', '川遊び・鮎釣り・カヌーは、増水や天候に注意。上流で雨が降ると、晴れていても水位が上がることがあります。'],
      ['河川敷の花火', '利根川・渡良瀬川の河川敷では、夏に大きな花火大会が開かれます。日程は年で変わります（詳しくは〈茨城の花火〉のページで）。'],
    ],
    sources: [
      { label: '観光いばらき（県公式）', url: 'https://www.ibarakiguide.jp/' },
      { label: '大子町観光協会（袋田の滝・氷瀑情報）', url: 'https://www.daigo-kanko.jp/' },
      { label: '竜神大吊橋（公式）', url: 'https://ohtsuribashi.ryujinkyo.jp/' },
      { label: '御前山ハイキングコース｜常陸大宮市', url: 'https://www.city.hitachiomiya.lg.jp/kankou_guide/activity/hiking/page002934.html' },
      { label: '霞ヶ浦観光帆引き船｜観光いばらき', url: 'https://www.ibarakiguide.jp/special/kasumigaura_hobikisen.html' },
    ],
    related: [
      { slug: 'daigo', name: '大子町' }, { slug: 'hitachiota', name: '常陸太田市' }, { slug: 'hitachiomiya', name: '常陸大宮市' }, { slug: 'takahagi', name: '高萩市' }, { slug: 'sakai', name: '境町' }, { slug: 'koga', name: '古河市' }, { slug: 'shimotsuma', name: '下妻市' }, { slug: 'kasumigaura', name: 'かすみがうら市' }, { slug: 'ibaraki-machi', name: '茨城町' },
    ],
    checkedAt: CHECKED,
    metaTitle: '茨城の川と湖｜袋田の滝・那珂川の清流・日本第2の湖 霞ヶ浦ガイド｜イバトコ',
    metaDescription: '日本三名瀑・袋田の滝（大子）、日本一高いバンジーの竜神大吊橋（常陸太田）、関東随一の清流・那珂川、日本第2の湖・霞ヶ浦の帆引き船、利根川と渡良瀬遊水地まで。茨城の川と湖・滝・渓谷の名所と、訪ねる前の注意点をまとめました。',
  },

  koen: {
    slug: 'koen',
    kicker: 'IBARAKI PARKS',
    title: '茨城の公園',
    lead: '茨城の公園は、花の名所が多いのが特徴です。世界的に知られるネモフィラの丘、日本三名園の梅、八重桜の里、バラや桃。同じ場所が季節で色を変える、茨城の公園と庭園をまとめました。',
    hero: IMG_NEMOPHILA,
    sections: [
      { kicker: '花の丘と庭園', title: '同じ丘が、季節で色を変える。', body: '国営ひたち海浜公園のみはらしの丘は、春は約530万本のネモフィラで青く、秋は約3万2千本のコキアで赤く。水戸・偕楽園では約100品種3,000本の梅が、早咲きから遅咲きへと長く咲きます。' },
      { kicker: '桜の名所', title: '花見の季節を、長く。', body: 'かみね公園や古河の桃、そして静峰ふるさと公園の八重桜。八重桜はソメイヨシノより遅く咲くため、県内の桜が終わったあとに見頃を迎えます。時期をずらして、花の季節を延ばせます。' },
    ],
    spotsHeading: '公園と庭園',
    spots: [
      { name: '国営ひたち海浜公園', area: 'ひたちなか市', areaSlug: 'hitachinaka', desc: '「みはらしの丘」は、4月中旬から5月上旬に約530万本のネモフィラで青く染まり、10月中旬には約3万2千本のコキアが赤く紅葉します。同じ丘が季節で色を変えます。', mapQuery: '国営ひたち海浜公園' },
      { name: '偕楽園', area: '水戸市', areaSlug: 'mito', desc: '天保13年(1842年)開園。金沢の兼六園、岡山の後楽園と並ぶ日本三名園のひとつです。梅まつりの時期には約100品種3,000本の梅が、早咲き・中咲き・遅咲きと順に咲きます。徳川斉昭自らが設計した好文亭が建ちます。', mapQuery: '偕楽園 水戸市' },
      { name: '千波公園（千波湖）', area: '水戸市', areaSlug: 'mito', desc: '偕楽園に隣接する、周囲約3キロメートルのひょうたん形の湖・千波湖を中心とした公園。桜並木の遊歩道やボート、ハクチョウ・コクチョウが楽しめます。' },
      { name: 'かみね公園', area: '日立市', areaSlug: 'hitachi', desc: '動物園・遊園地・展望台が高台に集まり、約1000本の桜が咲く「日本さくら名所100選」の一つ。2019年には夜景が日本夜景遺産に認定されました。', image: IMG_KAMINE, mapQuery: 'かみね公園 茨城県日立市' },
      { name: '静峰ふるさと公園', area: '那珂市', areaSlug: 'naka', desc: '「日本さくら名所100選」の一つ。約2,000本の八重桜が、ソメイヨシノより遅い時期に見頃を迎えます。花見の季節を一度延長できる場所です。' },
      { name: 'いばらきフラワーパーク', area: '石岡市', areaSlug: 'ishioka', desc: '四季の花が咲く公園。バラで知られ、夜のイルミネーションも行われます。' },
      { name: '笠間芸術の森公園', area: '笠間市', areaSlug: 'kasama', desc: '笠間焼を体感できる公園。ゴールデンウィークには、約200人の陶芸家や窯元が集まる県内最大の陶器市「陶炎祭（ひまつり）」が開かれます。' },
      { name: '古河公方公園（古河総合公園）', area: '古河市', areaSlug: 'koga', desc: '春に約1500本の桃が咲き誇る「桃まつり」の会場。広い園内で、季節の花と歴史的な景観が楽しめます。' },
    ],
    practical: [
      ['花の見頃', 'ネモフィラは4月中旬〜5月上旬、コキアの紅葉は10月中旬、梅は2月中旬〜3月、桜は3月下旬〜4月、八重桜は桜より遅め。見頃は年で動くため、公式の開花情報を確認してください。'],
      ['混雑', 'ネモフィラ・コキアや梅まつりの最盛期は、周辺道路と駐車場が大変混雑します。臨時駐車場や公共交通の案内を確認して。'],
      ['入園料', '国営ひたち海浜公園や偕楽園は、時期・区域によって入園料がかかります。'],
      ['夜のイベント', '偕楽園の夜梅祭、フラワーパークのイルミネーションなど、夜の催しもあります。開催日は各公式で確認を。'],
    ],
    sources: [
      { label: '国営ひたち海浜公園（公式）', url: 'https://www.hitachikaihin.jp/' },
      { label: '日本三名園 偕楽園（公式）', url: 'https://ibaraki-kairakuen.jp/' },
      { label: '静峰ふるさと公園｜那珂市', url: 'https://www.city.naka.lg.jp/event-kankou/kankou-spot/page000275.html' },
      { label: '観光いばらき（県公式）', url: 'https://www.ibarakiguide.jp/' },
    ],
    related: [
      { slug: 'hitachinaka', name: 'ひたちなか市' }, { slug: 'mito', name: '水戸市' }, { slug: 'hitachi', name: '日立市' }, { slug: 'naka', name: '那珂市' }, { slug: 'ishioka', name: '石岡市' }, { slug: 'kasama', name: '笠間市' }, { slug: 'koga', name: '古河市' }, { slug: 'bando', name: '坂東市' },
    ],
    checkedAt: CHECKED,
    metaTitle: '茨城の公園｜ネモフィラの丘・偕楽園の梅・八重桜の名所ガイド｜イバトコ',
    metaDescription: '約530万本のネモフィラと約3万2千本のコキアの国営ひたち海浜公園、日本三名園・偕楽園の梅、日本さくら名所100選のかみね公園と静峰ふるさと公園の八重桜、フラワーパークのバラまで。茨城の公園と庭園、花の見頃をまとめました。',
  },

  yama: {
    slug: 'yama',
    kicker: 'IBARAKI MOUNTAINS',
    title: '茨城の山',
    lead: '茨城の山は、高さではなく物語で読めます。日本百名山でいちばん低い筑波山、山そのものを信仰してきた御岩山、渓谷に架かる日本最大級の吊橋。低くても深い、茨城の山と渓谷をまとめました。',
    hero: IMG_TSUKUBA,
    sections: [
      { kicker: '信仰の山', title: '低くても、手を合わせてきた山。', body: '筑波山は「西の富士、東の筑波」と称され、古くから信仰を集めてきました。日立の御岩山は、山そのものを神体としてきた山。標高は高くなくても、人が長く祈ってきた山です。' },
      { kicker: '渓谷と紅葉', title: '滝と吊橋が、山あいに集まる。', body: '竜神峡の大吊橋、袋田の滝、花貫渓谷、奥久慈。県北の山あいには、滝と吊橋と紅葉が集まっています。秋は、茨城の山がもっとも色づく季節です。' },
    ],
    spotsHeading: '山と渓谷',
    spots: [
      { name: '筑波山', area: 'つくば市', areaSlug: 'tsukuba', desc: '標高877メートル、日本百名山で最も低い山です。男体山(871メートル)と女体山(877メートル)の二つの峰があり、「西の富士、東の筑波」と称されてきました。筑波山神社からケーブルカー、つつじヶ丘からロープウェイで山頂近くまで登れます。', mapQuery: '筑波山' },
      { name: '御岩山・御岩神社', area: '日立市', areaSlug: 'hitachi', desc: '御岩山そのものを信仰の対象としてきた神社で、いまも山頂へ向かう登拝の道が続きます。参道に立つ「三本杉」は樹高50メートルで、林野庁の「森の巨人たち100選」に選ばれています。登拝は15時までに始め、雨天・降雪時はできません。', image: IMG_OIWA, mapQuery: '御岩神社 茨城県日立市' },
      { name: '奥久慈男体山', area: '大子町', areaSlug: 'daigo', desc: '奥久慈の岩山。鎖場のある登山道と、山頂からの眺めで知られます。ふもとには袋田の滝や温泉があり、山と水辺を一日で巡れます。' },
      { name: '竜神峡・竜神大吊橋', area: '常陸太田市', areaSlug: 'hitachiota', desc: '全長375メートルの歩行者専用吊橋（日本最大級）から、渓谷を見下ろせます。新緑と紅葉の名所で、橋の上からは日本一高い100メートルのバンジージャンプもできます。' },
      { name: '花貫渓谷', area: '高萩市', areaSlug: 'takahagi', desc: '汐見滝吊り橋を包む「紅葉のトンネル」で知られる渓谷。秋にはライトアップも行われます。' },
      { name: '御前山（関東の嵐山）', area: '常陸大宮市', areaSlug: 'hitachiomiya', desc: '那珂川ごしに見る紅葉が知られる、茨城百景のひとつ。ハイキングコースがあり、川と山の両方を楽しめます。' },
    ],
    practical: [
      ['登山の準備', '低山でも、登山道には険しい区間があります（奥久慈男体山の鎖場など）。歩きやすい靴と、天候・日没時間の確認を。'],
      ['ケーブルカー／ロープウェイ', '筑波山のケーブルカー・ロープウェイは、悪天候時に運休することがあり、冬季には定期点検の運休期間があります。運行状況を確認してから。'],
      ['登拝の時間', '御岩神社の登拝は15時までに始めてください。雨天・降雪・積雪時は登拝できません。山は日が暮れるのが早いので、早めの行動を。'],
      ['紅葉と混雑', '竜神峡・花貫渓谷・御前山・奥久慈は例年11月ごろが見頃。まつり期間は周辺が混雑し、交通規制が敷かれることがあります。'],
    ],
    sources: [
      { label: '筑波山ケーブルカー&ロープウェイ（公式）', url: 'https://mt-tsukuba.com/' },
      { label: '御岩神社（公式）', url: 'https://oiwajinja.jp/' },
      { label: '大子町観光協会（公式）', url: 'https://www.daigo-kanko.jp/' },
      { label: '竜神大吊橋（公式）', url: 'https://ohtsuribashi.ryujinkyo.jp/' },
    ],
    related: [
      { slug: 'tsukuba', name: 'つくば市' }, { slug: 'hitachi', name: '日立市' }, { slug: 'daigo', name: '大子町' }, { slug: 'hitachiota', name: '常陸太田市' }, { slug: 'takahagi', name: '高萩市' }, { slug: 'hitachiomiya', name: '常陸大宮市' }, { slug: 'kasama', name: '笠間市' },
    ],
    checkedAt: CHECKED,
    metaTitle: '茨城の山｜日本百名山最低峰の筑波山と奥久慈の渓谷ガイド｜イバトコ',
    metaDescription: '日本百名山で最も低い筑波山（標高877m）、山そのものを信仰する御岩山、鎖場の奥久慈男体山、日本最大級の竜神大吊橋、紅葉の花貫渓谷・御前山まで。茨城の山と渓谷の名所、登山前の注意点をまとめました。',
  },

  hana: {
    slug: 'hana',
    kicker: 'IBARAKI FLOWERS',
    title: '茨城の花',
    lead: '茨城は、花の見頃がリレーのように続く県です。早春の梅から、桜、ネモフィラ、つつじ、初夏のあやめ・あじさいへ。世界的に知られるネモフィラの丘、日本三名園の梅、遅咲きの八重桜。茨城の花の名所を、季節の順にまとめました。',
    hero: IMG_NEMOPHILA,
    sections: [
      { kicker: '見頃のリレー', title: '梅から、あじさいまで。', body: '2月の梅（偕楽園）にはじまり、4月の桜、4〜5月のネモフィラとつつじ、6月のあやめ・あじさいへ。花の見頃が途切れずに続くのが、茨城の花のめぐり方です。' },
      { kicker: '色を変える丘', title: '同じ丘が、春は青、秋は赤。', body: '国営ひたち海浜公園のみはらしの丘は、春は約530万本のネモフィラで青く、秋は約3万2千本のコキアで赤く染まります。季節をずらして、二度訪ねたい場所です。' },
    ],
    spotsHeading: '花の名所（季節順）',
    spots: [
      { name: '偕楽園の梅', area: '水戸市', areaSlug: 'mito', desc: '例年2月中旬から3月。金沢の兼六園、岡山の後楽園と並ぶ日本三名園のひとつで、約100品種3,000本の梅が、早咲き・中咲き・遅咲きと順に咲きます。水戸の梅まつりの会場です。', mapQuery: '偕楽園 水戸市' },
      { name: '福岡堰の桜', area: 'つくばみらい市', areaSlug: 'tsukubamirai', desc: '例年4月。関東三大堰のひとつ、福岡堰の水辺に約1.8キロメートルの桜並木が続きます。', mapQuery: '福岡堰 つくばみらい市' },
      { name: '静峰ふるさと公園の八重桜', area: '那珂市', areaSlug: 'naka', desc: '例年4月下旬。約2,000本の八重桜が、ソメイヨシノより遅い時期に見頃を迎えます。「日本さくら名所100選」の一つで、県内の桜が終わったあとに花見を延ばせます。' },
      { name: 'ひたち海浜公園のネモフィラ', area: 'ひたちなか市', areaSlug: 'hitachinaka', desc: '例年4月中旬から5月上旬。「みはらしの丘」を約530万本のネモフィラが青く染めます。秋には同じ丘が、約3万2千本のコキアで赤く紅葉します。', mapQuery: '国営ひたち海浜公園' },
      { name: '笠間のつつじ', area: '笠間市', areaSlug: 'kasama', desc: '例年春。笠間つつじ公園では、市街を見下ろす高台の山肌をつつじが彩ります。' },
      { name: '雨引観音のあじさい', area: '桜川市', areaSlug: 'sakuragawa', desc: '例年6月10日から7月20日のあじさい祭。雨引山楽法寺の境内に100種5,000株のあじさいが咲き、水に浮かべる「水中華」でも知られます。' },
      { name: '水郷潮来のあやめ', area: '潮来市', areaSlug: 'itako', desc: '例年5月下旬から6月下旬の水郷潮来あやめまつり。前川の水郷潮来あやめ園に約500種100万株の花菖蒲が咲き、伝統の「嫁入り舟」も行われます。', mapQuery: '水郷潮来あやめ園' },
      { name: '小貝川のポピー・コスモス', area: '下妻市', areaSlug: 'shimotsuma', desc: '小貝川ふれあい公園では、春にポピー、秋にコスモスが一面に咲きます。' },
    ],
    practical: [
      ['花ごとの見頃', '梅は2月中旬〜3月、桜は3月下旬〜4月、八重桜は4月下旬、ネモフィラは4月中旬〜5月上旬、つつじは4〜5月、あやめ・あじさいは6月、コキアの紅葉は10月中旬。見頃は年で動くため、公式の開花情報を確認してください。'],
      ['混雑', 'ネモフィラや梅まつりの最盛期は、周辺道路と駐車場が大変混雑します。臨時駐車場や公共交通の案内を確認して。'],
      ['入園料', '国営ひたち海浜公園や偕楽園は、時期・区域によって入園料がかかります。'],
      ['雨と花', 'あじさいは梅雨に見頃を迎える花です。足元と天候に注意して訪ねてください。'],
    ],
    sources: [
      { label: '国営ひたち海浜公園（公式）', url: 'https://www.hitachikaihin.jp/' },
      { label: '日本三名園 偕楽園（公式）', url: 'https://ibaraki-kairakuen.jp/' },
      { label: '水郷潮来あやめまつり｜潮来市', url: 'https://www.city.itako.lg.jp/kankou/kankou-event/kankou-mainevent/kankou-ayamefes/page005638.html' },
      { label: 'あじさい祭｜雨引観音（雨引山楽法寺）', url: 'http://www.amabiki.or.jp/annualevents/ajisai/' },
    ],
    related: [
      { slug: 'mito', name: '水戸市' }, { slug: 'hitachinaka', name: 'ひたちなか市' }, { slug: 'naka', name: '那珂市' }, { slug: 'sakuragawa', name: '桜川市' }, { slug: 'tsukubamirai', name: 'つくばみらい市' }, { slug: 'kasama', name: '笠間市' }, { slug: 'itako', name: '潮来市' }, { slug: 'shimotsuma', name: '下妻市' },
    ],
    checkedAt: CHECKED,
    metaTitle: '茨城の花｜梅・桜・ネモフィラ・あやめ・あじさいの見頃と名所ガイド｜イバトコ',
    metaDescription: '偕楽園の梅、静峰の八重桜、ひたち海浜公園の約530万本のネモフィラ、雨引観音のあじさい、水郷潮来のあやめまで。早春から初夏へ、見頃がリレーのように続く茨城の花の名所を季節順にまとめました。',
  },

  matsuri: {
    slug: 'matsuri',
    kicker: 'IBARAKI FESTIVALS',
    title: '茨城の祭り',
    lead: '茨城の祭りは、「担い手」で読めます。ユネスコ無形文化遺産のからくり山車、住民が3年に一度組み立てる舞台、蛙の面で柱に登る舞。40万人が集まる関東三大祭から、その日にしか見られない小さな行事まで。土地に受け継がれてきた行事をまとめました。',
    hero: IMG_SAKURA,
    sections: [
      { kicker: '受け継ぐ人', title: '住民の手で、組み立て、演じる。', body: '日立風流物、大塚戸の綱火、西塩子の回り舞台。茨城の祭りの多くは、地域の人の手で組み立て、演じられてきました。誰がつないできたのかに目を向けると、行事の重みが見えてきます。' },
      { kicker: 'その日だけ', title: '年に一度、あるいは三年に一度。', body: '撞舞は7月、大塚戸の綱火は9月13日、西塩子の回り舞台はおよそ3年に一度の秋。見たい行事があるなら、その日に合わせて予定を組むしかありません。' },
    ],
    spotsHeading: '土地に残る行事',
    spots: [
      { name: '石岡のおまつり（常陸國總社宮例大祭）', area: '石岡市', areaSlug: 'ishioka', desc: '例年9月、敬老の日を最終日とする三連休。創建千年の常陸國總社宮の例大祭で、幌獅子と山車が町を巡り、およそ40万人が訪れます。関東三大祭のひとつです。', mapQuery: '常陸國總社宮 石岡市' },
      { name: '日立風流物（日立さくらまつり）', area: '日立市', areaSlug: 'hitachi', desc: '例年4月の日立さくらまつりなどで公開。高さ15メートル、重さ5トンの山車の上部が5層に開き、それぞれが舞台になってからくり人形が芝居を演じます。ユネスコ無形文化遺産です。' },
      { name: '水戸黄門まつり', area: '水戸市', areaSlug: 'mito', desc: '例年8月。千波湖の花火（名門・野村花火工業）で幕を開ける、夏の水戸の祭りです。' },
      { name: '笠間の陶炎祭（ひまつり）', area: '笠間市', areaSlug: 'kasama', desc: '例年ゴールデンウィーク。約200人の陶芸家や窯元が笠間芸術の森公園に集う、県内最大の陶器市です。' },
      { name: '撞舞（つくまい）', area: '龍ケ崎市', areaSlug: 'ryugasaki', desc: '例年7月。高さ14メートルの撞柱に、蛙の面をかぶった舞男が登り、曲芸を演じます。およそ450年続くとされ、国選択・茨城県指定の無形民俗文化財です。' },
      { name: '大塚戸の綱火', area: '常総市', areaSlug: 'joso', desc: '9月13日、一言主神社の秋季例大祭で奉納される、からくり花火の行事。人形を綱で操りながら花火を使います。年に一度、この日にしか見られません。' },
      { name: '水郷潮来あやめまつり（嫁入り舟）', area: '潮来市', areaSlug: 'itako', desc: '例年5月下旬から6月下旬。あやめの咲く水郷で、花嫁が手こぎのろ舟で嫁ぐ伝統の「嫁入り舟」が行われます。' },
      { name: '西塩子の回り舞台', area: '常陸大宮市', areaSlug: 'hitachiomiya', desc: 'およそ3年に一度の秋。江戸時代後期から伝わる組み立て式の農村歌舞伎の舞台を、住民が組み立て、地芝居を演じます。' },
    ],
    practical: [
      ['開催日', '祭りの開催日は毎年変わり、雨天で中止・順延になることもあります。撞舞は7月、大塚戸の綱火は9月13日、回り舞台は3年に一度など、事前に各公式で確認を。'],
      ['混雑・交通規制', '石岡のおまつりや水戸黄門まつりなどは、市街で交通規制が敷かれ大変混雑します。公共交通の利用がおすすめです。'],
      ['花火の行事', '土浦全国花火競技大会など花火が中心の行事は、〈茨城の花火〉のページでまとめています。'],
      ['見られない年もある', '西塩子の回り舞台は毎年ではなく、綱火や撞舞も年に一度だけ。開催の年・日を調べてから予定を組んでください。'],
    ],
    sources: [
      { label: '石岡のおまつり｜石岡市観光協会', url: 'https://www.ishioka-kankou.com/events/ishioka-matsuri/' },
      { label: '水戸黄門まつり（公式）', url: 'https://mitokoumon.com/koumon/' },
      { label: '西塩子の回り舞台｜常陸大宮市', url: 'https://www.city.hitachiomiya.lg.jp/kankou_guide/festival_event/page003004.html' },
      { label: '観光いばらき（県公式）', url: 'https://www.ibarakiguide.jp/' },
    ],
    related: [
      { slug: 'ishioka', name: '石岡市' }, { slug: 'hitachi', name: '日立市' }, { slug: 'mito', name: '水戸市' }, { slug: 'kasama', name: '笠間市' }, { slug: 'ryugasaki', name: '龍ケ崎市' }, { slug: 'joso', name: '常総市' }, { slug: 'itako', name: '潮来市' }, { slug: 'hitachiomiya', name: '常陸大宮市' },
    ],
    checkedAt: CHECKED,
    metaTitle: '茨城の祭り｜石岡のおまつり・日立風流物・撞舞など土地の行事ガイド｜イバトコ',
    metaDescription: '約40万人が訪れる関東三大祭「石岡のおまつり」、ユネスコ無形文化遺産の日立風流物、約450年続く龍ケ崎の撞舞、常総の大塚戸の綱火、潮来の嫁入り舟まで。担い手が受け継ぐ茨城の祭りと、その開催時期をまとめました。',
  },

  kouyou: {
    slug: 'kouyou',
    kicker: 'IBARAKI AUTUMN LEAVES',
    title: '茨城の紅葉',
    lead: '秋の茨城は、9月のコキアから11月の渓谷へと、順に色づいていきます。ひたちなかのみはらしの丘を埋めるコキア。日本三名瀑・袋田の滝、日本最大級の吊橋がかかる竜神峡、橋を包む花貫渓谷の紅葉のトンネル。丘から渓谷まで、茨城の秋をまとめました。',
    status: {
      updatedAt: '2026年9月18日',
      period: {
        from: '2026-09-18',
        to: '2026-11-03',
        label: 'きて みて さわって コキアカーニバル（国営ひたち海浜公園）',
        place: 'ひたちなか市',
        municipality: 'hitachinaka',
      },
      heading: 'いまのコキアと、次に色が変わる目安',
      rows: [
        ['いまの状態', '9月18日（金）に「きて みて さわって コキアカーニバル」が始まりました。公園公式の観賞時期では、コキアは9月下旬まで「緑葉」の期間です。'],
        ['次に色が変わる順番', '公園公式が示している観賞時期は、緑葉（8月中旬〜9月下旬）→ グラデーション・緑と赤（10月上旬）→ 紅葉（10月中旬）→ グラデーション・赤と茶（10月下旬）→ 黄金（10月下旬〜11月初旬）です。その年の気象条件によって変動すると明記されています。'],
        ['紅葉始め', '10月10日頃（公園公式の予想、9月17日時点）'],
        ['紅葉見頃', '10月15日頃（同上）。例年、紅葉のピークは1週間〜10日程とされています。'],
        ['夜の見どころ', 'コキアライトアップは9月18日（金）〜27日（日）の10日間。約4万本のコキアを音と光で照らします。演出は17:30に始まり、1セット約50分を5回。観覧には別途、有料の観覧券が必要です。'],
      ],
      spotBoard: {
        heading: 'いま、どこが見頃か',
        note: '「2026年の発表」の列は、各スポットの公式サイト・観光協会をイバトコが確認した結果です。2026年9月20日時点で、その年の見頃予想を出しているのは国営ひたち海浜公園のコキアだけでした。ほかのスポットは、例年の時期だけが分かっている状態です。前年の日付を今年の見頃として載せることはしません。',
        rows: [
          { spot: 'コキア（国営ひたち海浜公園）', area: 'ひたちなか市', areaSlug: 'hitachinaka', usual: '10月中旬', now: '紅葉始め10月10日頃、見頃10月15日頃（公園公式・9月17日時点の予想）', confirmed: true },
          { spot: '袋田の滝', area: '大子町', areaSlug: 'daigo', usual: '11月ごろ', now: '2026年分の発表は確認できず（9月20日確認）', confirmed: false },
          { spot: '奥久慈（男体山・月待の滝）', area: '大子町', areaSlug: 'daigo', usual: '11月ごろ', now: '2026年分の発表は確認できず（9月20日確認）', confirmed: false },
          { spot: '竜神峡・竜神大吊橋', area: '常陸太田市', areaSlug: 'hitachiota', usual: '11月ごろ', now: '2026年分の発表は確認できず（9月20日確認）', confirmed: false },
          { spot: '花貫渓谷・汐見滝吊り橋', area: '高萩市', areaSlug: 'takahagi', usual: '11月ごろ', now: '2026年分の発表は確認できず（9月20日確認）', confirmed: false },
          { spot: '筑波山', area: 'つくば市', areaSlug: 'tsukuba', usual: '11月ごろ', now: '2026年分の発表は確認できず（9月20日確認）。公式は「例年秋季〜冬季にかけ夜間運行を開催」としています', confirmed: false },
          { spot: '御前山（関東の嵐山）', area: '常陸大宮市', areaSlug: 'hitachiomiya', usual: '11月ごろ', now: '未確認', confirmed: false },
        ],
      },
      note: '紅葉予想は今後の天候で変わると公園公式が明記しています。出かける前に公式の最新情報を確認してください。イバトコが独自に日々の色づきを予想することはしません。',
      links: [
        { label: '茨城の公園（ひたち海浜公園ほか）', href: '/koen/' },
        { label: 'ひたちなか市を読む', href: '/area/hitachinaka/' },
        { label: '那珂湊おさかな市場で昼を食べる', href: '/events/nakaminato-ichibazushi-guide/' },
        { label: '大洗・ひたちなかを回るバスツアーの立ち寄り先', href: '/events/ibaraki-bus-tour-spots/' },
        { label: 'Hitachi Seaside Park from Tokyo（English）', href: '/en/hitachi-seaside-park-from-tokyo/' },
      ],
    },
    hero: IMG_FUKURODA,
    sections: [
      { kicker: '丘が、赤くなる', title: '木ではなく、草が色づく秋。', body: '茨城の秋は、渓谷より先に丘から始まります。国営ひたち海浜公園のみはらしの丘とみはらしの里を埋める約4万本のコキアは、10月に入ると緑から赤へ移り、丘ごと色が変わります。木の紅葉とは違う、草の紅葉です。' },
      { kicker: '渓谷と吊橋', title: '橋の上から、色づいた谷を見る。', body: '竜神峡の大吊橋、花貫渓谷の汐見滝吊り橋。橋の上から紅葉の渓谷を見下ろせるのが、茨城の紅葉のおもしろさです。' },
      { kicker: '滝と紅葉', title: '滝の白と、紅葉の赤。', body: '袋田の滝や奥久慈の水辺では、滝の白と紅葉の赤が重なります。見頃は例年11月ごろ。山あいに、秋がいっせいに降りてきます。' },
    ],
    spotsHeading: '紅葉の名所',
    spots: [
      { name: 'コキア（国営ひたち海浜公園）', area: 'ひたちなか市', areaSlug: 'hitachinaka', desc: 'みはらしの丘とみはらしの里に、今年は約4万本。ふもとから頂上まで続く風景になります。公園公式は2026年の紅葉を10月10日頃に始まり、10月15日頃に見頃と予想しています（9月17日時点）。9月18日〜11月3日は「コキアカーニバル」。', mapQuery: '国営ひたち海浜公園 みはらしの丘' },
      { name: '袋田の滝', area: '大子町', areaSlug: 'daigo', desc: '高さ120メートル、幅73メートルの日本三名瀑。周囲の大岩壁を紅葉が彩ります。例年11月ごろが見頃です。', mapQuery: '袋田の滝 大子町' },
      { name: '竜神峡・竜神大吊橋', area: '常陸太田市', areaSlug: 'hitachiota', desc: '全長375メートルの歩行者専用吊橋（日本最大級）から、紅葉の渓谷を見下ろせます。竜神峡紅葉まつりも開かれます。', mapQuery: '竜神大吊橋 常陸太田市' },
      { name: '花貫渓谷・汐見滝吊り橋', area: '高萩市', areaSlug: 'takahagi', desc: '汐見滝吊り橋のあたりで、赤や黄に色づいた木々が橋を包む「紅葉のトンネル」になります。まつり期間にはライトアップも。' },
      { name: '御前山（関東の嵐山）', area: '常陸大宮市', areaSlug: 'hitachiomiya', desc: '「関東の嵐山」と呼ばれる、茨城百景のひとつ。那珂川ごしに見る紅葉が知られます。' },
      { name: '奥久慈（男体山・月待の滝）', area: '大子町', areaSlug: 'daigo', desc: '奥久慈男体山の岩山や、裏側から眺められる月待の滝など、奥久慈一帯が色づきます。' },
      { name: '筑波山', area: 'つくば市', areaSlug: 'tsukuba', desc: '日本百名山で最も低い筑波山も、秋には山肌が色づきます。ケーブルカーやロープウェイから紅葉を見られます。', mapQuery: '筑波山' },
    ],
    practical: [
      ['見頃', 'コキアは10月中旬から下旬。渓谷や滝は、いずれも例年11月ごろが見頃です。標高や年で前後するため、各公式・観光いばらきの紅葉情報を確認してください。'],
      ['ひたち海浜公園の入園料', '中学生以下は無料、大人450円、シルバー（65歳以上）210円。10月9日（金）〜11月3日（火・祝）は季節料金期間で、大人800円、シルバー560円になります（中学生以下は無料のまま）。'],
      ['ひたち海浜公園の駐車料金', '1日あたり普通車600円、二輪車300円、大型車1,800円。入園料が無料の日でも駐車料金は別途かかります。'],
      ['入園無料の日', '9月21日（月・祝）は敬老の日のため65歳以上の方、9月26日（土）と27日（日）は秋季の都市緑化月間のためすべての方が入園無料です。ライトアップの観覧には別途、有料の観覧券が必要です。'],
      ['ひたち海浜公園の開園時間', 'コキアカーニバル期間中は、9月18日〜10月31日が9:30〜17:00、11月1日〜3日が9:30〜16:30。期間中は9月29日（火）を除き毎日開園です。'],
      ['混雑・交通規制', '竜神峡・花貫渓谷・袋田の紅葉まつり期間は、周辺道路と駐車場が大変混雑します。シャトルバスや交通規制になることもあります。'],
      ['足元と日没', '渓谷や山は日が暮れるのが早く、足元も不安定です。歩きやすい靴と、早めの行動を。'],
      ['冬の氷瀑へ', '袋田の滝は、冬にかけて全体が凍る「氷瀑」になることもあります（→〈茨城の川と湖〉）。'],
    ],
    faq: [
      { question: '2026年のコキアの紅葉はいつが見頃ですか。', answer: '国営ひたち海浜公園は、みはらしの丘のコキアが10月10日頃に「紅葉始め」、10月15日頃に「紅葉見頃」を迎えると予想しています（9月17日時点の公式発表）。例年、紅葉のピークは1週間〜10日程とされています。紅葉予想は今後の天候で変わると公式が明記しているため、出かける前に公園公式の最新情報を確認してください。' },
      { question: 'コキアカーニバルはいつからいつまでですか。', answer: '「きて みて さわって コキアカーニバル」は2026年9月18日（金）から11月3日（火・祝）までです。開園時間は9月18日〜10月31日が9:30〜17:00、11月1日〜3日が9:30〜16:30。期間中は9月29日（火）を除き毎日開園します。' },
      { question: 'コキアライトアップはいつですか。お金はかかりますか。', answer: 'コキアライトアップ2026は9月18日（金）から9月27日（日）までの10日間です。みはらしの丘で約4万本のコキアを音と光で演出し、17:30から1セット約50分を5回行います。入園料とは別に、有料の観覧券が必要です。' },
      { question: 'ひたち海浜公園に無料で入れる日はありますか。', answer: '9月21日（月・祝）は敬老の日のため65歳以上の方、9月26日（土）と27日（日）は秋季の都市緑化月間のためすべての方が入園無料になります。ただし駐車場料金は別途必要で、ライトアップの観覧にも別途、有料の観覧券が必要です。' },
      { question: '東京からひたち海浜公園にはどう行きますか。', answer: '公園公式の案内では、電車は東京駅から勝田駅までJR常磐線の特急で約85分、勝田駅東口2番乗り場から路線バスで海浜公園西口まで約15分です（プレジャーガーデン前まで約25分、南口まで約30分）。勝田駅からは海浜公園1日フリーきっぷも販売されています。高速バスの場合は、東京駅八重洲南口から水戸駅南口まで茨城交通「みと号」で約2時間、水戸駅から勝田駅までJR常磐線で約6分です。勝田駅東口からタクシーで西口まで約15分という行き方もあります。' },
      { question: 'コキア以外の紅葉はいつ頃ですか。', answer: '袋田の滝、竜神峡・竜神大吊橋、花貫渓谷、御前山、奥久慈、筑波山は、いずれも例年11月ごろが見頃です。標高や年によって前後するため、各施設の公式情報や観光いばらきの紅葉情報で確認してください。' },
    ],
    sources: [
      { label: '国営ひたち海浜公園（2026年コキア紅葉＆混雑予想）', url: 'https://www.hitachikaihin.jp/news/park/page001059.html' },
      { label: '国営ひたち海浜公園（コキア・観賞時期）', url: 'https://www.hitachikaihin.jp/flower-plant/flower/kochia.html' },
      { label: '国営ひたち海浜公園（コキアライトアップ2026）', url: 'https://www.hitachikaihin.jp/event/kochialightup/' },
      { label: '国営ひたち海浜公園（電車・バスでのアクセス）', url: 'https://www.hitachikaihin.jp/access/train-bus.html' },
      { label: '大子町観光協会（袋田の滝・紅葉情報）', url: 'https://www.daigo-kanko.jp/' },
      { label: '竜神大吊橋（公式）', url: 'https://ohtsuribashi.ryujinkyo.jp/' },
      { label: '高萩市観光協会（花貫渓谷）', url: 'https://www.takahagi-kanko.jp/' },
      { label: '観光いばらき（県公式）', url: 'https://www.ibarakiguide.jp/' },
    ],
    related: [
      { slug: 'hitachinaka', name: 'ひたちなか市' }, { slug: 'daigo', name: '大子町' }, { slug: 'hitachiota', name: '常陸太田市' }, { slug: 'takahagi', name: '高萩市' }, { slug: 'hitachiomiya', name: '常陸大宮市' }, { slug: 'tsukuba', name: 'つくば市' }, { slug: 'hitachi', name: '日立市' },
    ],
    checkedAt: '2026年9月18日',
    metaTitle: '茨城の紅葉2026｜コキアの見頃予想と袋田の滝・竜神大吊橋・花貫渓谷｜イバトコ',
    metaDescription: 'ひたち海浜公園のコキアは2026年10月10日頃に紅葉始め、10月15日頃に見頃の予想（公園公式・9月17日時点）。コキアカーニバルとライトアップの日程、入園料と無料日、袋田の滝・竜神大吊橋・花貫渓谷など11月の紅葉の名所をまとめました。',
  },
};

/**
 * ある市町村に関わるテーマを、テーマ側のデータから逆引きする。
 * テーマページが「この街」を挙げている場合だけ返すので、
 * テーマ→市町村と市町村→テーマの関係が必ず対称になる（片側だけの嘘が生まれない）。
 */
export function themesForArea(areaSlug: string): { slug: string; title: string; kicker: string }[] {
  return Object.values(THEMES)
    .filter((theme) =>
      theme.related.some((r) => r.slug === areaSlug) ||
      theme.spots.some((s) => s.areaSlug === areaSlug))
    .map((theme) => ({ slug: theme.slug, title: theme.title, kicker: theme.kicker }));
}
