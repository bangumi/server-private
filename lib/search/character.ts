import { client, type SearchResult } from '@app/lib/search/client.ts';
import type * as req from '@app/lib/types/req.ts';

const index = client.index('characters');

interface SearchRequest {
  keyword: string;
  filter?: req.ICharacterSearchFilter;
  limit: number;
  offset: number;
}

function convertFilter(filter?: req.ICharacterSearchFilter): string[][] {
  const filters: string[][] = [];
  if (!filter) {
    return filters;
  }
  if (filter.nsfw !== undefined) {
    filters.push([`nsfw = ${filter.nsfw}`]);
  }
  return filters;
}

export async function search(request: SearchRequest): Promise<SearchResult> {
  const filter = convertFilter(request.filter);
  const results = await index.search(request.keyword, {
    filter,
    limit: request.limit,
    offset: request.offset,
  });
  return {
    ids: results.hits.map((hit) => hit.id as number),
    total: results.estimatedTotalHits,
  };
}
