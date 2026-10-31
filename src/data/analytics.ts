/**
 * GA4計測の対象判定と、流入元の分類に使う設定値。
 * 判定そのものは src/layouts/BrandBase.astro のインラインスクリプトが、ここの値を受け取って行う。
 *
 * 設計方針：
 *  - **推測で分類しない。** referrer か utm_source で発信元が特定できたものだけを
 *    AI流入として数える。referrer が無い流入（Direct）と、GA4が source を
 *    決められなかった `(not set)` は AI に寄せない。
 *  - google.com / bing.com / duckduckgo.com は AI に含めない。
 *    AI Overviews や Bing のチャット結果からの流入は、通常の検索流入と
 *    同じ referrer で届くため、クライアント側で区別できないため。
 *  - 除外は「確実に自分だと分かる条件」だけで行う。IPやUser-Agentからの
 *    推測除外はしない（第三者を誤って除外するリスクがあるため）。
 */

/** 運営者自身のアクセスを除外するフラグの保存先（そのブラウザにのみ効く） */
export const GA_OPTOUT_KEY = 'ibatoco_ga_optout';

/** `?ga-optout=1` で除外を有効化、`?ga-optout=0` で解除 */
export const GA_OPTOUT_PARAM = 'ga-optout';

/**
 * AI流入と判定するホスト名。
 * キーは referrer / utm_source のホスト名（完全一致、またはサブドメイン一致）。
 * 値はGA4に送る識別子。
 */
export const AI_REFERRAL_HOSTS: Record<string, string> = {
  // OpenAI
  'chatgpt.com': 'chatgpt',
  'chat.openai.com': 'chatgpt',
  'openai.com': 'chatgpt',
  // Anthropic
  'claude.ai': 'claude',
  'claude.com': 'claude',
  // Perplexity
  'perplexity.ai': 'perplexity',
  // Google Gemini（検索の google.com とは別ホスト）
  'gemini.google.com': 'gemini',
  'bard.google.com': 'gemini',
  // Microsoft Copilot（検索の bing.com とは別ホスト）
  'copilot.microsoft.com': 'copilot',
  'm365.cloud.microsoft': 'copilot',
  // その他
  'you.com': 'you',
  'poe.com': 'poe',
  'felo.ai': 'felo',
  'genspark.ai': 'genspark',
  'phind.com': 'phind',
  'grok.com': 'grok',
  'chat.deepseek.com': 'deepseek',
  'chat.mistral.ai': 'mistral',
};
