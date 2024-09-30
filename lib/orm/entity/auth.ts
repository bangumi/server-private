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
