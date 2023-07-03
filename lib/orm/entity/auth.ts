import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'chii_oauth_access_tokens', schema: 'bangumi' })
export class OauthAccessTokens {
  @PrimaryKey({ type: 'mediumint', name: 'id', autoincrement: true })
  id!: number;

  @Property({ name: 'type', unsigned: true, default: "'0'", type: 'tinyint' })
  type!: number;

  @Property({ name: 'access_token', unique: true, length: 40, type: 'varchar' })
  accessToken!: string;

  @Property({ name: 'client_id', length: 80, type: 'varchar' })
  clientId!: string;

  @Property({ name: 'user_id', nullable: true, length: 80, type: 'varchar' })
  userId!: string;

  @Property({ name: 'expires', default: 'CURRENT_TIMESTAMP', type: 'timestamp' })
  expires!: Date;

  @Property({ name: 'scope', nullable: true, length: 4000, type: 'varchar' })
  scope?: string;

  @Property({ name: 'info', length: 255, type: 'varchar' })
  info!: string;
}
