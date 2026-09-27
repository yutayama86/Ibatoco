/**
 * 協賛枠（PR）の登録簿。運用の正本は docs/SPONSORSHIP.md。
 *
 * ## なぜデータ1行で済むようにしたか
 * 協賛枠は「少ない工数で売る」商品。1件ごとにページを手で直すと、
 * 掲載・終了・報告のたびに工数がかかり、消し忘れも起きる。
 * ここに1件足せば、指定ページに表示され、期間が終われば消え、
 * 表示とクリックが GA4 に sponsor_id 付きで記録される。
 *
 * ## 守ること（PR・広告の方針 /about/pr-policy/）
 * - 枠は必ず「PR」と文言で示す（SponsorSlots.astro が表示する。消さない）
 * - 協賛の有無で、記事の事実・評価・並び順を変えない
 * - 紹介文は事実だけ。「No.1」「必ず」「最安」など根拠のない断定を書かない
 * - 画像は事業者から利用の許諾を得たものだけ
 */

export interface SponsorSlot {
  /** 集計の主キー（GA4 の sponsor_id）。英小文字・数字・ハイフン。掲載後に変えない */
  id: string;
  /** 事業者名（表示用） */
  name: string;
  /** 掲載するページ。サイト内のパス（/ で始まり / で終わる） */
  pages: string[];
  /** 紹介文。120字以内。事実だけを書く */
  text: string;
  /** 事業者のサイト（https://） */
  url: string;
  /** リンクの文言。例「公式サイトを見る」「空室を確認する」 */
  cta: string;
  /** 掲載期間。日本時間の暦日（YYYY-MM-DD）。開始日と終了日を含む */
  start: string;
  end: string;
  /** 画像（任意）。public/images/sponsors/ に置く */
  image?: { src: string; alt: string; width: number; height: number };
}

/** 1ページに同時に出す協賛枠の上限。読者の体験を守るため、増やさない */
export const MAX_SLOTS_PER_PAGE = 3;

/** 紹介文の上限（文字数） */
export const SPONSOR_TEXT_MAX = 120;

/**
 * 掲載中・掲載予定の協賛枠。
 * 契約が決まったらここに1件足す。終了したものは消さずに残してよい
 * （終了日を過ぎると表示されない。集計のIDを残すため）。
 */
export const SPONSOR_SLOTS: SponsorSlot[] = [];

/**
 * 登録の誤りをビルドで止める。広告は誤表示の影響が大きい
 * （期限切れの掲載、PRと分からない文言、別の事業者への誘導）ため、
 * 警告ではなくエラーにする。
 */
function validateSponsorSlots(slots: SponsorSlot[]): void {
  const errors: string[] = [];
  const ids = new Set<string>();
  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  for (const slot of slots) {
    const at = `協賛枠 ${slot.id || '(id未設定)'}`;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slot.id)) errors.push(`${at}: id は英小文字・数字・ハイフンで書く`);
    if (ids.has(slot.id)) errors.push(`${at}: id が重複している`);
    ids.add(slot.id);
    if (!slot.name.trim()) errors.push(`${at}: 事業者名が空`);
    if (!slot.cta.trim()) errors.push(`${at}: リンクの文言が空`);
    if ([...slot.text].length > SPONSOR_TEXT_MAX) errors.push(`${at}: 紹介文が${SPONSOR_TEXT_MAX}字を超えている`);
    if (!slot.url.startsWith('https://')) errors.push(`${at}: url は https:// で始める`);
    if (slot.pages.length === 0) errors.push(`${at}: 掲載ページが空`);
    for (const page of slot.pages) {
      if (!/^\/.+\/$/.test(page)) errors.push(`${at}: 掲載ページ ${page} は / で始めて / で終える`);
    }
    if (!dateRe.test(slot.start) || !dateRe.test(slot.end)) errors.push(`${at}: 期間は YYYY-MM-DD で書く`);
    else if (slot.start > slot.end) errors.push(`${at}: 開始日が終了日より後`);
  }
  // 同じページ・同じ期間に上限を超えて重ならないか
  for (const slot of slots) {
    for (const page of slot.pages) {
      const overlapping = slots.filter((other) => other.pages.includes(page) && other.start <= slot.end && slot.start <= other.end);
      if (overlapping.length > MAX_SLOTS_PER_PAGE) {
        errors.push(`協賛枠 ${slot.id}: ${page} で同じ期間に${overlapping.length}枠が重なる（上限${MAX_SLOTS_PER_PAGE}）`);
      }
    }
  }
  if (errors.length > 0) throw new Error(`協賛枠の登録に誤りがあります（src/data/sponsors.ts）\n- ${[...new Set(errors)].join('\n- ')}`);
}

validateSponsorSlots(SPONSOR_SLOTS);

/**
 * そのページに載せる協賛枠。
 * ビルド時点で終了しているものは出さない。開始前のものは出力し、
 * 開始日になったら画面側（SponsorSlots.astro）で表示する。
 * 本番は push でしか再ビルドされないため、期間の判定は画面側でも行う。
 *
 * @param path  ページのパス（/events/…/）
 * @param today 日本時間の今日（YYYY-MM-DD）
 */
export function sponsorsForPage(path: string, today: string): SponsorSlot[] {
  return SPONSOR_SLOTS.filter((slot) => slot.pages.includes(path) && slot.end >= today).slice(0, MAX_SLOTS_PER_PAGE);
}
