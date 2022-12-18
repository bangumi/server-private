import { DataSource } from 'typeorm';

import { MYSQL_DB, MYSQL_HOST, MYSQL_PASS, MYSQL_PORT, MYSQL_USER } from '../config';
import {
  OauthAccessTokens,
  WebSessions,
  Notify,
  NotifyField,
  Friends,
  User,
  UserField,
  UserGroup,
  GroupMembers,
  Group,
  Episode,
} from './entity';

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: MYSQL_HOST,
  port: Number.parseInt(MYSQL_PORT),
  username: MYSQL_USER,
  password: MYSQL_PASS,
  database: MYSQL_DB,
  synchronize: false,
  entities: [
    User,
    UserField,
    OauthAccessTokens,
    WebSessions,
    UserGroup,
    Notify,
    NotifyField,
    Friends,
    Group,
    GroupMembers,
    Episode,
  ],
});

// const UserRepo = AppDataSource.getRepository(User);
export const UserFieldRepo = AppDataSource.getRepository(UserField);
export const FriendRepo = AppDataSource.getRepository(Friends);

export const EpisodeRepo = AppDataSource.getRepository(Episode);

export const AccessTokenRepo = AppDataSource.getRepository(OauthAccessTokens);
export const SessionRepo = AppDataSource.getRepository(WebSessions);
export const UserGroupRepo = AppDataSource.getRepository(UserGroup);

export const NotifyRepo = AppDataSource.getRepository(Notify);
export const NotifyFieldRepo = AppDataSource.getRepository(NotifyField);

export const GroupRepo = AppDataSource.getRepository(Group);
export const GroupMemberRepo = AppDataSource.getRepository(GroupMembers);

export const repo = {
  UserField: UserFieldRepo,
  Friend: FriendRepo,
  Episode: EpisodeRepo,
  AccessToken: AccessTokenRepo,
  Session: SessionRepo,
  UserGroup: UserGroupRepo,
  Notify: NotifyRepo,
  NotifyField: NotifyFieldRepo,
  Group: GroupRepo,
  GroupMember: GroupMemberRepo,
} as const;
