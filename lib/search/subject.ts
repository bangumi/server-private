import { client, type SearchResult } from '@app/lib/search/client.ts';
import type * as req from '@app/lib/types/req.ts';

const index = client.index('subjects');

interface SearchRequest {
  keyword: string;
  sort?: string;
  filter?: req.ISubjectSearchFilter;
  limit: number;
  offset: number;
}

function convertFilter(filter?: req.ISubjectSearchFilter): string[][] {
  const filters: string[][] = [];
  if (!filter) {
    return filters;
  }
  if (filter.date) {
    filters.push(...parseDateFilter(filter.date));
  }
  if (filter.type && filter.type.length > 0) {
    filters.push(filter.type.map((type) => `type = ${type}`));
  }
  if (filter.nsfw === false) {
    filters.push([`nsfw = false`]);
  }
  if (filter.metaTags && filter.metaTags.length > 0) {
    filters.push(...filter.metaTags.map((tag) => [`meta_tag = ${tag}`]));
  }
  if (filter.tags && filter.tags.length > 0) {
    filters.push(...filter.tags.map((tag) => [`tag = ${tag}`]));
  }
  if (filter.rank) {
    filters.push([`rank ${filter.rank}`]);
  }
  if (filter.rating) {
    filters.push(...filter.rating.map((rating) => [`score ${rating}`]));
  }
  return filters;
}

function parseDateFilter(filters: string[]): string[][] {
  const result: string[][] = [];
  const regex = /^(>=|<=|<|>|=)(\d{4}-\d{2}-\d{2})$/;
  for (const value of filters) {
    const match = regex.exec(value);
    if (!match) {
      continue;
    }
    const [_, operator, date] = match;
    result.push([`date ${operator} ${date}`]);
  }
  return result;
}

function convertSort(sort?: string): string[] {
  switch (sort) {
    case 'match': {
      return [];
    }
    case 'score': {
      return ['score:desc'];
    }
    case 'heat': {
      return ['heat:desc'];
    }
    case 'rank': {
      return ['rank:asc'];
    }
    default: {
      return [];
    }
  }
}

export async function search(request: SearchRequest): Promise<SearchResult> {
  const filter = convertFilter(request.filter);
  const sort = convertSort(request.sort);

  const results = await index.search(request.keyword, {
    sort,
    filter,
    limit: request.limit,
    offset: request.offset,
  });
  return {
    ids: results.hits.map((hit) => hit.id as number),
    total: results.estimatedTotalHits,
  };
}
