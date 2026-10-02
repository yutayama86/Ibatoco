/**
 * 原稿（frontmatter の文字列）に書かれた **強調** を扱う。
 *
 * ニュース原稿は要点・結論などで **…** を使って強調を書いている。テンプレートが文字列をそのまま出していたため、
 * 読者には「**」が記号のまま見えていた（2026-10-03、9記事・7種類の欄）。
 * - emphasize：画面用。HTMLとして危ない文字はエスケープし、**…** だけを <strong> にする（set:html で使う）
 * - plain：構造化データ・メタ情報用。強調の記号だけを外す
 */
const BOLD = /\*\*([^*\n]+?)\*\*/g;

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

export function emphasize(text?: string | null): string {
  if (!text) return '';
  return escapeHtml(text).replace(BOLD, '<strong>$1</strong>');
}

export function plain(text?: string | null): string {
  if (!text) return '';
  return text.replace(BOLD, '$1');
}
