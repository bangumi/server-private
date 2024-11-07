export const Tag = {
  Character: 'character',
  Collection: 'collection',
  Episode: 'episode',
  Group: 'group',
  Person: 'person',
  Subject: 'subject',
  Topic: 'topic',
  User: 'user',
  Wiki: 'wiki',
} as const;

export const Security = {
  HTTPBearer: 'HTTPBearer',
  OptionalHTTPBearer: 'OptionalHTTPBearer',
  CookiesSession: 'CookiesSession',
} as const;
