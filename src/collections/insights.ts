import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

/**
 * 発注者向けの記事（/biz/insights/）。仕様 docs/editorial/specs/20261124-biz-insights.md。
 * - イバトコ自身の運営の実データだけで書く。受託の取引実績・顧客の話は書かない
 * - 数字は「いつの・何の」実測かを本文に書く（measuredAt・sources）
 * - 因果を断定しない
 */
export const insights = defineCollection({
  loader: glob({ pattern: '**/[!_]*.md', base: './src/content/insights' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    /** 冒頭の結論（1〜2文） */
    conclusion: z.string(),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
    /** 本文の数字を測った日（この日までの実測） */
    measuredAt: z.coerce.date(),
    /** 狙う検索語（検索数は未確認の推測） */
    targetQueries: z.array(z.string()).default([]),
    sourceUrls: z.array(z.object({ label: z.string(), url: z.url().optional() })).default([]),
    draft: z.boolean().default(false),
    reviewed: z.boolean().default(false),
  }).superRefine((data, ctx) => {
    if (!data.draft && !data.reviewed) {
      ctx.addIssue({ code: 'custom', path: ['reviewed'], message: '公開には事実確認（reviewed: true）が必要です。' });
    }
  }),
});
