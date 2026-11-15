# GA4/GSC 日次同期（Read-only GA4 and GSC via Google API）

最終確認：2026-10-28。ワークフローは `.github/workflows/google-analytics-daily.yml`、計測の設計は [GA4_MEASUREMENT.md](GA4_MEASUREMENT.md)・[GROWTH_ENGINE.md](GROWTH_ENGINE.md)。

## 仕組み

1. **fetch ジョブ**（毎日 05:30 JST・main）：Workload Identity で Google の公式 API を読む（鍵なし・読み取り専用）。GA4 の日別 Views・Sessions・engagedSessions・Organic Views と、GSC の日別クリック・表示回数・順位を取る。範囲は**確定日（今日の3日前）までの35日**（直近28日＋前7日の窓を API の結果だけで埋められる）。検査（preflight）を通ったものだけを artifact に置く
2. **sync ジョブ**（Google の認証情報なし）：artifact を検査し直し、`data/editorial/performance-snapshot.json` に合わせる → `npm run verify` → 同期 PR を出す
3. 同期 PR をオーナー（または承認を受けた担当）がマージ → Validate site → Deploy production

## 2026-10-25・26 の失敗の原因（確定）

- 失敗したステップ：sync ジョブの「Propose verified snapshot through protected PR」
- ログ：`pull request create failed: GraphQL: GitHub Actions is not permitted to create or approve pull requests (createPullRequest)`
- 原因：リポジトリ設定（Settings → Actions → General → Workflow permissions）の **「Allow GitHub Actions to create and approve pull requests」がオフ**。API でも `can_approve_pull_request_reviews: false`・`default_workflow_permissions: read` を確認した（2026-10-27）
- 取得（fetch）・検査・`npm run verify` は成功していた。**データは失われていない**：ブランチ `bot/google-analytics-daily-<run>` に残っており、Google 側にもある。次に成功した同期が35日分を取り直す
- 影響：スナップショットは 2026-10-21 のまま。06:30 の定期デプロイが「当日の確定指標が無い」で止まっていた（Deploy の切り離しは別の PR）

## この PR で直したこと

| 問題 | 対策 |
|---|---|
| 毎回 `bot/google-analytics-daily-<run>` を作るので、PR が作れる設定にすると**毎日 PR が増える** | 固定ブランチ `bot/google-analytics-daily` を毎回「最新の main＋当日のスナップショット」の1コミットに作り直す。開いている同期 PR があれば**それを更新**し、新しく作らない |
| PR を作れない設定だと、ジョブが毎日失敗する | 失敗にせず、**警告と Job Summary に「PR を開くリンク」**を出す。データはブランチに保存される。必須チェック（Validate site・CodeQL）はブランチで起動するので、PR を開いたときに結果が揃っている |
| 取得が32日分で、窓（35日）の一部を前回のスナップショットに頼っていた | 35日分を取る（`src/lib/ga4-daily.mjs` の `googleDailyRange`）。何日失敗していても、API の結果だけで窓を作り直せる |

変えていないこと：未取得の日を 0 にしない（取得・preflight・sync の3段で、空の応答・欠けた日・0 埋めの疑いを拒否する）。過去より古いデータで上書きしない（確定日が戻る更新は拒否）。Google の認証は fetch ジョブだけ・読み取りスコープだけ。

## 過去データの扱い

- スナップショットに持つのは直近35日（`GA4_DAILY_MAX_DAYS`）。それより前の日別値は、**Git の履歴**（マージされたスナップショット）と **Google 側**に残る
- 同期が止まっても、Google 側の値は消えない。再開した同期が35日分を取り直す。35日を超えて止まった期間も Google 側には残るので、必要なら手動で取り出せる（このワークフローは35日より前を書き込まない）
- 計測障害の期間は `data/editorial/measurement-incidents.json` に記録し、その日の値を本当の減少として扱わない

## 「Actions に PR の作成と承認を許す」設定のリスク

この設定をオンにすると、**このリポジトリのどのワークフローでも**、`GITHUB_TOKEN` に `pull-requests: write` を与えたジョブが PR を作り、**PR を承認（Approve）できる**ようになる。

