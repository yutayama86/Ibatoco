#!/usr/bin/env node
/**
 * 楽天アフィリエイトの「URLからリンク作成」と同じ形式のテキストリンクを生成する。
 *
 * 根拠：楽天アフィリエイトの管理画面で作った既存リンク（src/data/affiliates.ts の楽天トラベル3本）は、
 *   https://hb.afl.rakuten.co.jp/hgc/<アフィリエイトID>/?pc=<元URLをエンコード>&link_type=text&ut=<固定値>
 * の形で、元URL以外は共通。scripts/rakuten-link.test.mjs で既存3本と完全一致を確認している。
 *
 * 使い方：npm run affiliate:rakuten -- <楽天のページURL> [...]
 * - 楽天のドメイン（*.rakuten.co.jp）以外は拒否する
 * - 生成したリンクは affiliates.ts の affiliateLinks に「元URL: 生成リンク」で登録する
 * - 初めての楽天サービス（例：楽天ふるさと納税）は、管理画面で1本作ったリンクと照合してから使う
 */
export const RAKUTEN_AFFILIATE_ID = '579937d6.d51864df.579937d7.bf4673dd';
const UT_TEXT_URL = 'eyJwYWdlIjoidXJsIiwidHlwZSI6InRleHQiLCJjb2wiOjF9'; // {"page":"url","type":"text","col":1}

export function rakutenTextLink(pageUrl, affiliateId = RAKUTEN_AFFILIATE_ID) {
  const url = new URL(pageUrl);
  if (url.protocol !== 'https:' || !/(^|\.)rakuten\.co\.jp$/.test(url.hostname)) {
    throw new Error(`楽天のページではありません: ${pageUrl}`);
  }
  return `https://hb.afl.rakuten.co.jp/hgc/${affiliateId}/?pc=${encodeURIComponent(url.href)}&link_type=text&ut=${UT_TEXT_URL}`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const urls = process.argv.slice(2);
  if (!urls.length) { console.error('使い方: npm run affiliate:rakuten -- <楽天のページURL>'); process.exit(1); }
  for (const u of urls) console.log(`'${u}':\n  '${rakutenTextLink(u)}',`);
}
