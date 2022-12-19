import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Index('ep_sort', ['epSort'], {})
@Index('ep_disc', ['epDisc'], {})
@Index('ep_subject_id', ['epSubjectId'], {})
@Index('ep_lastpost', ['epLastpost'], {})
@Index('ep_ban', ['epBan'], {})
@Index('ep_subject_id_2', ['epSubjectId', 'epBan', 'epSort'], {})
@Entity('chii_episodes', { schema: 'bangumi' })
export class Episode {
  @PrimaryGeneratedColumn({ type: 'mediumint', name: 'ep_id', unsigned: true })
  id!: number;

  @Column('mediumint', { name: 'ep_subject_id', unsigned: true })
  epSubjectId!: number;

  @Column('float', {
    name: 'ep_sort',
    unsigned: true,
    precision: 12,
    default: () => "'0'",
  })
  epSort!: number;

  @Column('tinyint', { name: 'ep_type', unsigned: true })
  epType!: number;

  @Column('tinyint', {
    name: 'ep_disc',
    comment: '碟片数',
    unsigned: true,
    default: () => "'0'",
  })
  epDisc!: number;

  @Column('varchar', { name: 'ep_name', length: 80 })
  epName!: string;

  @Column('varchar', { name: 'ep_name_cn', length: 80 })
  epNameCn!: string;

  @Column('tinyint', { name: 'ep_rate' })
  epRate!: number;

  @Column('varchar', { name: 'ep_duration', length: 80 })
  epDuration!: string;

  @Column('varchar', { name: 'ep_airdate', length: 80 })
  epAirdate!: string;

  @Column('mediumtext', { name: 'ep_online' })
  epOnline!: string;

  @Column('mediumint', { name: 'ep_comment', unsigned: true })
  epComment!: number;

  @Column('mediumint', { name: 'ep_resources', unsigned: true })
  epResources!: number;

  @Column('mediumtext', { name: 'ep_desc' })
  epDesc!: string;

  @Column('int', { name: 'ep_dateline', unsigned: true })
  epDateline!: number;

  @Column('int', { name: 'ep_lastpost', unsigned: true })
  epLastpost!: number;

  @Column('tinyint', { name: 'ep_lock', unsigned: true, default: () => "'0'" })
  epLock!: number;

  @Column('tinyint', { name: 'ep_ban', unsigned: true, default: () => "'0'" })
  epBan!: number;
}
