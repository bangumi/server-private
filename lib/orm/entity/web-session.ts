import { Column, Entity } from 'typeorm';

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
