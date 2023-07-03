import { Entity, ManyToOne, Property } from '@mikro-orm/core';

import { App } from '@app/lib/orm/entity/app.ts';

@Entity({ tableName: 'chii_oauth_clients', schema: 'bangumi' })
export class OauthClient {
  @Property({ primary: true, name: 'app_id', type: 'mediumint' })
  appID!: number;

  @Property({ name: 'client_id', length: 80, type: 'varchar' })
  clientID!: string;

  @Property({ name: 'client_secret', nullable: true, length: 80, type: 'varchar' })
  clientSecret: string | null = null;

  @Property({ name: 'redirect_uri', nullable: true, length: 2000, type: 'varchar' })
  redirectUri: string | null = null;

  @Property({ name: 'grant_types', nullable: true, length: 80, type: 'varchar' })
  grantTypes: string | null = null;

  @Property({ name: 'scope', nullable: true, length: 4000, type: 'varchar' })
  scope: string | null = null;

  @Property({ name: 'user_id', nullable: true, length: 80, type: 'varchar' })
  userId: string | null = null;

  @ManyToOne(() => App, {
    name: 'app_id',
    eager: true,
    nullable: false,
  })
  app!: App;
}
