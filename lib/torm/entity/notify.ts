import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Index('nt_from_uid', ['from_uid'], {})
@Index('nt_mid', ['notify_field_id'], {})
@Index('nt_uid', ['uid', 'unread', 'type', 'postID'], {})
@Entity('chii_notify', { schema: 'bangumi' })
export class Notify {
  @PrimaryGeneratedColumn({ type: 'mediumint', name: 'nt_id', unsigned: true })
  id!: number;

  @Column('mediumint', { name: 'nt_uid', unsigned: true })
  uid!: number;

  @Column('mediumint', { name: 'nt_from_uid', unsigned: true })
  from_uid!: number;

  @Column('tinyint', {
    name: 'nt_status',
    unsigned: true,
    default: () => "'1'",
  })
  unread!: boolean;

  @Column('tinyint', { name: 'nt_type', unsigned: true, default: () => "'0'" })
  type!: number;

  @Column('mediumint', {
    name: 'nt_mid',
    comment: 'ID in notify_field',
    unsigned: true,
  })
  notify_field_id!: number;

  @Column('int', { name: 'nt_related_id', unsigned: true })
  postID!: number;

  @Column('int', { name: 'nt_dateline', unsigned: true })
  dateline!: number;
}

@Index('ntf_hash', ['hash'], {})
@Index('ntf_rid', ['topicID'], {})
@Entity('chii_notify_field', { schema: 'bangumi' })
export class NotifyField {
  @PrimaryGeneratedColumn({ type: 'mediumint', name: 'ntf_id', unsigned: true })
  id!: number;

  @Column('tinyint', { name: 'ntf_hash', unsigned: true, default: () => "'0'" })
  hash!: number;

  @Column('int', { name: 'ntf_rid', unsigned: true })
  topicID!: number;

  @Column('varchar', { name: 'ntf_title', length: 255 })
  title!: string;
}
