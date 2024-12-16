import type * as schema from './schema.ts';

export type IUser = typeof schema.chiiUsers.$inferSelect;
export type IUserFields = typeof schema.chiiUserFields.$inferSelect;
export type IUserNetworkServices = typeof schema.chiiUserNetworkServices.$inferSelect;

export type IFriend = typeof schema.chiiFriends.$inferSelect;

export type ISubject = typeof schema.chiiSubjects.$inferSelect;
export type ISubjectFields = typeof schema.chiiSubjectFields.$inferSelect;
export type ISubjectInterest = typeof schema.chiiSubjectInterests.$inferSelect;
export type ISubjectRelation = typeof schema.chiiSubjectRelations.$inferSelect;
export type ISubjectRelatedBlog = typeof schema.chiiSubjectRelatedBlogs.$inferSelect;
export type ISubjectTopic = typeof schema.chiiSubjectTopics.$inferSelect;
export type ISubjectPost = typeof schema.chiiSubjectPosts.$inferSelect;
export type ISubjectEpStatus = typeof schema.chiiEpStatus.$inferSelect;
export type ISubjectRec = typeof schema.chiiSubjectRec.$inferSelect;

export type IEpisode = typeof schema.chiiEpisodes.$inferSelect;

export type ICharacter = typeof schema.chiiCharacters.$inferSelect;
export type ICharacterSubject = typeof schema.chiiCharacterSubjects.$inferSelect;

export type IPerson = typeof schema.chiiPersons.$inferSelect;
export type IPersonSubject = typeof schema.chiiPersonSubjects.$inferSelect;

export type IPersonCollect = typeof schema.chiiPersonCollects.$inferSelect;
//export type IPersonRelation = typeof schema.chiiPersonRelations.$inferSelect;

export type IIndex = typeof schema.chiiIndexes.$inferSelect;
export type IIndexCollect = typeof schema.chiiIndexCollects.$inferSelect;

export type IBlogEntry = typeof schema.chiiBlogEntries.$inferSelect;
export type IBlogPhoto = typeof schema.chiiBlogPhotos.$inferSelect;

export type ITimeline = typeof schema.chiiTimeline.$inferSelect;
export type ITimelineComment = typeof schema.chiiTimelineComments.$inferSelect;
