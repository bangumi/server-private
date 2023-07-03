import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

// @Index('app_type', ['appType', 'appCreator'], {})
// @Index('app_ban', ['appBan'], {})
// @Index('app_status', ['appStatus'], {})
@Entity({ tableName: 'chii_apps', schema: 'bangumi' })
export class App {
  @PrimaryKey({ type: 'mediumint', name: 'app_id', autoincrement: true })
  appID!: number;

  @Property({ name: 'app_type', type: 'tinyint' })
  appType!: boolean;

  @Property({ name: 'app_creator', type: 'mediumint' })
  appCreator!: number;

  @Property({ name: 'app_name', length: 255, type: 'varchar' })
  appName!: string;

  @Property({ name: 'app_desc', type: 'mediumtext' })
  appDesc!: string;

  @Property({ name: 'app_url', length: 2000, type: 'varchar' })
  appUrl!: string;

  @Property({ name: 'app_collects', type: 'mediumint' })
  appCollects!: number;

  @Property({ name: 'app_status', type: 'tinyint' })
  appStatus!: boolean;

  @Property({ name: 'app_timestamp', type: 'int' })
  appTimestamp!: number;

  @Property({ name: 'app_lasttouch', type: 'int' })
  appLasttouch!: number;

  @Property({ name: 'app_ban', type: 'tinyint' })
  appBan!: boolean;
}