| 観点 | いまのイバトコ |
|---|---|
| どのジョブが使えるか | 既定の権限は読み取り（`default_workflow_permissions: read`）。`pull-requests: write` を持つのは GA4/GSC 同期の sync ジョブだけ |
| 承認の悪用 | main の必須承認は0人なので、承認は今は関門になっていない。**将来「承認1人以上」を必須にするなら**、Actions が人の PR を承認して関門をすり抜けられるので、この設定はオフに戻すか、承認の条件（最後に push した人以外）を足す |
| フォークからの PR | フォークの PR のトークンは読み取り専用のまま（この設定で変わらない） |
| マージ | Actions の承認だけではマージされない。必須チェック（build・Analyze）とオーナーのマージは変わらない |
| 依存の乗っ取り | sync ジョブは Google の認証情報を持たず、`npm ci` と `npm run verify` を実行する。悪意ある依存が PR を作る可能性はある（作るだけ。マージはされない） |

## 選択肢の比較と推奨

| 案 | 権限 | 運用 | 推奨 |
|---|---|---|---|
| **B. 設定はオフのまま**（この PR のフォールバック） | 増やさない | 同期は毎日ブランチを更新。PR が無いときは、担当（ChatGPT かオーナー）が Job Summary のリンクから PR を1回開く。開いた後は毎日その PR が更新される（マージした翌日にまた1回開く） | **最小権限として推奨**。手作業はマージの頻度と同じ |
| A. 設定をオンにする | リポジトリ全体で、Actions に PR の作成・承認を許す | 完全に自動。毎日1本の PR が更新される | 自動化を優先するなら可。上のリスク表の条件（既定は読み取り・承認を関門に使わない）を守る |
| C. GitHub App／fine-grained token を Secret に置く | このリポジトリの PR 書き込みだけ。リポジトリ設定は変えない | 認証情報が1つ増え、更新・失効の管理が要る | 長期の認証情報を増やさない方針（SECURE_DEPLOYMENT_POLICY）と合わないので非推奨 |
| D. スナップショットを PR で回さない（artifact 等から直接読む） | — | ビルドとデータの関係を作り直す大改修 | 非推奨（今回の範囲を超える） |

## 設定を変えた後（または B で運用する）ときの確認手順

1. Actions → 「Read-only GA4 and GSC via Google API」→ Run workflow（main）
2. fetch ジョブ：`Google API preflight passed. GA4 dates=35, GSC dates=35` が出ること（35 未満なら Google 側の欠けを確認。0 で埋めない）
3. sync ジョブ：`Verified Google official daily metrics synced through <日付>` が出ること
4. 「Propose verified snapshot」：
   - A：`同期 PR を作成しました` か `既存の同期 PR #<番号> を更新しました`
   - B：警告「同期 PR を自動作成できません」と Job Summary のリンク → リンクから PR を開く
5. ブランチ `bot/google-analytics-daily` で Validate site と CodeQL が成功すること（PR の必須チェック）
6. **翌日もう一度実行され、PR が増えずに同じ PR が更新されること**（重複防止の確認）
7. PR をマージ → Deploy production 成功 → `/control/` と日次レポートの基準日が更新されること
8. 古いブランチ `bot/google-analytics-daily-40139261083`・`-40241362496`・`-40423209048` は役目を終えている。削除はオーナー承認後

## 同期 PR（#445）を運用して分かったこと（2026-10-28）

- **CI の「承認待ち（action_required）」**：ボットの push で PR の `pull_request` の CI は承認待ちになる（GitHub の仕様。[DEVELOPMENT_PLAYBOOK.md](DEVELOPMENT_PLAYBOOK.md) 末尾の注）。その間、PR は BLOCKED と表示され、ブランチで起動した Validate site・CodeQL の成功が PR の必須チェックに反映されない。マージの前に、オーナーが PR の「Approve workflows to run」を押して CI を走らせる
- **同期ブランチはデータ専用**：05:30 の同期は `bot/google-analytics-daily` を「最新の main ＋ 当日のスナップショット」に強制 push する。コードや文書の修正は同期 PR に足さず、main からの別の PR にする
- **人の修正を消さない検査**：強制 push の前に `scripts/sync-branch-guard.mjs` がブランチを調べ、スナップショット以外で main と中身が違うファイルがあれば、上書きせずに失敗する（Job Summary に理由）。同期 PR をマージするか、修正を別の PR へ移してから再実行する。squash でマージ済みの修正や、main を取り込んだマージコミットでは止まらない
- **確定日は4か所**：`windows.<ga4|gsc>.dailyMeta.confirmedThrough`・`source.freshness`・`source`・最上位の `ga4LatestConfirmedDate`/`gscLatestConfirmedDate`。最上位だけ更新されず 10/19・10/18 のまま残った不具合を直し、食い違いは `npm run verify`（`ga4-daily --check`）と同期の両方で止める
- **「スナップショットが○日前」の警告**：確定日は今日の3日前なので、`editorial:check` は3日より古いときだけ警告する（以前は2日で、同期が成功していても毎日出ていた）
- **使う Action は SHA で固定**：このワークフローだけタグ指定（`@v4`・`@v2`）のままだったので、#392 と同じくコミット SHA に固定した（版は変えていない）
- **人気ページの警告**：確定日が正しくなったことで、`editorial:check` が「人気ページ（popular-pages.json）が GA4 の確定日より古い」と警告するようになった。人気ページは Growth Director の日次の手更新で、自動では書き換えない

