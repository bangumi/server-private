import type * as schema from './schema.ts';

export type IUser = typeof schema.chiiUser.$inferSelect;
export type IUserFields = typeof schema.chiiUserFields.$inferSelect;

export type ISubject = typeof schema.chiiSubjects.$inferSelect;
export type ISubjectFields = typeof schema.chiiSubjectFields.$inferSelect;
export type ISubjectInterests = typeof schema.chiiSubjectInterests.$inferSelect;

export type ICharacter = typeof schema.chiiCharacters.$inferSelect;
export type IPerson = typeof schema.chiiPersons.$inferSelect;
export type IPersonCollect = typeof schema.chiiPersonCollects.$inferSelect;

export type IIndex = typeof schema.chiiIndex.$inferSelect;
export type IndexCollect = typeof schema.chiiIndexCollects.$inferSelect;
