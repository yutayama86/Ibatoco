# 実装仕様：rockin'star Carnival 2026 新規記事＋10月イベントページSEO改善

## 管理情報

- action ID: 20260921-rockinstar-carnival-2026
- 作成日: 2026-09-21
- 対象URL: /events/rockinstar-carnival-2026/
- 施策種別: new-article + seo + internal-link
- 優先度: critical（開催12日前・大型・未掲載）
- 実装可否: ready

## 目的と根拠

- 解決する読者課題: 開催日時、花火時間、チケット料金、勝田駅からの移動、駐車券、雨天時の扱いを一か所で確認できるようにする。
- 主KW: rockin'star Carnival 2026
- 関連KW: ロッキンスター カーニバル 2026 / ひたち海浜公園 花火 2026 / ひたちなか 花火 10月3日 / rockin'star Carnival チケット / rockin'star Carnival アクセス
- 検索意図: 開催概要、料金、交通、駐車場、持ち物、雨天時対応を確認して来場判断をしたい。
- 現状データ: GSC最新日は2026-09-16で48時間超のため検索需要の数値はunknown。イバトコに単独記事はなく、10月イベントまとめにも掲載がない。
- 緊急性: 2026年10月3日開催で確認日から12日。公式発表済み、約2万発、有料チケット制、勝田駅から臨時輸送と事前駐車券が必要な大型イベント。
- この施策を今選ぶ理由: 誤記訂正は緊急保守として別枠で実行し、本件を今日の1件の成長施策とする。開催前需要、県外来訪、交通・飲食・宿泊への波及、翌年更新できるイベント資産性がある。

## 一次情報

確認日はいずれも2026-09-21。

1. 公式トップ・開催概要: https://rockinstarcarnival.jp/
2. 公式チケット: https://rockinstarcarnival.jp/2026/ticket/ippan/
3. 公式アクセス: https://rockinstarcarnival.jp/2026/access/
4. 公式注意事項: https://rockinstarcarnival.jp/2026/notice/
5. 国営ひたち海浜公園アクセス: https://www.hitachikaihin.jp/access/

## 新規作成ファイル

`src/content/events/rockinstar-carnival-2026.md`

以下を全文そのまま作成する。

~~~md
---
title: "rockin'star Carnival 2026｜10月3日、ひたち海浜公園で2万発の音楽花火"
description: "rockin'star Carnival 2026は10月3日（土）に国営ひたち海浜公園で開催。開場11時、花火は18時〜19時15分予定です。チケット料金、勝田駅からのシャトルバス、駐車券、雨天時の扱いを公式情報から整理します。"
pubDate: 2026-09-21
updatedDate: 2026-09-21
articleType: "event"
searchIntent: "rockin'star Carnival 2026の開催時間、チケット料金、アクセス、駐車場、雨天時の扱いを知りたい"
keyword: "rockin'star Carnival 2026"
lifespan: "seasonal"
prefecture: "茨城県"
municipalities:
  - hitachinaka
tags:
  - "花火大会"
  - "ひたちなか市"
  - "国営ひたち海浜公園"
  - "秋のおでかけ"
draft: false
reviewed: true
noindex: false
summary: "rockin'star Carnival 2026（ロッキンスター・カーニバル）は、2026年10月3日（土曜日）に国営ひたち海浜公園で開催されます。開場11時、イベント開演12時30分、花火は18時から19時15分までの予定です。DJ和が選ぶJ-ROCK・J-POPと約2万発の花火を同期させる音楽花火で、入場にはチケットが必要です。一般発売は大人8,000円、中高生6,000円、小学生4,000円、未就学児は保護者同伴で無料。車は入場券とは別に2,500円の駐車券を事前購入し、紙チケットを発券する必要があります。勝田駅東口から会場直行の有料シャトルバスも運行されます。"
keyPoints:
  - "開催日は2026年10月3日（土曜日）。国営ひたち海浜公園で、開場11時・開演12時30分"
  - "音楽花火は18時開始、19時15分終了予定。J-ROCK・J-POPと約20,000発の花火が連動する"
  - "一般発売は大人8,000円、中高生6,000円、小学生4,000円。未就学児は保護者同伴で無料"
  - "車は入場券とは別に駐車券2,500円が必要。事前購入・紙チケット発券が必須"
  - "勝田駅東口から翼のゲートまで有料直行シャトルバスを運行。往路10時〜17時、復路19時〜21時"
  - "雨天決行、荒天の場合は中止。開催直前は公式サイトで最新情報を確認する"
