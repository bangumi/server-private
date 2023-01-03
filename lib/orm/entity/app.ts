import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Index('app_type', ['appType', 'appCreator'], {})
@Index('app_ban', ['appBan'], {})
@Index('app_status', ['appStatus'], {})
@Entity('chii_apps', { schema: 'bangumi' })
export class App {
  @PrimaryGeneratedColumn({ type: 'mediumint', name: 'app_id' })
  appId!: number;

  @Column('tinyint', { name: 'app_type', width: 1 })
  appType!: boolean;

  @Column('mediumint', { name: 'app_creator' })
  appCreator!: number;

  @Column('varchar', { name: 'app_name', length: 255 })
  appName!: string;

  @Column('mediumtext', { name: 'app_desc' })
  appDesc!: string;

  @Column('varchar', { name: 'app_url', length: 2000 })
  appUrl!: string;

  @Column('mediumint', { name: 'app_collects' })
  appCollects!: number;

  @Column('tinyint', { name: 'app_status', width: 1 })
  appStatus!: boolean;

  @Column('int', { name: 'app_timestamp' })
  appTimestamp!: number;

  @Column('int', { name: 'app_lasttouch' })
  appLasttouch!: number;

  @Column('tinyint', { name: 'app_ban', width: 1 })
  appBan!: boolean;
}
