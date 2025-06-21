import { Column, Entity, Index, PrimaryColumn, PrimaryGeneratedColumn } from 'typeorm';

import type { Subject } from './subject.ts';

@Index('prsn_type', ['type'], {})
@Index('prsn_producer', ['producer'], {})
@Index('prsn_mangaka', ['mangaka'], {})
@Index('prsn_artist', ['artist'], {})
@Index('prsn_seiyu', ['seiyu'], {})
@Index('prsn_writer', ['writer'], {})
@Index('prsn_illustrator', ['illustrator'], {})
@Index('prsn_lock', ['lock'], {})
@Index('prsn_ban', ['ban'], {})
@Index('prsn_actor', ['actor'], {})
@Entity('chii_persons', { schema: 'bangumi' })
export class Person {
  @PrimaryGeneratedColumn({
    type: 'mediumint',
    name: 'prsn_id',
    unsigned: true,
  })
  id!: number;

  @Column('varchar', { name: 'prsn_name', length: 255 })
  name!: string;

  @Column('tinyint', {
    name: 'prsn_type',
    comment: '个人，公司，组合',
    unsigned: true,
  })
  type!: number;

  @Column('mediumtext', { name: 'prsn_infobox' })
  infobox!: string;

  @Column('tinyint', { name: 'prsn_producer', width: 1 })
  producer!: boolean;

  @Column('tinyint', { name: 'prsn_mangaka', width: 1 })
  mangaka!: boolean;

  @Column('tinyint', { name: 'prsn_artist', width: 1 })
  artist!: boolean;

  @Column('tinyint', { name: 'prsn_seiyu', width: 1 })
  seiyu!: boolean;

  @Column('tinyint', {
    name: 'prsn_writer',
    comment: '作家',
    default: () => "'0'",
  })
  writer!: boolean;

  @Column('tinyint', {
    name: 'prsn_illustrator',
    comment: '绘师',
    default: () => "'0'",
  })
  illustrator!: boolean;

  @Column('tinyint', { name: 'prsn_actor', comment: '演员', width: 1 })
  actor!: boolean;

  @Column('mediumtext', { name: 'prsn_summary' })
  summary!: string;

  @Column('varchar', { name: 'prsn_img', length: 255 })
  img!: string;

  @Column('varchar', { name: 'prsn_img_anidb', length: 255 })
  imgAnidb!: string;

  @Column('mediumint', { name: 'prsn_comment', unsigned: true })
  comment!: number;

  @Column('mediumint', { name: 'prsn_collects', unsigned: true })
  collects!: number;

  @Column('int', { name: 'prsn_dateline', unsigned: true })
  updatedAt!: number;

  @Column('int', { name: 'prsn_lastpost', unsigned: true })
  lastPost!: number;

  @Column('tinyint', { name: 'prsn_lock' })
  lock!: number;

  @Column('mediumint', { name: 'prsn_anidb_id', unsigned: true })
  anidbID!: number;

  @Column('tinyint', { name: 'prsn_ban', unsigned: true, default: () => "'0'" })
  ban!: number;

  @Column('int', {
    name: 'prsn_redirect',
    unsigned: true,
    default: () => "'0'",
  })
  redirect!: number;

  @Column('tinyint', { name: 'prsn_nsfw', unsigned: true, width: 1 })
  nsfw!: boolean;
}

@Index('subject_id', ['subjectID'], {})
@Index('prsn_position', ['position'], {})
@Index('prsn_id', ['personID'], {})
@Index('subject_type_id', ['subjectTypeID'], {})
@Entity('chii_person_cs_index', { schema: 'bangumi' })
export class PersonSubjects {
  // @Column("enum", { primary: true, name: "prsn_type", enum: ["prsn", "crt"] })
  // personType: "prsn" | "crt";

  @PrimaryColumn('mediumint', { primary: true, name: 'prsn_id', unsigned: true })
  personID!: number;

  @Column('smallint', {
    primary: true,
    name: 'prsn_position',
    comment: '监督，原案，脚本,..',
    unsigned: true,
  })
  position!: number;

  @PrimaryColumn('mediumint', { primary: true, name: 'subject_id', unsigned: true })
  subjectID!: number;

  @Column('tinyint', { name: 'subject_type_id', unsigned: true })
  subjectTypeID!: number;

  @Column('mediumtext', { name: 'summary' })
  summary!: string;

  person!: Person;

  subject!: Subject;
}