eventInfo:
  name: "rockin'star Carnival 2026"
  startDate: 2026-10-03
  time: "開場11:00／開演12:30／花火18:00〜19:15（予定）"
  startTime: "12:30"
  endTime: "19:15"
  venue: "国営ひたち海浜公園"
  address: "茨城県ひたちなか市馬渡字大沼605-4"
  fee: "一般発売：大人8,000円、中高生6,000円、小学生4,000円。未就学児は保護者同伴で無料。駐車券は1台2,500円"
  parking: "車1台につき事前購入の駐車券が1枚必要。利用可能時間10:30〜21:00、入庫は18:30まで。再入庫不可。紙の駐車券を事前発券する"
  publicTransport: "JR常磐線・勝田駅東口から会場の翼のゲートまで有料直行シャトルバスを随時運行。往路10:00〜17:00、復路19:00〜21:00"
  access: "勝田駅からのシャトルバスは片道大人600円・小学生300円、往復大人1,200円・小学生600円。通常の所要時間は約20分だが、当日は混雑が予想される"
  weatherPolicy: "雨天決行。荒天の場合は中止"
  status: "scheduled"
  officialName: "rockin'star Carnival 2026 公式サイト"
  officialUrl: "https://rockinstarcarnival.jp/"
highlights:
  - title: "J-ROCK・J-POPと約2万発の花火"
    detail: "DJ和による75分間のセットリストに、約20,000発の花火、照明、特効、レーザー、映像を組み合わせる音楽花火です。花火は18時から19時15分までを予定しています。"
  - title: "指定席なし、4つの観覧エリア"
    detail: "観覧場所はスタンディング、シート、イス、テントの各ゾーンに分かれ、エリア間は移動できます。シートやイス、テントにはサイズ・使用場所のルールがあるため、公式エリアマップと注意事項を確認してください。"
  - title: "昼から楽しめるステージと公園"
    detail: "開演は12時30分。DJ和のステージに加え、ひたちなか市内中学校の吹奏楽部、水戸ホーリーホックのキッズチアスクールが出演予定です。園内では色づき始めるコキアやプレジャーガーデンも案内されています。"
  - title: "飲食エリアは50店舗規模へ拡大"
    detail: "公式プロデューサーメッセージでは、JAPAN Sweets Festivalとフェス飯を含む飲食店舗を前年の30店舗から50店舗へ拡大すると案内しています。"
notes:
  - "一般発売は先着順で、予定枚数に達し次第終了します。販売状況と料金は購入前に公式チケットページで再確認してください"
  - "入場券・駐車券は紙チケットです。購入履歴だけでは入場・駐車できないため、事前に発券してください"
  - "入場時に本人確認が行われる場合があります。公式が案内する有効な身分証明書の原本を持参してください"
  - "車で来場する場合は、カーナビ任せにせず、購入した駐車場ごとに公式が指定するルートを利用してください"
  - "終演後は勝田駅行きシャトルバスや周辺道路の混雑が予想されます。帰宅時間には余裕を持ってください"
  - "公式画像、ロゴ、出演者写真は利用条件を確認できていないため、イバトコの記事へ転載しません"
faq:
  - question: "rockin'star Carnival 2026はいつ、何時からですか。"
    answer: "2026年10月3日（土曜日）です。国営ひたち海浜公園で11時開場、12時30分開演。音楽花火は18時から19時15分までの予定です。"
  - question: "チケットはいくらですか。"
    answer: "一般発売は大人8,000円、中高生6,000円、小学生4,000円です。参加当日時点で未就学の子どもは、保護者同伴に限り無料です。先着販売のため、最新の販売状況は公式チケットページで確認してください。"
  - question: "勝田駅から会場へ行くバスはありますか。"
    answer: "勝田駅東口から会場の翼のゲートまで、有料直行シャトルバスが随時運行されます。往路は10時から17時、復路は19時から21時。料金は片道大人600円・小学生300円、往復大人1,200円・小学生600円です。"
  - question: "車で行けますか。"
    answer: "車での来場には、入場券とは別に車1台につき1枚の駐車券が必要です。一般発売の駐車券は2,500円で、紙チケットを事前発券します。駐車場は10時30分から21時まで、入庫は18時30分までで、再入庫はできません。"
  - question: "雨の場合は中止ですか。"
    answer: "公式案内は雨天決行で、荒天の場合は中止です。天候による変更は、出発前に公式サイトで最新情報を確認してください。"
  - question: "イスやシートを持ち込めますか。"
    answer: "指定されたイスゾーンとシートゾーンで使用できます。シートは1人あたり60〜90cmが目安です。ゾーンごとに使用できる物が異なるため、公式エリアマップと注意事項を確認してください。"
