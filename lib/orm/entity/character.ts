import { Column, Entity, Index, PrimaryColumn, PrimaryGeneratedColumn } from 'typeorm';

import type { Subject } from './subject.ts';

@Index('crt_role', ['role'], {})
@Index('crt_lock', ['lock'], {})
@Index('crt_ban', ['ban'], {})
@Entity('chii_characters', { schema: 'bangumi' })
export class Character {
  @PrimaryGeneratedColumn({ type: 'mediumint', name: 'crt_id', unsigned: true })
  id!: number;

  @Column('varchar', { name: 'crt_name', length: 255 })
  name!: string;

  @Column('tinyint', {
    name: 'crt_role',
    comment: '角色，机体，组织。。',
    unsigned: true,
  })
  role!: number;

  @Column('mediumtext', { name: 'crt_infobox' })
  infobox!: string;

  @Column('mediumtext', { name: 'crt_summary' })
  summary!: string;

  @Column('varchar', { name: 'crt_img', length: 255 })
  img!: string;

  @Column('mediumint', {
    name: 'crt_comment',
    unsigned: true,
    default: () => "'0'",
  })
  comment!: number;

  @Column('mediumint', { name: 'crt_collects', unsigned: true })
  collects!: number;

  @Column('int', { name: 'crt_dateline', unsigned: true })
  updatedAt!: number;

  @Column('int', { name: 'crt_lastpost', unsigned: true })
  lastPost!: number;

  @Column('tinyint', { name: 'crt_lock', default: () => "'0'" })
  lock!: number;

  @Column('varchar', { name: 'crt_img_anidb', length: 255 })
  imgAnidb!: string;

  @Column('mediumint', { name: 'crt_anidb_id', unsigned: true })
  anidbID!: number;

  @Column('tinyint', { name: 'crt_ban', unsigned: true, default: () => "'0'" })
  ban!: number;

  @Column('int', { name: 'crt_redirect', unsigned: true, default: () => "'0'" })
  redirect!: number;

  @Column('tinyint', { name: 'crt_nsfw', unsigned: true, width: 1 })
  nsfw!: boolean;
}

@Index('subject_id', ['subjectID'], {})
@Index('crt_type', ['type'], {})
@Index('subject_type_id', ['subjectTypeID'], {})
@Entity('chii_crt_subject_index', { schema: 'bangumi' })
export class CharacterSubjects {
  @PrimaryColumn('mediumint', { primary: true, name: 'crt_id', unsigned: true })
  characterID!: number;

  @PrimaryColumn('mediumint', { primary: true, name: 'subject_id', unsigned: true })
  subjectID!: number;

  @Column('tinyint', { name: 'subject_type_id', unsigned: true })
  subjectTypeID!: number;

  @Column('tinyint', {
    name: 'crt_type',
    comment: '主角，配角',
    unsigned: true,
  })
  type!: number;

  // @Column('mediumtext', {
  //   name: 'ctr_appear_eps',
  //   comment: '可选，角色出场的的章节',
  // })
  // appearEps: string;

  @Column('tinyint', { name: 'crt_order', unsigned: true })
  order!: number;

  character!: Character;

  subject!: Subject;
}
