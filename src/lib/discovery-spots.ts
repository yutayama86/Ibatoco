import { MUNICIPALITY_CONTENT } from '../data/municipality-content';
import { MUNI_BY_SLUG, REGIONS } from '../data/areas';
import { SPOTS, type Spot } from '../data/spots';

export interface DiscoverySpot {
  id: string;
  slug: string;
  title: string;
  summary: string;
  href: string;
  municipality: string;
  municipalityName: string;
  regionLabel: string;
  kind: Spot['kind'];
  officialUrl?: string;
  sourceUrl: string;
  verifiedAt: string;
  address?: string;
  tags: string[];
  searchText: string;
}

function descriptionFor(spot: Spot): string {
  const candidates = [
    spot.municipality,
    ...(spot.alsoIn ?? []),
    ...(spot.mentionedIn ?? []),
  ];
  for (const slug of candidates) {
    const entry = MUNICIPALITY_CONTENT[slug];
    const found = entry?.spots?.find((item) => item.name === spot.name || item.name === spot.aka);
    if (found?.desc) return found.desc;
  }
  return spot.note ?? `${MUNI_BY_SLUG.get(spot.municipality)?.name ?? '茨城県'}にある${spot.name}。`;
}

export function getDiscoverySpots(): DiscoverySpot[] {
  return SPOTS.map((spot) => {
    const municipality = MUNI_BY_SLUG.get(spot.municipality);
    const region = municipality ? REGIONS[municipality.region] : undefined;
    const summary = descriptionFor(spot);
    const tags = [
      municipality?.name,
      region?.label,
      spot.kind === 'facility' ? '施設' : spot.kind === 'nature' ? '自然' : 'エリア',
      spot.aka,
    ].filter((value): value is string => Boolean(value));

    return {
      id: `spot:${spot.slug}`,
      slug: spot.slug,
      title: spot.name,
      summary,
      href: `/spot/${spot.slug}/`,
      municipality: spot.municipality,
      municipalityName: municipality?.name ?? '',
      regionLabel: region?.label ?? '',
      kind: spot.kind,
      officialUrl: spot.officialUrl,
      sourceUrl: spot.sourceUrl,
      verifiedAt: spot.verifiedAt,
      address: spot.address,
      tags,
      searchText: [
        spot.name,
        spot.aka,
        summary,
        municipality?.name,
        region?.label,
        spot.kind,
        spot.address,
      ].filter(Boolean).join(' ').toLowerCase(),
    };
  });
}

export function getDiscoverySpot(slug: string): DiscoverySpot | undefined {
  return getDiscoverySpots().find((spot) => spot.slug === slug);
}