booking:
  heading: "公式情報とチケットを確認"
  intro: "日程・販売状況・交通は変更される可能性があります。主催者の最新情報を確認してから来場してください。"
  basis: "開催情報の一次情報を先に、購入に必要な公式チケット情報を次に掲載しています。広告報酬による並び順ではありません。"
  items:
    - label: "開催概要・最新情報を公式サイトで確認"
      provider: "rockinstar-official"
      url: "https://rockinstarcarnival.jp/"
      note: "開催可否、タイムテーブル、エリアマップ、注意事項の確認先"
      kind: "official"
    - label: "チケット一般発売・販売状況を確認"
      provider: "rockinstar-ticket"
      url: "https://rockinstarcarnival.jp/2026/ticket/ippan/"
      note: "入場券・駐車券の料金、販売先、発券方法の確認先"
      kind: "ticket"
  note: "購入後のキャンセルや券種変更はできないと案内されています。購入前に公式条件をご確認ください。"
businessIntent:
  booking: true
  accommodation: false
  parking: true
  food: true
  experience: true
  businessLead: false
evergreen: false
sourceUrls:
  - label: "rockin'star Carnival 2026 公式サイト"
    url: "https://rockinstarcarnival.jp/"
    accessedAt: 2026-09-21
  - label: "rockin'star Carnival 2026｜チケット一般発売"
    url: "https://rockinstarcarnival.jp/2026/ticket/ippan/"
    accessedAt: 2026-09-21
  - label: "rockin'star Carnival 2026｜アクセス"
    url: "https://rockinstarcarnival.jp/2026/access/"
    accessedAt: 2026-09-21
  - label: "rockin'star Carnival 2026｜注意事項"
    url: "https://rockinstarcarnival.jp/2026/notice/"
    accessedAt: 2026-09-21
  - label: "国営ひたち海浜公園｜アクセス"
    url: "https://www.hitachikaihin.jp/access/"
    accessedAt: 2026-09-21
relatedArticleUrls:
  - "/events/ibaraki-events-october-2026/"
  - "/events/ibaraki-autumn-odekake-2026/"
  - "/kouyou/"
  - "/area/hitachinaka/"
---
本文はfrontmatterの構造化フィールドへ移送済みです。
~~~

## 既存ページSEO改善

対象ファイル: `src/content/events/ibaraki-events-october-2026.md`

更新日は2026-09-20だが、開催12日前の大型イベントが欠落しているため、凍結ルールの「重大な開催情報の欠落」例外として最小差分で追記する。

### metadata変更

titleを次へ変更する。

`茨城のイベント2026年10月｜ロッキンスター音楽花火・ちくせい花火・コキア`

descriptionを次へ変更する。

`2026年10月の茨城県イベント。10月3日のrockin'star Carnival、17日のちくせい花火大会、国営ひたち海浜公園のコキア、いばらきフラワーパークのイルミネーションを公式情報からまとめます。`

### summary変更

既存summaryの先頭に次の内容を統合する。既存イベント情報は削除しない。

`2026年10月3日（土曜日）には国営ひたち海浜公園でrockin'star Carnival 2026が開催され、J-ROCK・J-POPと約20,000発の花火を組み合わせた音楽花火が18時から19時15分まで予定されています。`

### keyPoints追加

配列の先頭へ追加する。

`10月3日（土）rockin'star Carnival 2026｜国営ひたち海浜公園｜花火18:00〜19:15予定｜約20,000発｜入場券が必要`

### picks追加

配列の先頭へ追加する。

