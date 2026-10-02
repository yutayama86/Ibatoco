/**
 * SVGのパス文字列に含まれる数値を、小数点以下 digits 桁に丸める。
 *
 * 地図データ（src/data/ibaraki-geo.ts）は座標を小数点以下13〜14桁で持っていて、
 * TOPのHTML（約336KB）のうち地図のSVGだけで約229KBあった。
 * 小数点以下3桁（0.001）に丸めると、表示範囲 519×660 に対する誤差は1ピクセルの1000分の1以下。
 * 2026-10-03 に本番の地図と描き比べ、実寸で境界線のふちの17ピクセル（全体の0.005%）がにじみの程度だけ違い、
 * それ以上の差は無いことを確認した（2桁だと114ピクセル・4ピクセルで大きめの差が出たため3桁にした）。
 *
 * データ本体は書き換えない。OG画像・一覧カード画像の生成（scripts/build-og-backdrop.mjs）が
 * 同じデータを使っていて、書き換えると全画像が作り直しになるため。ページに出すときだけ丸める。
 */
export function compactPath(d: string, digits = 3): string {
  return d.replace(/-?\d+\.\d+/g, (n) => {
    const rounded = Number(n).toFixed(digits).replace(/\.?0+$/, '');
    return rounded === '-0' ? '0' : rounded;
  });
}
