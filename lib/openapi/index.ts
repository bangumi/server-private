export const Tag = {
  User: 'user',
  Auth: 'auth',
  Wiki: 'wiki',
  Topic: 'topic',
  Group: 'group',
} as const;

export const Security = {
  HTTPBearer: 'HTTPBearer',
  OptionalHTTPBearer: 'OptionalHTTPBearer',
  CookiesSession: 'CookiesSession',
} as const;
