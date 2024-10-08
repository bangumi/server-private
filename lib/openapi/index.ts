export const Tag = {
  User: 'user',
  Wiki: 'wiki',
  Topic: 'topic',
  Group: 'group',
  Subject: 'subject',
  Episode: 'episode',
  Collection: 'collection',
} as const;

export const Security = {
  HTTPBearer: 'HTTPBearer',
  OptionalHTTPBearer: 'OptionalHTTPBearer',
  CookiesSession: 'CookiesSession',
} as const;