## ChatGPT の日次運用（Windsor.ai）との関係

スナップショットは ChatGPT の日次運用でも更新されることがある（`source.primary` が Windsor.ai の日）。同じ日に両方が `windows.ga4`・`windows.gsc` を書くと PR が競合する。この同期が動き出したら、日別の GA4/GSC は**この同期を正**とし、ChatGPT は Windsor でしか取れない項目（上位ページ・検索語・送客イベントのページ別など）だけを更新する。

## 数字が止まったとき（2026-11-10、Issue #545 の復旧手順）

2026-10-29〜11-09 に main のスナップショットが `asOf: 2026-10-28` で止まった。取得は毎日成功していて、**同期 PR が開かれていなかった**のが原因だった（Windsor.ai とフォールバックの Google Sheet は、この経路に関係しない）。秘密値はどの手順でも表示・変更しない。

1. **検知**：`npm run verify`（CI の Validate site）が `GA4/GSC の鮮度（P0）` の警告を出す。手元では `node scripts/analytics-freshness.mjs`。判定は `src/lib/analytics-freshness.mjs`
   - 同期が毎日成功していても確定日は「今日の3日前」。遅れは、そこからの日数で数える
   - GA4 は3日（72時間）以上、GSC は4日（96時間）以上の遅れで警告。確定日が読めないときは「未取得」とし、前回の値を最新扱いしない
   - 警告は記事の公開を止めない（終了コード0）。止めたい場面では `--strict`
2. **切り分け**（上から順に）
   - Actions →「Read-only GA4 and GSC via Google API」の直近の実行が成功しているか
   - 成功している → ブランチ `bot/google-analytics-daily` の最新コミットの日付を見る。新しければ、**PR が開いていないだけ**。`bot/google-analytics-daily` → `main` の PR を開く（1回開けば、以後は毎日その PR が更新される。マージした翌日にまた1回開く）
   - fetch ジョブが失敗 → ログの preflight の行を読む。認証（Workload Identity）や Google 側の権限に見える失敗は、設定を変えずにオーナーへ報告する
   - sync ジョブが失敗 → `npm run verify` のどの検査で落ちたかを読む（スナップショット以外の原因で落ちることがある）
3. **復旧後の確認**：PR の `data/editorial/performance-snapshot.json` だけが変わっていること、確定日が GA4・GSC とも進んでいること、0埋めが無いこと。マージ後、翌日の実行でブランチが更新されること
4. **35日を超えて止まった場合**：ワークフローは直近35日しか書かない。それより前は Google 側に残っているので、必要ならオーナーの判断で手動で取り出す（推測で埋めない）

恒久対応の選択肢は上の「選択肢の比較と推奨」のとおり（PR を人が開く運用 B か、Actions に PR 作成を許す設定 A）。どちらにするかはオーナーが決める。

## 2026-11-13：安全な日次自動マージ（設定が揃った場合のみ）

- 05:30 JST：Google公式APIの確定値を取得し、欠測・巻き戻り・不自然な0埋めを検査
- 同期専用ブランチを最新mainから再作成し、既存PRを更新（無ければ新規作成を試行）
- プロポーザルの差分が `data/editorial/performance-snapshot.json` **1ファイルのみ**か、PRのheadが同期実行コミットと一致するかを確認
- Validate site / CodeQLを起動し、GitHubの保護ルールを維持したまま `gh pr merge --auto --squash` を要求。必須チェックを満たすまでmainへは入らない
- PRを作れない、auto-mergeが無効、ボットPRのCIが承認待ちの場合は**ワークフローを失敗**させ、Job SummaryとActions上で分かるようにする。制限を迂回しない
- mainマージ後、`Validate site` のmain push成功を条件に `Deploy production` が起動する。公開確認は `/build.json` のSHA一致による

