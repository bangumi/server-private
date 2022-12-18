import { DataSource } from 'typeorm';

import { MYSQL_DB, MYSQL_HOST, MYSQL_PASS, MYSQL_PORT, MYSQL_USER } from '../config';
import { OauthAccessTokens, WebSessions } from './entity/auth';
import { User, UserField, UserGroup } from './entity/user';

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: MYSQL_HOST,
  port: Number.parseInt(MYSQL_PORT),
  username: MYSQL_USER,
  password: MYSQL_PASS,
  database: MYSQL_DB,
  synchronize: false,
  entities: [User, UserField, OauthAccessTokens, WebSessions, UserGroup],
});

// const UserRepo = AppDataSource.getRepository(User);
export const UserFieldRepo = AppDataSource.getRepository(UserField);
export const AccessTokenRepo = AppDataSource.getRepository(OauthAccessTokens);
export const SessionRepo = AppDataSource.getRepository(WebSessions);
export const UserGroupRepo = AppDataSource.getRepository(UserGroup);
