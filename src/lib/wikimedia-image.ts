/**
 * Wikimedia Commons の写真を、画面の幅に合った大きさで読み込むための src / srcset。
 *
 * Commons のサムネイルは決まった幅（500・960・1280・1920 など）で配信されている。
 * スマホに 1280px を、/yama/ では原本（2816px・2.3MB）をそのまま読ませていたため、
 * 幅ごとの候補を srcset で渡し、ブラウザに選ばせる（見た目は同じ写真）。
 * 原本のURL（/commons/x/xy/File.jpg）もサムネイルの形に直す。JPEG 以外はそのまま返す。
 */
const THUMB = /^https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/thumb\/([0-9a-f]\/[0-9a-f]{2})\/([^/]+\.jpe?g)\/\d+px-\2$/i;
const ORIGINAL = /^https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/([0-9a-f]\/[0-9a-f]{2})\/([^/?#]+\.jpe?g)$/i;

/** 標準のサムネイル幅（小さい順）。これ以外の幅は Commons 側で生成されないことがある */
export const HERO_WIDTHS = [960, 1280];

export function wikimediaImage(src: string, widths: number[] = HERO_WIDTHS): { src: string; srcset?: string } {
  const m = src.match(THUMB) ?? src.match(ORIGINAL);
  if (!m) return { src };
  const [, dir, file] = m;
  const url = (w: number) => `https://upload.wikimedia.org/wikipedia/commons/thumb/${dir}/${file}/${w}px-${file}`;
  return {
    src: url(widths[widths.length - 1]),
    srcset: widths.map((w) => `${url(w)} ${w}w`).join(', '),
  };
}
