import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Index('ep_sort', ['sort'], {})
@Index('ep_disc', ['epDisc'], {})
@Index('ep_subject_id', ['subjectID'], {})
@Index('ep_lastpost', ['epLastPost'], {})
@Index('ep_ban', ['epBan'], {})
@Index('ep_subject_id_2', ['subjectID', 'epBan', 'sort'], {})
@Entity('chii_episodes', { schema: 'bangumi' })
export class Episode {
  @PrimaryGeneratedColumn({ type: 'mediumint', name: 'ep_id', unsigned: true })
  id!: number;

  @Column('mediumint', { name: 'ep_subject_id', unsigned: true })
  subjectID!: number;

  @Column('float', {
    name: 'ep_sort',
    unsigned: true,
    precision: 12,
    default: () => "'0'",
  })
  sort!: number;

  @Column('tinyint', { name: 'ep_type', unsigned: true })
  type!: number;

  @Column('tinyint', {
    name: 'ep_disc',
    comment: '碟片数',
    unsigned: true,
    default: () => "'0'",
  })
  epDisc!: number;

  @Column('varchar', { name: 'ep_name', length: 80 })
  name!: string;

  @Column('varchar', { name: 'ep_name_cn', length: 80 })
  nameCN!: string;

  @Column('tinyint', { name: 'ep_rate' })
  epRate!: number;

  @Column('varchar', { name: 'ep_duration', length: 80 })
  duration!: string;

  @Column('varchar', { name: 'ep_airdate', length: 80 })
  airDate!: string;

  /** @deprecated 在线播放地址 */
  @Column('mediumtext', { name: 'ep_online' })
  epOnline!: string;

  @Column('mediumint', { name: 'ep_comment', unsigned: true })
  epComment!: number;

  @Column('mediumint', { name: 'ep_resources', unsigned: true })
  epResources!: number;

  @Column('mediumtext', { name: 'ep_desc' })
  summary!: string;

  @Column('int', { name: 'ep_dateline', unsigned: true })
  epDateline!: number;

  @Column('int', { name: 'ep_lastpost', unsigned: true })
  epLastPost!: number;

  @Column('tinyint', { name: 'ep_lock', unsigned: true, default: () => "'0'" })
  epLock!: number;

  @Column('tinyint', { name: 'ep_ban', unsigned: true, default: () => "'0'" })
  epBan!: number;
}

@Index('ep_cmt_crt_id', ['epID'], {})
@Index('ep_pst_related', ['relatedID'], {})
@Index('ep_pst_uid', ['creatorID'], {})
@Entity('chii_ep_comments', { schema: 'bangumi' })
export class EpisodeComment {
  @PrimaryGeneratedColumn({
    type: 'mediumint',
    name: 'ep_pst_id',
    unsigned: true,
  })
  id!: number;

  @Column('mediumint', { name: 'ep_pst_mid', unsigned: true })
  epID!: number;

  @Column('mediumint', { name: 'ep_pst_uid', unsigned: true })
  creatorID!: number;

  @Column('mediumint', {
    name: 'ep_pst_related',
    unsigned: true,
    default: () => "'0'",
  })
  relatedID!: number;

  @Column('int', { name: 'ep_pst_dateline', unsigned: true })
  createdAt!: number;

  @Column('mediumtext', { name: 'ep_pst_content' })
  content!: string;

  @Column('mediumtext', { name: 'ep_pst_state' })
  state!: number;
}
