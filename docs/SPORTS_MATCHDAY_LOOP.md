# チームページの試合更新ループ

`/sports/kashima-antlers/` と `/sports/mito-hollyhock/` を、毎試合ほぼ同じ手順で更新するための手順書。
「記事を1本書いて終わり」にしないため、試合データを記事本文から切り離して持つ。

## データの置き場所

| 置き場所 | 持つもの |
|---|---|
| `src/data/sports/matches/<team>.json` | 年間日程・結果・観戦ガイド・モデルコース・出典・確認日 |
| `src/data/sports-schedule.ts` | JSONの形式検査（崩れていればビルドが止まる） |
| `src/lib/sports.ts` | NEXT / LAST / RECENT FORM / UPCOMING の取り出し、SportsEvent 構造化データ |
| `src/content/news/*.md` の `sportsMatch` | 試合記事を書いたときだけ。記事URLが自動でチームページに出る |

チームページは次の順で組み上がる。データが無い枠は出ない。

1. NEXT MATCH（次の試合）… 最初の `scheduled` の試合（キックオフから3時間を過ぎて結果の無い試合は除く）
2. LAST MATCH（直近の試合）… 最後の `finished` の試合。`recap` と `community` を表示
3. RECENT FORM … 結果の入った直近5試合（大会名つき）
4. MATCH GUIDE … 次の試合の `guide`
5. IBARAKI MATCH DAY … 次の試合の `matchDay`（主にホームゲーム）
6. UPCOMING MATCHES … 次の試合より後の最大5試合
7. 記事・この街のニュース・ホームタウン（既存）

「最終更新」にはビルド日ではなく、JSONの `updatedAt`（公式情報を確認して更新した日）を出す。

## 更新ループ

毎朝まず次を実行し、出てきた不足だけを埋める。

```bash
npm run sports:status
```

| 段階 | やること | 触るフィールド |
|---|---|---|
| 7日前 | 日時・会場・大会・中継・チケットを公式で確認し、ガイドの骨組みを作る | `kickoff` `venue` `broadcast` `officialUrl` `guide.sections(match, ticket, access)` |
| 3日前 | イベント・グルメ・交通・駐車場を足す。ホームゲームはモデルコースを作る | `guide.sections(event, gourmet, parking, rules, cashless, tourism)` `matchDay` |
| 前日 | 交通・天候・販売状況を再確認 | `guide.verifiedAt` `guide.unverified` |
| 当日 | 最終案内。開場・当日券・運行を確認。当日にビルドすると上部の要点枠が「MATCH DAY TODAY」になる | `guide.verifiedAt` `guide.keyFacts` |
| 試合終了後 | クラブ公式の結果を確認してから切り替える。score を入れた時点で、その試合は LAST MATCH に、次の `scheduled` の試合が NEXT MATCH に上がる（当日の要点枠・観戦ガイドも次の試合のものに入れ替わる）。得点者など公式で確認できないことは書かない | `status: finished` `score` `pk` `recap` |
| 翌々日以降 | 次の試合が自動で NEXT MATCH に上がる。今後の試合が3件を切ったら日程を足す | `matches[]` |

どの段階でも、最後に `updatedAt` を今日にして次を通す。

```bash
npm run verify
git switch -c fact/<日付>-sports-<team>
git add src/data/sports/matches/<team>.json src/data/seo-changes.ts
git commit
git push -u origin fact/<日付>-sports-<team>

```

PRのCI（Validate site・CodeQL・観測窓ガード）が成功し、承認されたらmainへマージする。本番公開はGitHub Actionsの「Deploy production」が行う。手元から `npm run deploy` はしない（docs/SECURE_DEPLOYMENT_POLICY.md）。

静的サイトなので、試合日を過ぎても再ビルドするまで表示は変わらない。更新のたびに反映する。

終わった試合を NEXT MATCH に残さないため、キックオフ（日本時間）から3時間を目安に扱う（`src/lib/match-timing.js`）。

- ビルドした時点でキックオフから3時間を過ぎ、score が無い試合は NEXT MATCH・UPCOMING から外す。結果を入れるまで LAST MATCH にも出さない
- 当日の朝（定期ビルドは6:30）に作ったページでは、キックオフから3時間を過ぎるとブラウザ側で「キックオフから3時間を過ぎました」と一文だけ出す。結果は推測で書かない
- kickoff の無い試合はこの判定をしない（翌日のビルドで日付により外れる）
- 結果の入れ忘れは、翌朝の `npm run sports:status` が「結果待ち」として出す。別の自動タスクは作らない

## 書いてよいこと・書かないこと

- **公式の一次情報で確認できたことだけを書く。** 優先順位は クラブ公式 → Jリーグ公式 → 大会公式（AFC・JFA）→ 交通事業者 → 自治体・観光協会・施設。
- 各項目に `sourceUrl` を付ける。確認した日は `guide.verifiedAt`、出典一覧は `sources`。
- **確認できなかったことは書かず、`guide.unverified` に残す。** ページに「まだ確認できていないこと」として出る。
- 店・施設は、**試合日の曜日に営業していることを公式で確認できたときだけ**載せる。「営業しているだろう」で書かない。
- 会場名は試合ごとに公式の表記で持つ。AFCの大会では命名権の名前を使わない（例：ACLはカシマサッカースタジアム、J1・天皇杯はメルカリスタジアム）。
- 大会が違う試合を混ぜない。`kind`（league / cup / continental）と `competition`・`round` を必ず入れる。
- スコアは90分（延長を含む）の結果。PK戦は `pk` に分けて持つ（スコアは引き分けのまま）。
- `recap` は事実だけ。戦術評価や、公式から確認できない評価・推測は書かない。
- 日付が「土or日」のように未確定の試合は入れない。
- 順位は、公式で確認して載せる運用を決めるまで出さない。
- 公式ロゴ・選手写真・イベント画像は使わない。
- 冠試合・地域連携企画（`community`）は公式表記のまま。「実施した」と書けるのは開催後の公式発表を確認したときだけ。試合前の告知だけなら「告知していた」と書く。

## 過去に確認で引っかかったこと（2026年9月）

- ACLエリートはシーズンチケットの対象外（クラブ公式「天皇杯、AFC主催大会は対象外」）。
- メルカリスタジアムの「完全キャッシュレス化」の対象はJ1・ルヴァン杯・天皇杯。**ACLは「決定次第お知らせ」**で、同じスタジアムでも運用が同じとは限らない。
- 天皇杯の当日券販売所は現金のみ。
- 公式トップの「次の試合」はホームゲームだけを出していることがある。日程ページで確認する。
- クラブ公式や施設公式は JavaScript で描画されるページが多く、WebFetch は空のまま「記載なし」と返すことがある。空で返ったらブラウザで表示して読む。

## 構造化データ

`SportsEvent` は、キックオフ時刻と会場が確定している「これからの試合」だけに出す。
住所など確認していない値は入れない。終わった試合・未確定の試合には出さない。
