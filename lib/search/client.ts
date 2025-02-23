import { MeiliSearch } from 'meilisearch';

import config from '@app/lib/config.ts';

export const client = new MeiliSearch({
  host: config.meilisearch.url,
  apiKey: config.meilisearch.key,
});

export interface SearchResult {
  ids: number[];
  total: number;
}
