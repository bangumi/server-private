export const PersonCat = Object.freeze({
  Character: 'crt',
  Person: 'prsn',
});

export type PersonCat = (typeof PersonCat)[keyof typeof PersonCat];