### オーナーによる1回限りの設定（自動反映に必須）

1. GitHubの `Settings → Actions → General` で **Allow GitHub Actions to create and approve pull requests** を有効にする。これはリポジトリ全体の権限なので、変更リスクを了承した場合のみ行う
2. `Settings → General → Pull Requests` の **Allow auto-merge** を有効にする
3. PRで **Approve workflows to run** が出た場合は一度承認する（GitHubが毎回要求する設定であれば無人運用にはできない）
4. `Actions → Read-only GA4 and GSC via Google API` をmainから手動起動し、PRの差分1ファイル・必須チェック成功・マージ・Deploy production・本番SHA一致を確認
5. 翌日以降、完了日が進まないときはActionsを赤色で検知する。GA4・GSCの確定日遅延そのものは正常（通常数日）

**注意**：この変更だけで現状のGitHub設定を自動変更したことにはならない。また、PRの自動マージが許可されても、CIの承認待ち（action_required）が解除される保証はない。最終的な無人反映は本番で連続実行を確認してから「復旧」と判定する。

## 2026-11-13：ページ別・検索語別も毎日取る（監査 A1）

監査（`docs/audit-20261113/SEO_INDEPENDENT_AUDIT.md` の A1）で、日次同期がサイト全体の日別しか取っておらず、`pageMetrics`・`gscQueries`・`ga4TopPages` が11月より前の古いデータのまま（期間も未記録）だと分かった。記事の優先順位と効果測定を、同じ日の確定値でできるようにする。

- 取得（`scripts/google-api-daily.mjs`）：既存と同じトークン・読み取りだけで、GSC の `page×query` と `page`（直近28日・前28日・直近7日・前7日の4窓）と、GA4 の `pagePath` 別 Views（直近7日・前7日・直近28日）を足した。出力に `pageLevel` が加わる。workflow は変えていない
- 計算（`src/lib/gsc-page-level.mjs`、テスト `scripts/gsc-page-level.test.mjs`）：既存の行の形のまま作る。GSC は表示0の行を返さないので、窓の応答が上限未満なら「行が無い＝0」、上限に達した窓では null（不明）。GA4 が取れなかったときの Views は null
- 検査（preflight と sync の両方）：期間が確定日で終わること、0行で上書きしないこと、検索語×ページの28日クリック合計がサイト全体を超えないこと
- 反映（`scripts/google-analytics-sync.mjs`）：取れた日だけ置き換え、`source.pageLevel.periods` に期間を記録する。取れなかった日はサイト全体の日別だけを同期し、前の値と期間を残す（ページ別の失敗で日次同期は止めない）
- 鮮度：`node scripts/analytics-freshness.mjs` がページ別の期間も報告する（警告だけで、`--strict` でも止めない）。`/control/` の「集計期間未記録」は期間が記録されていれば期間の表示に変わる
- 未確認：本物の API 応答ではまだ動かしていない（手元にトークンが無い）。最初の日次実行のログ「page-level N query rows」と、同期 PR の `source.pageLevel` で確認する
- 直した既存の不具合：`source.warnings` に同じ2文が毎日追加されて重複していた。同じ文は置き換えるようにした

## 2026-11-14：GSC の確定が遅れた日の扱い

11月14日の日次同期は、fetch で `GSC: latest date 2026-11-10 != confirmedThrough 2026-11-11` となり止まった。Search Console の確定データ（`dataState: 'final'`）が、予定の確定日（今日−3日）にまだ届いていなかったため。ページ別の取得（A1）は成功していた（`page-level 3000 query rows / 200 pages`）。

- 対応：`scripts/google-api-daily.mjs` は、GSC の最新の確定日が予定より1〜2日遅れているときは、その日まで確定日を下げて同期する（GA4 の日別もその日までで切る。ページ別・A/B の期間も同じ確定日で取る）。`::warning title=確定日を…に調整` を出す
- 3日以上遅れたときは従来どおり止める（`alignConfirmedThrough`、テストは `scripts/gsc-page-level.test.mjs`）
- 確定日が前回と同じ日になることはあるが、前回より前には戻さない（sync の regression 検査はそのまま）
- 0 や推計で埋めない原則は変えていない

## 2026-11-15：GA4 の確定が遅れた日も同じく調整する

