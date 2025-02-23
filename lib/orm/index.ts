import { DataSource } from 'typeorm';

import config, { production, stage } from '@app/lib/config.ts';
import { UnexpectedNotFoundError } from '@app/lib/error.ts';
import { logger } from '@app/lib/logger.ts';

import {
  App,
  Cast,
  Character,
  CharacterSubjects,
  Episode,
  EpisodeComment,
  EpRevision,
  Group,
  GroupMembers,
  GroupPost,
  GroupTopic,
  Notify,
  NotifyField,
  Person,
  PersonSubjects,
  RevHistory,
  RevText,
  Subject,
  SubjectFields,
  SubjectImage,
  SubjectInterest,
  SubjectPost,
  SubjectRelation,
  SubjectRev,
  SubjectTopic,
  User,
  UserField,
} from './entity/index.ts';

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: config.mysql.host,
  port: config.mysql.port,
  username: config.mysql.user,
  password: config.mysql.password,
  database: config.mysql.db,
  synchronize: false,
  maxQueryExecutionTime: 2000,
  logger: {
    log(level: 'log' | 'info' | 'warn', message: unknown) {
      if (level === 'info') {
        logger.info(message);
      } else if (level === 'warn') {
        logger.warn(message);
      } else {
        logger.info({ log_level: level }, message?.toString());
      }
    },

    logQuerySlow(time: number, query: string, parameters?: unknown[]) {
      logger.warn({ time, query, parameters }, 'slow sql');
    },
    logQueryError(error: string | Error, query: string, parameters?: unknown[]) {
      logger.error({ error, query, parameters }, 'query error');
    },

    logQuery:
      production || stage
        ? // eslint-disable-next-line @typescript-eslint/no-empty-function
          () => {}
        : (query, params) => {
            logger.trace({ query, params });
          },

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    logSchemaBuild() {},

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    logMigration() {},
  },
  entities: [
    App,
    Cast,
    Character,
    CharacterSubjects,
    EpRevision,
    User,
    UserField,
    Notify,
    NotifyField,
    SubjectImage,
    Group,
    GroupMembers,
    Episode,
    EpisodeComment,
    Person,
    PersonSubjects,
    RevHistory,
    RevText,
    Subject,
    SubjectTopic,
    SubjectPost,
    SubjectFields,
    SubjectRelation,
    GroupTopic,
    GroupPost,
    SubjectRev,
    SubjectInterest,
  ],
});

export const UserRepo = AppDataSource.getRepository(User);
export const UserFieldRepo = AppDataSource.getRepository(UserField);

export const CharacterRepo = AppDataSource.getRepository(Character);
export const CharacterSubjectsRepo = AppDataSource.getRepository(CharacterSubjects);
export const CastRepo = AppDataSource.getRepository(Cast);

export const PersonRepo = AppDataSource.getRepository(Person);
export const PersonSubjectsRepo = AppDataSource.getRepository(PersonSubjects);

export const SubjectRepo = AppDataSource.getRepository(Subject);
export const SubjectTopicRepo = AppDataSource.getRepository(SubjectTopic);
export const SubjectPostRepo = AppDataSource.getRepository(SubjectPost);
export const SubjectFieldsRepo = AppDataSource.getRepository(SubjectFields);
export const SubjectImageRepo = AppDataSource.getRepository(SubjectImage);
export const SubjectRelationRepo = AppDataSource.getRepository(SubjectRelation);
export const EpisodeRepo = AppDataSource.getRepository(Episode);
export const EpisodeCommentRepo = AppDataSource.getRepository(EpisodeComment);
export const EpRevRepo = AppDataSource.getRepository(EpRevision);

export const RevHistoryRepo = AppDataSource.getRepository(RevHistory);
export const RevTextRepo = AppDataSource.getRepository(RevText);

export const SubjectRevRepo = AppDataSource.getRepository(SubjectRev);
export const SubjectInterestRepo = AppDataSource.getRepository(SubjectInterest);

export const NotifyRepo = AppDataSource.getRepository(Notify);
export const NotifyFieldRepo = AppDataSource.getRepository(NotifyField);

export const GroupRepo = AppDataSource.getRepository(Group);
export const GroupTopicRepo = AppDataSource.getRepository(GroupTopic);
export const GroupPostRepo = AppDataSource.getRepository(GroupPost);
export const GroupMemberRepo = AppDataSource.getRepository(GroupMembers);

export const repo = {
  UserField: UserFieldRepo,
  Subject: SubjectRepo,
  SubjectFields: SubjectFieldsRepo,
  SubjectRelation: SubjectRelationRepo,
  Episode: EpisodeRepo,
  Character: CharacterRepo,
  CharacterSubjects: CharacterSubjectsRepo,
  Cast: CastRepo,
  Person: PersonRepo,
  PersonSubjects: PersonSubjectsRepo,
  Notify: NotifyRepo,
  NotifyField: NotifyFieldRepo,
  Group: GroupRepo,
  GroupMember: GroupMemberRepo,
} as const;

export interface Page {
  limit?: number;
  offset?: number;
}

export interface IUser {
  id: number;
  username: string;
  nickname: string;
  groupID: number;
  img: string;
  regTime: number;
  sign: string;
}

export interface ISubject {
  id: number;
  name: string;
  typeID: number;
  infobox: string;
  platform: number;
  metaTags: string;
  summary: string;
  nsfw: boolean;
  date: string;
  redirect: number;
  locked: boolean;
  image: string;
}

export async function fetchSubjectByID(id: number): Promise<ISubject | null> {
  const subject = await SubjectRepo.findOne({
    where: { id },
  });

  if (!subject) {
    return null;
  }

  const f = await SubjectFieldsRepo.findOne({
    where: { subjectID: id },
  });

  if (!f) {
    throw new UnexpectedNotFoundError(`subject fields ${id}`);
  }
  return {
    id: subject.id,
    name: subject.name,
    typeID: subject.typeID,
    infobox: subject.fieldInfobox,
    platform: subject.platform,
    metaTags: subject.metaTags,
    summary: subject.fieldSummary,
    nsfw: subject.subjectNsfw,
    date: f.date,
    redirect: f.fieldRedirect,
    locked: subject.locked(),
    image: subject.subjectImage,
  } satisfies ISubject;
}

export { MoreThan as Gt, MoreThanOrEqual as Gte, In, Like } from 'typeorm';
