import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Index('access_token', ['accessToken'], { unique: true })
@Index('type', ['type'], {})
@Entity('chii_oauth_access_tokens', { schema: 'bangumi' })
export class OauthAccessTokens {
  @PrimaryGeneratedColumn({ type: 'mediumint', name: 'id' })
  id!: number;

  @Column('tinyint', { name: 'type', unsigned: true, default: () => "'0'" })
  type!: number;

  @Column('varchar', { name: 'access_token', unique: true, length: 40 })
  accessToken!: string;

  @Column('varchar', { name: 'client_id', length: 80 })
  clientId!: string;

  @Column('varchar', { name: 'user_id', nullable: true, length: 80 })
  userId!: string;

  @Column('timestamp', { name: 'expires', default: () => 'CURRENT_TIMESTAMP' })
  expires!: Date;

  @Column('varchar', { name: 'scope', nullable: true, length: 4000 })
  scope: string | undefined;

  @Column('varchar', { name: 'info', length: 255 })
  info!: string;
}

@Entity('chii_os_web_sessions', { schema: 'bangumi', name: 'chii_os_web_sessions' })
export class WebSessions {
  @Column('char', {
    primary: true,
    name: 'key',
    comment: 'session key',
    length: 64,
  })
  key!: string;

  @Column('int', { name: 'user_id', comment: 'uint32 user id', unsigned: true })
  userID!: number;

  @Column('mediumblob', { name: 'value', comment: 'json encoded session data' })
  value!: Buffer;

  @Column('bigint', {
    name: 'created_at',
    comment: 'int64 unix timestamp, when session is created',
  })
  createdAt!: number;

  @Column('bigint', {
    name: 'expired_at',
    comment: 'int64 unix timestamp, when session is expired',
  })
  expiredAt!: number;
}
