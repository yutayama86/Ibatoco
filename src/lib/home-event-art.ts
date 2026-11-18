import { listImageForPath } from './card-image';
import type { HappeningKind } from './happenings';

const illustrations: Record<string, string> = {
  '/events/ibaraki-flowerpark-illumination-2026/': '/images/v42/nightgarden.webp',
  '/events/kamine-park-autumn-festival-2-2026/': '/images/v42/autumn-maple-print.webp',
  '/events/kasama-kiku-matsuri-2026/': '/images/v42/chrysanthemums.webp',
  '/events/oarai-ankou-matsuri-2026/': '/images/v42/hotpot.webp',
};

export interface HomeEventArt {
  src: string;
  caption?: string;
  contain?: boolean;
}

export async function homeEventArt(href: string, kind?: HappeningKind): Promise<HomeEventArt> {
  const illustration = kind === 'sports' ? '/images/v42/matchday-supporters.webp' : illustrations[href];
  if (illustration) {
    return {
      src: illustration,
      caption: 'イメージイラスト',
      contain: kind === 'sports' || illustration.endsWith('-print.webp'),
    };
  }
  const image = await listImageForPath(href);
  return image
    ? { src: image.src, caption: image.source === 'card' ? 'エリア地図' : undefined, contain: image.source !== 'card' }
    : { src: '/images/v42/ibarakiscape.webp', caption: 'イメージイラスト' };
}
