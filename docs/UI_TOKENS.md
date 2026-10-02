# UIトークンの棚卸し（breakpoint・余白・角丸・影・カード・CTA）

更新：2026-10-02（中規模改修 ⑥ の調査結果）。全面的なデザイン変更はしない。新しく書くCSSの基準と、直すときの手順を決める。

## いまあるトークン（src/styles/global.css の :root）

| 種類 | トークン | 備考 |
|---|---|---|
| 文字サイズ | `--step--2` 〜 `--step-5`（clamp） | 新しいCSSはこれを使う |
| 余白 | `--gutter`、`--discovery-gap` | ページ左右は `--gutter` |
| 幅 | `--maxw` 1240px、`--content-wide` 1200px、`--content-reading` 700px | |
| 角丸 | `--radius` 2px／`--radius-xs` 4px・`--radius-sm` 8px／`--discovery-radius-sm/md/lg` 12・16・20px／`--brand-radius-card` 22px・`--brand-radius-pill` 999px | **3系統が並存**（旧編集デザイン／Discovery v1／Brand v2） |
| 影 | `--shadow-sm/--shadow/--shadow-lg`／`--discovery-shadow(-hover)`／`--brand-shadow-card/-lift` | 同じく3系統 |
| 動き | `--ease`、`--dur` | reduced-motion は各部品で無効化 |

## 直書きの値（src 配下の .astro / .css）

**breakpoint（max-width）は25種類**。多い順：
900px（13）・560px（13）・760px（12）・640px（12）・720px（7）・520px（7）・480px（5）・960px（3）・800px（3）・700px（3）・680px（3）・360px（3）・1000px（3）・820/420/1180px（各2）ほか9種類が1か所ずつ。

**角丸**：`999px`（40）・`1rem`（20）・`.85rem`（14）・`.75rem`（6）・`.5rem`（5）ほか。トークンを使わない直書きが多い。

## 新しく書くCSSの基準

- **breakpoint は 4つだけ使う**：`560px`（スマホ）・`760px`（タブレット縦）・`900px`（タブレット横・小さいPC）・`1180px`（ワイド）。CSS変数は media query に使えないので、値をそのまま書き、コメントに用途を書く
- 角丸：カード・発見系の部品は `--discovery-radius-*`、ピル型は `--brand-radius-pill`。直書きしない
- 影：カードは `--discovery-shadow` と `--discovery-shadow-hover`
- 余白：セクションの左右は `--gutter`、カードの間は `--discovery-gap`
- カード：一覧・おすすめは既存の部品（`NewsCard`・`TocoCard`・`.bp-cards`）を使い、新しいカードの型を増やさない。画像は `src/lib/card-image.ts`
- CTA：タップ目標は高さ44px以上（`.ev-chips a` などの既存の書き方に合わせる）

## 既存のCSSをそろえるとき

今回は既存のCSSの値を一括では置き換えていない。25種類の breakpoint を4つに寄せると、そのあいだの幅で表示が変わるため（全面的なデザイン変更に当たる）。

部品を別の理由で触るときに、その部品の中だけを基準に寄せる：

1. 寄せる前後で `npm run test:ui`（390 / 768 / 1440px、CIでは `npm run verify` の中で自動）を通す
2. 値を変えた幅の前後（例：640px→560px なら 560〜640px）をブラウザで目視する
3. TOPの必須構成（AGENTS.md「現行TOPは固定版」）に関わる部品は、クリエイティブディレクターの確認を取ってから

## フォント（IBATOCO Mincho / IBATOCO Gothic）

- 自己ホスト。`scripts/build-web-fonts.py` が `src/assets/fonts/` の TTF から、使う文字ごとに分けた woff2（`public/fonts/`）と `src/styles/fonts.generated.css`（unicode-range つきの @font-face）を作る。`global.css` が読み込む
- core＝英数字・記号・かな＋サイトの多くのページに出る漢字1,000字（ビルド済みの全ページで数えた上位）。more＝原稿で使うそれ以外の字（多く出る順に300字ずつ）。rest＝フォントのそれ以外の字。ページは必要なファイルだけを読む（あんこう祭のページで 明朝 core 274KB＋more 70KB、ゴシック core 175KB＋more 46KB）。字が欠けることはない
- 字形・palt などのOpenType機能・ヒンティングはそのまま残している（2026-10-03、本番の全TTFと文字幅が一致することを確認）
- 作り直す：新しい漢字が増えて more・rest の読み込みが目立ってきたら `pip install fonttools brotli` → `npm run build`（字の頻度を dist/ で数えるため）→ `python3 scripts/build-web-fonts.py`。出力は同じ入力なら毎回同じ（ファイル名のハッシュが変わらない）
- OG画像の生成（astro-og-canvas）は `src/assets/fonts/` の TTF をそのまま使う。TTF は消さない
