import { MeiliSearch } from 'meilisearch';

import config from '@app/lib/config.ts';

const client = new MeiliSearch({
  host: config.meilisearch.url,
  apiKey: config.meilisearch.key,
});

export default client;
