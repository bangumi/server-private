import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

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
  anidbId!: number;

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
