# 記事下の導線（Action architecture）

記事を読んだ人が「次にやること」を、読者の意図ごとに1か所ずつ受け持つ。
同じ役割の枠を重ねて置かない。新しい枠を足す前に、この表のどこに入るかを決める。

更新：2026-10-02（中規模改修 ④ の調査結果）

## 読者の意図と受け持つ部品

| 意図 | 読者の問い | 受け持つ部品 | 置き場所 | GA4（変更しない） |
|---|---|---|---|---|
| **discover**（次に読む） | ほかに行ける所・読むべき記事は？ | `GrowthNextReads`「このあと、どこ行く？」 | 結論／開催情報のすぐ後（記事の途中） | `growth_next_view` / `growth_next_click` |
| **visit**（行く・周辺） | どう行く？ 駐車場は？ 近くに何がある？ | 記事本文の開催情報・アクセス（`eventInfo` / `accessGuide`）、`ArticleNextSteps` の「近くなら、ここも」、イベント記事の「この街から、もう少し」の AREA | 本文／記事末 | `next_action_click`（`action_source`: `article_next` / `event_discovery_footer`） |
| **book**（宿泊・予約・確認） | どこで予約・確認する？ | `BookingGuide`「RESERVE & CHECK」（公式→予約サイトの順、広告は明示） | FAQ・情報源の前 | `booking_guide_view` / `outbound_booking_click` |
| **repeat**（再訪） | また来る理由・次の季節は？ | `ArticleNextSteps` の「同じ気分なら」（テーマページ）、イベント記事の「今のおでかけを探す」（/events/） | 記事末 | `next_action_click` |
| 関連（記事どうし） | 同じ話題のほかの記事は？ | ニュース記事の「関連情報」（同じ市町村・タグのニュース、編集部リンク） | 記事の最後 | `next_action_click`（`action_source`: `news_related`、2026-10-02 追加） |
| 広告・協賛 | — | `SponsorSlots`（協賛枠、広告表示あり） | `BookingGuide` の後 | `sponsor_view` / `sponsor_click` |
| 事業者向け | — | `BusinessCta` | 記事末に1つだけ | `business_cta_view` / `business_cta_click` |

`SponsorSlots` と `BusinessCta` は読者の行動ではなく収益・事業者向けの導線なので、上の4つの意図と混ぜない。

## いまの並び（2026-10-02）

**ニュース記事** `/news/<slug>/`
結論 → `GrowthNextReads` → 本文 → `BookingGuide`（ある記事だけ）→ `SponsorSlots` → FAQ → 情報源 → `ArticleNextSteps`（観戦／同じ気分なら／近くなら）→ `BusinessCta` → 関連情報（この街を知る／関連ニュース／編集部リンク）

**イベント記事** `/events/<slug>/`
開催情報・押さえておきたいこと → `GrowthNextReads` → 見どころ・候補・行く前に・FAQ → `BookingGuide` → `SponsorSlots` → 情報源 → `BusinessCta` → この街から、もう少し（AREA／編集部リンク／一覧へ）

## 調査で見つかったこと

1. **次に読むのカードが画像なし**：ニュースは常に、イベントも全件「IBATOCO」の面になっていた → 2026-10-02 に解消（`src/lib/card-image.ts`）
2. **エリア表記が slug**：次に読むで「oarai」のように出ていた → 市町村名に修正
3. **編集部リンクの文言が同じ**：イベント記事の「この街から、もう少し」で、3枚とも「編集部がつないだ次の候補」だった → 行き先の名前に修正
4. **関連情報のクリックが計測されていない**：ニュース記事の最後の枠だけ GA4 に何も送っていなかった → `next_action_click`（`action_source: news_related`）を追加。イベント名は増やしていない
5. **終わった催しが次に読む・関連に残る**：ニュース側に終了判定が無かった → `src/lib/lifecycle.ts` に一本化
6. **visit（周辺）が2か所に分かれている**：ニュースは「近くなら、ここも」（近い市町村）と関連情報の「◯◯を知る」（記事の市町村）、イベントは「この街から、もう少し」の AREA だけ。近い市町村はイベント記事に無い
7. **repeat（再訪）の専用の枠が無い**：テーマページ（同じ気分なら）が代わりをしている。「次の季節にまた」「保存・通知」は Phase 2（Discovery System の Deferred）

## 次にやること（観測してから）

6・7 の統合（周辺を1つの枠にまとめる、イベント記事にも「近くなら、ここも」を出す）は、高流入の記事の内部リンクを変えることになる。
ChatGPT 側の観測窓（同一ページの内部リンク変更は原則14日あける。docs/EDITORIAL_OS.md「実験観測窓」）と、11月重点記事のSEO評価を守るため、次の順で行う。

1. `growth_next_click` と `next_action_click`（`article_next` / `event_discovery_footer` / `news_related`）を2週間分ためる
2. 押されている枠・押されていない枠を確認し、押されていない枠から統合する
3. 統合するときも URL・title・H1・canonical・GA4イベント名は変えない

## 新しい枠を足すときの決まり

- 4つの意図のどれを受け持つかを、この表に先に書く。どれにも入らないなら足さない
- 既にある部品で受け持てるなら、その部品を直す（同じ役割の枠を2つ置かない）
- 終わった催しは `isWorthLinking(lifecycleOf(entry))` で外す（`src/lib/lifecycle.ts`）
- カードの画像は `listImageOf` / `listImageForPath`（`src/lib/card-image.ts`）を使い、自前で選ばない
- クリックは既存の `next_action_click` に `action_source` を足して計測する。新しいイベント名は作らない
