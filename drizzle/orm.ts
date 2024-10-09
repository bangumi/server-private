import type * as schema from './schema.ts';

export type ISubject = typeof schema.chiiSubjects.$inferSelect;
export type ISubjectFields = typeof schema.chiiSubjectFields.$inferSelect;
export type ISubjectInterests = typeof schema.chiiSubjectInterests.$inferSelect;

export type ICharacter = typeof schema.chiiCharacters.$inferSelect;

export type IPerson = typeof schema.chiiPersons.$inferSelect;

export type IPersonCollect = typeof schema.chiiPersonCollects.$inferSelect;
