import { Meilisearch } from 'meilisearch';

import config from '@app/lib/config.ts';

export const client = new Meilisearch({
  host: config.meilisearch.url,
  apiKey: config.meilisearch.key,
});

export interface SearchResult {
  ids: number[];
  total: number;
}
