import { services } from './common-json/network_services.json';
import { platforms } from './common-json/subject_platforms.json';
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
  sortKeys?: readonly string[];
}

export function findSubjectPlatform(
  subjectType: number,
  plat: number,
): SubjectPlatform | undefined {
  const plats = platforms as Record<string, Record<string, SubjectPlatform>>;
  return plats[subjectType]?.[plat];
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
