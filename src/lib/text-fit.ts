/**
 * 見出しを枠の幅に収める大きさを CSS で決めるための「文字幅の目安」（文字の大きさ1つ分を1とする）。
 *
 * スマホ（320〜360px）では、長い語（「#イバラキパスポート」「茨城アストロプラネッツ」）が
 * 大きな見出しの1行に入りきらず、「#」だけの行や最後の1文字だけの行ができていた（2026-10-04）。
 * 語の長さに合わせて、1行に収まる大きさまで下げる。PCでは通常の大きさが上限なので変わらない。
 *
 * 使い方：要素に style={`--fit-len:${fitLength(text)}`} を付け、親に container-type: inline-size を置いて
 *   font-size: clamp(下限, calc(100cqi / var(--fit-len, 1)), 通常の大きさ)
 * 和文は1、英数字・記号は0.62、空白は0.3。字間と余白のぶん0.4を足す。
 */
export function fitLength(text: string): string {
  const em = [...text].reduce((sum, ch) => sum + (ch === ' ' ? 0.3 : ch.charCodeAt(0) < 0x2000 ? 0.62 : 1.01), 0);
  return (em + 0.4).toFixed(2);
}