~~~yaml
  - name: "rockin'star Carnival 2026（10月3日）"
    area: "ひたちなか市"
    forWhom: "音楽と花火を一緒に楽しみたい人。県外から電車で参加したい人"
    detail: "国営ひたち海浜公園で、DJ和によるJ-ROCK・J-POPと約20,000発の花火を同期させる音楽花火です。開場11時、開演12時30分、花火は18時から19時15分予定。入場券が必要で、勝田駅から有料直行シャトルバスが運行されます。"
    url: "/events/rockinstar-carnival-2026/"
~~~

### FAQ追加

~~~yaml
  - question: "2026年10月3日に茨城で花火イベントはありますか。"
    answer: "国営ひたち海浜公園でrockin'star Carnival 2026が開催されます。音楽花火は18時から19時15分までの予定で、約20,000発。入場にはチケットが必要です。"
~~~

### sourceUrls追加

~~~yaml
  - label: "rockin'star Carnival 2026 公式サイト"
    url: "https://rockinstarcarnival.jp/"
    accessedAt: 2026-09-21
~~~

### relatedArticleUrls追加

`/events/rockinstar-carnival-2026/`

## SEO・AIO実装要件

- 新規記事のcanonicalは既存ルーティングから生成される `/events/rockinstar-carnival-2026/` を使用する
- Event、FAQPage、BreadcrumbListは既存イベントテンプレートからfrontmatterに基づいて生成する。独自の重複JSON-LDを追加しない
- title・description・summary・FAQの冒頭で、開催日、場所、花火時間、チケット必須へ即答する
- 公式チケット導線は `booking` から描画し、既存のクリック計測を壊さない
- 公式画像、ロゴ、出演者写真を転載しない。OG画像の新規生成・無断利用をしない
- 既存の10月まとめ記事から新規記事へ内部リンクを作る
- 既存イベントページやコキア情報を削除しない

## CTA

1. 公式開催概要
2. 公式チケット一般発売

順番は一次情報優先。アフィリエイトURLへ置換しない。

## analytics

既存の `BookingGuide.astro` と外部リンク計測をそのまま使う。新しいイベント名を独自に増やさず、既存実装で `outbound_booking_click` または相当イベントが発火することを確認する。発火しない場合は推測で新設せず、未計測として報告する。

## 変更禁止

- 既存URL、canonical、コンテンツスキーマを変更しない
- 既存イベント、コキア、ちくせい花火の記述を削除しない
- 公式画像、ロゴ、出演者写真を無断使用しない
- チケット販売URLを加工・短縮・アフィリエイト化しない
- 未確認の臨時列車、宿泊空室、混雑時間を追加しない
- 検索ボリュームを推測しない
- 指定外のTOP、デザイン、workflow、設定を変更しない

## 公開前確認

- [ ] 新規記事が指定frontmatter全文と一致する
- [ ] チケット料金、時刻、バス、駐車券を公式ページと照合
- [ ] 10月まとめ記事に新規記事への内部リンクがある
- [ ] Event/FAQ/Breadcrumbの構造化データが重複していない
- [ ] 公式画像・ロゴを使用していない
- [ ] モバイルで表・CTA・長文が崩れない
- [ ] `npm run editorial:sync` が成功
- [ ] `npm run editorial:check` が成功
- [ ] `npm run verify` がエラー・警告0件で成功

## 受入条件

- `/events/rockinstar-carnival-2026/` が生成される
- 10月まとめ記事のtitle・description・summary・keyPoints・picks・FAQ・sourceUrls・relatedArticleUrlsへ指定内容が反映される
- 新規記事がイベント台帳へ同期され、既存レコードが削除されない
- 料金、日時、交通、駐車場、雨天時対応が公式情報と一致する
- 指定外差分がない
- 全検証が成功する

## 検証

- 7日後KPI: GSCのページ登録、対象クエリの表示回数・クリック・CTR・平均順位、10月まとめからの内部遷移、公式チケットCTAクリックを確認。基準値がないため数値目標は設定せずベースライン取得とする。
- 28日後KPI: 開催後の検索実績、イベント終了表示、翌年版へ再利用できる情報構造、ひたちなか市・花火・コキア記事への回遊を確認する。
- 継続条件: 公式情報と一致し、検索表示・内部回遊・チケットクリックのいずれかが計測可能になる。
- 中止・差し戻し条件: 公式中止・延期、料金や運行の不一致、権利未確認画像、構造化データエラー、検証失敗。
