import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

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
  anidbId!: number;

  @Column('tinyint', { name: 'crt_ban', unsigned: true, default: () => "'0'" })
  ban!: number;

  @Column('int', { name: 'crt_redirect', unsigned: true, default: () => "'0'" })
  redirect!: number;

  @Column('tinyint', { name: 'crt_nsfw', unsigned: true, width: 1 })
  nsfw!: boolean;
}
