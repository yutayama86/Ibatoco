# Ibatoco Unified Growth OS

最終更新: 2026-10-06

## 目的

イバトコの運営を、以下の3層で一本化する。

1. **このChatGPTスレッド = 司令塔**
   - オーナー判断、優先順位変更、新規アイデア、例外判断を受ける。
   - ここで確定した重要判断は、必要に応じてGitHubの正本へ反映する。
2. **/control/ = 可視化・判断画面**
   - GA4/GSC/収益/イベント/実装キューから、勝ち筋・改善点・重点ページ・次の一手を表示する。
   - 数字の閲覧ではなく「何をするか」を決める画面とする。
3. **毎朝7時の統合Growth OS = 自動実行**
   - Control CenterとGitHub正本を読み、最も期待値が高い施策を選ぶ。
   - 自動実行可能なら branch → implementation → PR → CI → merge → production verify まで完遂する。

## 唯一の運用正本

判断時は以下を優先順で使う。

1. オーナーの最新確定判断
2. この文書
3. `docs/prompts/IBATOCO_DAILY_GROWTH_DIRECTOR.md`
4. `docs/EDITORIAL_OS.md`
5. `docs/REVENUE_OS.md`
6. `docs/IBATOCO_MASTER_STRATEGY.md`
7. `data/editorial/action-queue.json`
8. `data/editorial/performance-snapshot.json`
9. その他の自動生成レポート

矛盾時は新しいオーナー判断を優先し、古いルールを復活させない。

## North Star

短期:
- 2026年11月 月間GA4 Views 100,000
- 低品質量産ではなく、検索需要・回遊・高意図導線を伸ばす。

事業:
- 確定売上
- Revenue / 1,000 Views
- B2B問い合わせ
- 継続収益比率
- Founder dependence低下
- 再利用可能な地域データ資産

PVだけを増やして収益・資産性・信頼性を壊す施策は禁止。

## Control Centerと実行キューの関係

Control Centerの表示は3種類に分ける。

- **判断**: 勝ち筋、改善点、リスク、着地予測
- **候補**: 重点ページ、SEO機会、収益機会
- **実行状態**: `data/editorial/action-queue.json` の ready / in-progress / done

Control CenterのP1/P2は、そのまま自動実装を意味しない。
毎朝7時OSが、実測・観測窓・一次情報・工数・リスクを再評価し、実行可能なものを action queue の ready / in-progress に落としてから実装する。

## 毎朝7時の終了条件

以下をすべて満たして初めて「完了」。

1. GA4/GSC/収益/台帳/Control Center判断を更新・確認
2. 今日の最重要ボトルネックを1つ決定
3. action queueの状態を整合
4. 自動実行可能なら実装
5. PR作成
6. CI成功
7. merge
8. Cloudflare本番デプロイ成功
9. production verify
10. 検証窓を登録
11. オーナー向け報告

途中で止まった場合は「未完了」とする。

## 自動実行してよいもの

- 一次情報で確定した事実更新
- 内部リンク・関連記事・回遊改善
- metadataの小規模改善
- 高表示低CTRページの小規模スニペット改善
- 終了イベントの表示・推薦除外
- 計測欠落・明白な技術不具合
- 承認済みアフィリエイトURLの既存ルール内マッピング
- Control Center / Operator OS / CIの低〜中リスク改善
- 既存URLを維持するコンテンツ更新
- 実測に基づくpopular-pages/action queue更新

## オーナー承認が必要

- 新規有料SaaS/API/従量課金
- ASP申請・契約・広告出稿・スポンサー契約
- 価格変更
- URL変更・削除・統合・リダイレクト
- 大規模IA/全面デザイン変更
- 個人情報の新規取得
- GA4/GSC ID変更
- 権利・許諾
- 法的判断
- 一次情報で確定できない事実の公開

## 優先順位

通常は以下の順。

1. 誤情報・計測・本番障害
2. 11月大型検索需要
3. 既にGSC露出がある8〜20位/高表示低CTRページ
4. 勝ちページからの回遊
5. 高意図ページの予約/送客/収益導線
6. B2B自然問い合わせ導線
7. Discovery/DB/Owned Audience
8. 新規ニュース・新機能

ニュース本数はKPIにしない。

## 実験観測窓

- 事実/計測不具合: 即時
- CTA/小UI: 7日
- metadata/internal links: 原則14日
- 本文/template/IA: 原則28日
- 季節案件: 開催期限を優先

母数不足で失敗判定しない。同じURLを短期間に重ねて改修しない。

## 追加費用ゼロ

新規有料ツール・API・SaaS・広告は、オーナーの明示承認なしに導入しない。

## このスレッドの扱い

このChatGPTスレッドをイバトコの**オーナー司令塔**として扱う。
ユーザーがここで「優先順位を変える」「停止する」「新しい方針にする」と明言した場合、既存の自動化より新しい判断を優先する。

重要な恒久変更は、この文書または対応する正本データへ反映し、会話だけに依存させない。