11月15日の日次同期は `GA4: latest date 2026-11-11 != confirmedThrough 2026-11-12` で止まった（GSC は 11-12 まであった。ページ別の取得は成功）。#592 は GSC の遅れだけを見ていたため、GA4 と GSC の**両方にある日付**の最新日まで確定日を下げるよう直した。遅れの上限（2日）と、0 や推計で埋めない原則は同じ。

## 2026-11-15：同期PR（bot/google-analytics-daily）がマージできないときの取り込み手順

ボット（github-actions）が作る同期PRは、必須チェック（build・Analyze）が実行・成功していても `2 of 2 required status checks are expected` でマージできないことがある（11/15 の #605）。ワークフローや main のルールセットは変えずに、次の手順で取り込む（11/15 は #607 で実施）。

1. 同期PRの変更が `data/editorial/performance-snapshot.json` だけであることを確認する
2. main から作業ブランチを作り、`git checkout origin/bot/google-analytics-daily -- data/editorial/performance-snapshot.json`
3. `node scripts/ga4-daily.mjs --check` と `node scripts/analytics-freshness.mjs` で照合・鮮度を確かめる（ページ別は `PAGE_LEVEL_FRESHNESS_OK` が出ること）
4. PR を作り、CI 成功後にマージ。元の同期PRは理由をコメントしてクローズ（オーナー了承済みの運用）

根本対応（ボットPRに必須チェックが紐づくようにする）は、ワークフローかルールセットの変更が必要なため、オーナーの個別承認事項として保留。

## 2026-11-15：送客先別の送客クリックも毎日取る（Issue #612）

サイト全体とページ別は 11/12 まで更新されていたが、`conversionDetail.byProviderPage`（送客先別）は Windsor.ai の手取得（2026-09-27〜10-03）のまま、`byPage` は 10/13〜10/19 のままだった。Windsor.ai は現在のプランでは読めない。協賛候補を選ぶ材料なので、日次同期と同じ経路で取り直す。

- 取得（`scripts/google-api-daily.mjs`）：既存と同じトークン・読み取りスコープだけ。workflow・認証・Secret・Variable は変えていない。GA4 Data API へ足したのは次の4回
  1. メタデータ（`properties/<id>/metadata`）で、`customEvent:link_url`・`customEvent:link_provider` が登録済みかを確かめる。**無ければ取得しない**（新しいカスタムディメンションは登録しない）。`customEvent:partner_status` は登録されていれば使う
  2. `eventName` 別の件数（`booking_guide_view`・`outbound_booking_click`・`paid_booking_click`。直近28日・直近7日）。内訳との照合に使う
  3. `eventName × pagePath × link_url × link_provider`（同じ2つの期間）
  4. `eventName × pagePath`（直近7日。既存の `byPage` の形）
- 計算（`src/lib/booking-referrals.mjs`、テスト `scripts/booking-referrals.test.mjs`）：既存の行の形（`path`・`link_url`・`link_provider`・`partner_status`・`event_count`・`classification`）を保ち、`event_count7`（直近7日）と `paid_count`（提携リンクの内数）を足した。`event_count` は直近28日
  - 区分：`paid_booking_click` が出た行と ASP のホストは `paid`、`link_provider` が `official`／`*-official` は `official`、それ以外は `non-partner-candidate`。`active-unmapped` は `partner_status` が登録されているときだけ判定できる
  - `link_url` が `(not set)` の件数は行にせず、`byProviderPageTotals.unattributed` に残す（送り先を推測しない）
- 検査（preflight と sync の両方）：期間が確定日で終わること、送客先別・ページ別の合計がサイト全体の件数を超えないこと、`paid_booking_click` が `outbound_booking_click` を超えないこと、送客クリックがあるのに内訳が空なら上書きしないこと
- 反映（`scripts/google-analytics-sync.mjs`）：取れた日だけ `byProviderPage`・`byProviderPagePeriod`（28日）・`byProviderPagePeriod7`・`byProviderPageSource`・`byProviderPageCheckedAt`・`byProviderPageTotals`・`byPage`・`byPagePeriod`（7日）・`byPageSource`・`byPageCheckedAt` を置き換える。取れなかった日は前の値と期間を残す（送客先別の失敗で日次同期は止めない）
- 鮮度：`node scripts/analytics-freshness.mjs` が送客先別の期間も報告する（警告だけ。`--strict` でも止めない）
- 変えていないこと：`conversionDetail.recent7`・`previous7`・`recent28`（イベント別の件数。10月の手取得のまま）は、この変更の対象外。計測（送るイベント・パラメータ）も変えていない
- **未確認**：本物の API 応答ではまだ動かしていない（手元にトークンが無い）。API を模した応答で、取得 → preflight → sync → レポートの流れだけを確かめた。最初の日次実行のログ「booking referrals N destination rows」と、同期 PR の `conversionDetail.byProviderPagePeriod` で確認する。`link_url` はカスタムディメンションの登録日（2026-09-27）以降の分しか付かない

