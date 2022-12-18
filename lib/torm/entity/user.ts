import { Column, Entity, Index, OneToOne, PrimaryGeneratedColumn } from 'typeorm';

@Index('username', ['username'], { unique: true })
@Entity('chii_members', { schema: 'bangumi' })
export class User {
  @PrimaryGeneratedColumn({ type: 'mediumint', name: 'uid', unsigned: true })
  id!: number;

  @Column('char', { name: 'username', unique: true, length: 15 })
  username!: string;

  @Column('varchar', { name: 'nickname', length: 30 })
  nickname!: string;

  @Column('varchar', { name: 'avatar', length: 255 })
  avatar!: string;

  @Column('smallint', { name: 'groupid', unsigned: true, default: () => "'0'" })
  groupid!: number;

  @Column('int', { name: 'regdate', unsigned: true, default: () => "'0'" })
  regdate!: number;

  @Column('int', { name: 'lastvisit', unsigned: true, default: () => "'0'" })
  lastvisit!: number;

  @Column('int', { name: 'lastactivity', unsigned: true, default: () => "'0'" })
  lastactivity!: number;

  @Column('int', { name: 'lastpost', unsigned: true, default: () => "'0'" })
  lastpost!: number;

  @Column('char', { name: 'dateformat', length: 10 })
  dateformat!: string;

  @Column('tinyint', { name: 'timeformat', width: 1, default: () => "'0'" })
  timeformat!: boolean;

  @Column('char', { name: 'timeoffset', length: 4 })
  timeoffset!: string;

  @Column('tinyint', { name: 'newpm', width: 1, default: () => "'0'" })
  newpm!: boolean;

  @Column('smallint', {
    name: 'new_notify',
    comment: '新提醒',
    unsigned: true,
    default: () => "'0'",
  })
  newNotify!: number;

  @Column('varchar', { name: 'sign', length: 255 })
  sign!: string;

  @Column('char', { name: 'password_crypt', length: 64 })
  passwordCrypt!: string;

  @Column('char', { name: 'email', length: 50 })
  email!: string;

  @OneToOne(() => UserField)
  fields!: UserField;
}

@Entity('chii_memberfields', { schema: 'bangumi' })
export class UserField {
  @Column('mediumint', {
    primary: true,
    name: 'uid',
    unsigned: true,
    default: () => "'0'",
  })
  uid!: number;

  @Column('varchar', { name: 'site', length: 75 })
  site!: string;

  @Column('varchar', { name: 'location', length: 30 })
  location!: string;

  @Column('text', { name: 'bio' })
  bio!: string;

  @Column('mediumtext', { name: 'privacy' })
  privacy!: string;

  @Column('mediumtext', { name: 'blocklist' })
  blocklist!: string;
}

@Entity('chii_usergroup', { schema: 'bangumi' })
export class UserGroup {
  @PrimaryGeneratedColumn({
    type: 'mediumint',
    name: 'usr_grp_id',
    unsigned: true,
  })
  id!: number;

  @Column('varchar', { name: 'usr_grp_name', length: 255 })
  name!: string;

  @Column('mediumtext', { name: 'usr_grp_perm' })
  Permission!: string;

  @Column('int', { name: 'usr_grp_dateline', unsigned: true })
  updatedAt!: number;
}
