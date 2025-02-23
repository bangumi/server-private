import { client, type SearchResult } from '@app/lib/search/client.ts';
import type * as req from '@app/lib/types/req.ts';

const index = client.index('persons');

interface SearchRequest {
  keyword: string;
  filter?: req.IPersonSearchFilter;
  limit: number;
  offset: number;
}

function convertFilter(filter?: req.IPersonSearchFilter): string[][] {
  const filters: string[][] = [];
  if (!filter) {
    return filters;
  }
  if (filter.career) {
    filters.push(...filter.career.map((career) => [`career = ${career}`]));
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
