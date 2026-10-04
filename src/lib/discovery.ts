import { getCollection, type CollectionEntry } from 'astro:content';
import { MUNI_BY_SLUG, REGIONS } from '../data/areas';
import { lifecycleOf, type EventLifecycle } from './lifecycle';

export type DiscoveryEntity = {
  id: string;
  href: string;
  title: string;
  summary: string;
  kind: 'event' | 'guide';
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
    .filter(Boolean)
    .map((region) => REGIONS[region!]?.label)
    .filter((name): name is string => Boolean(name)))];

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
  return events
    .map(toDiscovery)
    .filter((item) => item.lifecycle !== 'ended')
    .sort((a, b) => {
      const aEvent = a.kind === 'event' ? 0 : 1;
      const bEvent = b.kind === 'event' ? 0 : 1;
      if (aEvent !== bEvent) return aEvent - bEvent;
      return (a.startDate ?? '9999-99-99').localeCompare(b.startDate ?? '9999-99-99');
    });
}
