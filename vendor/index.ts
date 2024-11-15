import { services } from './common-json/network_services.json';
import { platforms } from './common-json/subject_platforms.json';

export interface NetworkService {
  name: string;
  title: string;
  url?: string;
  bg_color: string;
  validate?: string;
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

export function findNetworkService(sid: number): NetworkService | undefined {
  const svcs = services as Record<string, NetworkService>;
  return svcs[sid];
}

export function findSubjectPlatform(tid: number, plat: number): SubjectPlatform | undefined {
  const plats = platforms as Record<string, Record<string, SubjectPlatform>>;
  return plats[tid]?.[plat];
}
