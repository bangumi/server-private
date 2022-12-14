export const Tag = {
  User: 'user',
  Auth: 'auth',
  Topic: 'topic',
} as const;

export const Security = {
  HTTPBearer: 'HTTPBearer',
  OptionalHTTPBearer: 'OptionalHTTPBearer',
  CookiesSession: 'CookiesSession',
} as const;
