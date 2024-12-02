import { services } from './common-json/network_services.json';
import * as platforms from './common-json/subject_platforms.json';
import { relations } from './common-json/subject_relations.json';
import { staffs } from './common-json/subject_staffs.json';

export interface NetworkService {
  name: string;
  title: string;
  url?: string;
  bg_color: string;
  validate?: string;
}

export function findNetworkService(serviceID: number): NetworkService | undefined {
  const svcs = services as Record<string, NetworkService>;
  return svcs[serviceID];
}

export interface SubjectPlatform {
  id: number;
  type: string;
  type_cn: string;
  alias?: string;
  order?: number;
  wiki_tpl?: string;
  search_string?: string;
  enable_header?: boolean;
  sort_keys?: readonly string[];
}

export interface SubjectPlatformDefault {
  sort_keys: readonly string[];
  wiki_tpl: string;
}

export function findSubjectPlatform(
  subjectType: number,
  plat: number,
): SubjectPlatform | undefined {
  const plats = platforms.platforms as Record<string, Record<string, SubjectPlatform>>;
  return plats[subjectType]?.[plat];
}

export function getSubjectPlatforms(subjectType: number): SubjectPlatform[] {
  const plats = platforms.platforms as Record<string, Record<string, SubjectPlatform>>;
  return Object.values(plats[subjectType] ?? {}).sort((a, b) => a.id - b.id);
}

export function getSubjectPlatformSortKeys(subjectType: number, plat: number): readonly string[] {
  const platform = findSubjectPlatform(subjectType, plat);
  const defaults = platforms.defaults as Record<string, SubjectPlatformDefault>;
  const keys = platform?.sort_keys ?? defaults[subjectType]?.sort_keys;
  return keys ?? Object.freeze(['放送开始', '发行日期', '开始']);
}

export interface SubjectRelationType {
  en: string;
  cn: string;
  jp: string;
  desc: string;
}

export function findSubjectRelationType(
  subjectType: number,
  relationType: number,
): SubjectRelationType | undefined {
  const types = relations as Record<string, Record<string, SubjectRelationType>>;
  return types[subjectType]?.[relationType];
}

export interface SubjectStaffPosition {
  en: string;
  cn: string;
  jp: string;
}

export function findSubjectStaffPosition(
  subjectType: number,
  position: number,
): SubjectStaffPosition | undefined {
  const positions = staffs as Record<string, Record<string, SubjectStaffPosition>>;
  return positions[subjectType]?.[position];
}
