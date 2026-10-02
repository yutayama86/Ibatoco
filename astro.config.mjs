// @ts-check
import { defineConfig } from 'astro/config';
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

// 本番の独自ドメイン
export const SITE = 'https://ibatoco.jp';

/**
 * ビルドした版の目印（/build.json）。本番確認 scripts/verify-production.mjs --wait が、
 * デプロイした版が配信され始めたかを見分けるのに使う。中身はコミットIDだけ。
 * @returns {import('astro').AstroIntegration}
 */
function buildMarker() {
  return {
    name: 'ibatoco-build-marker',
    hooks: {
      'astro:build:done': ({ dir }) => {
        let commit = 'unknown';
        try {
          commit = execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
        } catch {
          // git の無い環境ではコミットIDを書けない。本番確認は資産名の一致で代わりに待つ
        }
        writeFileSync(new URL('build.json', dir), `${JSON.stringify({ commit })}\n`);
      },
    },
  };
}

// https://astro.build/config
export default defineConfig({
  site: SITE,
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },
  build: {
    inlineStylesheets: 'auto',
  },
  compressHTML: true,
  integrations: [buildMarker()],
});
