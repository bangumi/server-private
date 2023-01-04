import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

import { App } from '@app/lib/orm/entity/app';

@Index('client_id', ['clientID'], {})
@Entity('chii_oauth_clients', { schema: 'bangumi' })
export class OauthClient {
  @Column('mediumint', { primary: true, name: 'app_id' })
  appID!: number;

  @Column('varchar', { name: 'client_id', length: 80 })
  clientID!: string;

  @Column('varchar', { name: 'client_secret', nullable: true, length: 80 })
  clientSecret: string | null = null;

  @Column('varchar', { name: 'redirect_uri', nullable: true, length: 2000 })
  redirectUri: string | null = null;

  @Column('varchar', { name: 'grant_types', nullable: true, length: 80 })
  grantTypes: string | null = null;

  @Column('varchar', { name: 'scope', nullable: true, length: 4000 })
  scope: string | null = null;

  @Column('varchar', { name: 'user_id', nullable: true, length: 80 })
  userId: string | null = null;

  @ManyToOne(() => App, (app) => app.appID, { eager: true, nullable: false })
  @JoinColumn({
    name: 'app_id',
    foreignKeyConstraintName: 'app_id',
  })
  app!: App;
}
