import { getCollection, type CollectionEntry } from 'astro:content';
import { MUNI_BY_SLUG, REGIONS } from '../data/areas';
import { lifecycleOf, type EventLifecycle } from './lifecycle';
import { getDiscoverySpots } from './discovery-spots';

export type DiscoveryEntity = {
  id: string;
  href: string;
  title: string;
  summary: string;
  kind: 'event' | 'guide' | 'spot';
  lifecycle: EventLifecycle;
  municipalities: string[];
  municipalityNames: string[];
  regionLabels: string[];
  tags: string[];
  searchText: string;
  startDate?: string;
  endDate?: string;
  commercialPriority?: 'low' | 'medium' | 'high';
};

function isoDay(value?: Date): string | undefined {
  return value ? value.toISOString().slice(0, 10) : undefined;
}

function toDiscovery(entry: CollectionEntry<'events'>): DiscoveryEntity {
  const municipalities = entry.data.municipalities ?? [];
  const municipalityNames = municipalities
    .map((slug) => MUNI_BY_SLUG.get(slug)?.name)
    .filter((name): name is string => Boolean(name));
  const regionLabels = [...new Set(municipalities
    .map((slug) => MUNI_BY_SLUG.get(slug)?.region)
    .filter((region): region is NonNullable<typeof region> => Boolean(region))
    .map((region) => REGIONS[region].label))];

  const lifecycle = lifecycleOf(entry);
  const tags = [...new Set([
    ...entry.data.tags,
    ...municipalityNames,
    ...regionLabels,
    entry.data.articleType,
    entry.data.searchIntent,
  ].filter(Boolean))];

  return {
    id: entry.id,
    href: `/events/${entry.id.split('/').pop()}/`,
    title: entry.data.title,
    summary: entry.data.summary,
    kind: entry.data.articleType === 'event' ? 'event' : 'guide',
    lifecycle,
    municipalities,
    municipalityNames,
    regionLabels,
    tags,
    searchText: [
      entry.data.title,
      entry.data.description,
      entry.data.summary,
      entry.data.keyword,
      entry.data.searchIntent,
      ...tags,
    ].join(' ').toLowerCase(),
    startDate: isoDay(entry.data.eventInfo?.startDate),
    endDate: isoDay(entry.data.eventInfo?.endDate ?? entry.data.eventInfo?.startDate),
    commercialPriority: entry.data.commercialPriority,
  };
}

export async function getDiscoveryEntities(): Promise<DiscoveryEntity[]> {
  const events = await getCollection('events', ({ data }) => !data.draft && data.reviewed && !data.noindex);
  const eventEntities = events
    .map(toDiscovery)
    .filter((item) => item.lifecycle !== 'ended');

  const spotEntities: DiscoveryEntity[] = getDiscoverySpots().map((spot) => ({
    id: spot.id,
    href: spot.href,
    title: spot.title,
    summary: spot.summary,
    kind: 'spot',
    lifecycle: 'evergreen',
    municipalities: [spot.municipality],
    municipalityNames: [spot.municipalityName],
    regionLabels: [spot.regionLabel],
    tags: spot.tags,
    searchText: spot.searchText,
  }));

  return [...eventEntities, ...spotEntities].sort((a, b) => {
    const priority = (item: DiscoveryEntity) => item.kind === 'event' ? 0 : item.kind === 'guide' ? 1 : 2;
    const diff = priority(a) - priority(b);
    if (diff !== 0) return diff;
    return (a.startDate ?? '9999-99-99').localeCompare(b.startDate ?? '9999-99-99') || a.title.localeCompare(b.title, 'ja');
  });
}
