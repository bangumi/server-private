export type IndexType = (typeof IndexType)[keyof typeof IndexType];
export const IndexType = Object.freeze({
  User: 0,
  Public: 1,
  Award: 2,
});

export type IndexRelatedCategory = (typeof IndexRelatedCategory)[keyof typeof IndexRelatedCategory];
export const IndexRelatedCategory = Object.freeze({
  Subject: 0,
  Character: 1,
  Person: 2,
  Ep: 3,
  Blog: 4,
  GroupTopic: 5,
  SubjectTopic: 6,
});