### 2026-11-15 レビュー反映：内訳データの品質と比較ルール

- `outbound_booking_click` の直近28日・7日合計がどちらか一方でも欠けている（`null`）場合、真の0件と未取得を区別できないため**送客先別データは更新しない**。実測0件を推測で補完しない。
- GA4の`rowCount`に加え、`metadata.dataLossFromOtherRow`、`metadata.subjectToThresholding`、`metadata.samplingMetadatas`、`dataTruncationReasons`を検査し、欠落・サンプリング等があれば送客データを更新しない。既存のスナップショットを保持してログに警告を出す。営業用の完全な件数と誤認させない。
- `conversionDetail.byProviderPage[*].event_count`は**直近28日**（旧7日と意味が変更）。互換性を保つため同値の`event_count28`も付与し、直近7日は`event_count7`。レポートには`byProviderPagePeriod`（28日）を表示する。変更前後を同条件の時系列として比較しない。
- `conversionDetail.byPage`の`booking_guide_view`、`outbound_booking_click`、`monetized_booking_click`は**直近7日**。28日送客先クリックとページ別7日クリックを同じ母数とみなさない。
- `partner_status`は本番APIメタデータに登録がある場合のみ使用し、`byProviderPageTotals.partnerStatusAvailable`に結果を記録する。未登録の場合に提携先との契約関係を推測しない。
- `src/pages/control/index.astro`と`scripts/partner-opportunity.mjs`は集計期間を明示する。期間の異なるPV/予約送客/広告クリックを混同しない。
- **実APIへの接続はGitHub Actionsの既存Workload Identityによる次の日次fetchで実施**。本番実測に成功し、対象期間の同期PRに反映されたことを確認するまでは完了と判定しない。

## 2026-11-15：人気記事データのGA4公式同期（Issue #619）

`data/editorial/popular-pages.json` はTOPの `HomeNow` と記事末尾 `GrowthNextReads` の推薦基準。従来の手動更新は2026-10-19で停止し、TOPの14日鮮度ガードで「よく読まれている記事」が非表示になった。

- 同期後に `node scripts/popular-pages-sync.mjs --write` を実行。追加API・追加トークン・有料契約は不要。確定済み `performance-snapshot.json` 内の `ga4TopPages.recent7`（同一期間の `pageMetrics` を補助）から `screenPageViews` を使用。
- `source.pageLevel.ga4TopPagesUpdated === true`、`source.pageLevel.periods.recent7` と `windows.ga4.recent7` と `asOf` が一致、GA4ページ集計が切り詰められていない、直近7日35日分の集計が所定どおり完結、確定日が日本時間の当日から5日以内、の全条件を満たす場合のみ再生成。
- `src/content/events`・`src/content/news` のfrontmatterを参照し、非公開・noindex・未レビュー・中止済み・終了済みイベントを除外。終了日当日の単発イベントも翌日に古くなるため除外。日付の無い季節ガイドは最終更新が45日以内のものだけ候補に含める。
- 上位8件のパスと Views、実測期間・確定日を記録し、表示時も既存の `HomeNow`・`GrowthNextReads` の lifecycle 判定を維持。期間違いの数値を混在させない。
- データ取得欠落・期間不一致・GA4レポートの切り詰め・上位行の矛盾などの場合は**元の人気記事ファイル・その期間を保持**する。勝手にゼロで埋めず警告をログへ出す。公式日次のGA4/GSC全体同期は継続できる。
- `google-analytics-daily.yml` の同期PRに追加してよいファイルは `performance-snapshot.json` と `popular-pages.json` の**2つだけ**。それ以外のファイルが入ったPRは自動マージを拒否し、CIとブランチの上書き防止を従来どおり要求する。
- テスト：`scripts/popular-pages-sync.test.mjs` を `npm run verify` に追加。期間・未取得・不一致・終了判定をテストする。
- この同期運用のワークフロー変更はオーナーの**個別承認事項**。PRの必須CI成功を確認し、認証・Secrets・GA4の計測イベント・公開URL・デザインを変えないことを確認するまでマージしない。
