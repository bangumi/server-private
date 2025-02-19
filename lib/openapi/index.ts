export const Tag = {
  Misc: 'misc',

  Auth: 'auth',
  Blog: 'blog',
  Calendar: 'calendar',
  Character: 'character',
  Collection: 'collection',
  Episode: 'episode',
  Friend: 'friend',
  Group: 'group',
  Person: 'person',
  Search: 'search',
  Subject: 'subject',
  Topic: 'topic',
  Timeline: 'timeline',
  Trending: 'trending',
  User: 'user',
  Wiki: 'wiki',
} as const;

export const Security = {
  HTTPBearer: 'HTTPBearer',
  OptionalHTTPBearer: 'OptionalHTTPBearer',
  CookiesSession: 'CookiesSession',
} as const;
