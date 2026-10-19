import type { RegionKey } from './areas';

/** 44市町村のヘッダー図案の唯一の正本。
 * 写真ではない抽象モチーフ。市町村追加時は明示的に割り当てる。
 */
export type CityScene = 'gorge' | 'coast' | 'lake' | 'shrine' | 'canal' | 'flower' | 'mountain' | 'river' | 'field' | 'town';
export const CITY_SCENE_BY_SLUG: Record<string, CityScene> = {
  'takahagi': 'gorge',
  'kitaibaraki': 'gorge',
  'hitachiota': 'gorge',
  'daigo': 'gorge',
  'hitachi': 'coast',
  'oarai': 'coast',
  'kamisu': 'coast',
  'kasumigaura': 'lake',
  'tsuchiura': 'lake',
  'ami': 'lake',
  'miho': 'lake',
  'tone': 'lake',
  'shimotsuma': 'lake',
  'namegata': 'lake',
  'kasama': 'shrine',
  'kashima': 'shrine',
  'itako': 'canal',
  'mito': 'flower',
  'hitachinaka': 'flower',
  'ishioka': 'flower',
  'ushiku': 'flower',
  'sakuragawa': 'flower',
  'hitachiomiya': 'mountain',
  'shirosato': 'mountain',
  'tsukuba': 'mountain',
  'chikusei': 'mountain',
  'ryugasaki': 'river',
  'moriya': 'river',
  'toride': 'river',
  'joso': 'river',
  'bando': 'river',
  'goka': 'river',
  'sakai': 'river',
  'naka': 'field',
  'tokai': 'field',
  'ibaraki-machi': 'field',
  'omitama': 'field',
  'inashiki': 'field',
  'tsukubamirai': 'field',
  'kawachi': 'field',
  'hokota': 'field',
  'yachiyo': 'field',
  'yuki': 'town',
  'koga': 'town',
};
export interface CitySceneTone { deep: string; mid: string; light: string; warm: string }
export const REGION_SCENE_TONES: Record<RegionKey, CitySceneTone> = {

  kenpoku: { deep: '#225569', mid: '#528392', light: '#b8d6db', warm: '#c47f55' },
  keno: { deep: '#3b6675', mid: '#769aa3', light: '#d1e0d9', warm: '#d19a8e' },
  kennan: { deep: '#366b88', mid: '#7ca6b5', light: '#c7e1e8', warm: '#c6a48a' },
  rokko: { deep: '#23687e', mid: '#6aadb5', light: '#cae9e5', warm: '#c99c68' },
  kensei: { deep: '#567864', mid: '#8da595', light: '#d9e3d3', warm: '#c6a46b' },
};
