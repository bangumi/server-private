import platform from './_platform.json' assert { type: 'json' };

export interface Platform {
  id: number;
  type: string;
  type_cn: string;
  alias?: string;
  wiki_tpl?: string;
  search_string?: string;
  enable_header?: boolean;
}

export default platform as Record<number, Record<number, Platform>>;
