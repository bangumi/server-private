import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Index('rev_crt_id', ['revType', 'revMid'], {})
@Index('rev_crt_creator', ['revCreator'], {})
@Index('rev_id', ['revId', 'revType', 'revCreator'], {})
@Entity('chii_rev_history', { schema: 'bangumi' })
export class RevHistory {
  @PrimaryGeneratedColumn({ type: 'mediumint', name: 'rev_id', unsigned: true })
  revId!: number;

  @Column('tinyint', {
    name: 'rev_type',
    comment: '条目，角色，人物',
    unsigned: true,
  })
  revType!: number;

  @Column('mediumint', {
    name: 'rev_mid',
    comment: '对应条目，人物的ID',
    unsigned: true,
  })
  revMid!: number;

  @Column('mediumint', { name: 'rev_text_id', unsigned: true })
  revTextId!: number;

  @Column('int', { name: 'rev_dateline', unsigned: true })
  createdAt!: number;

  @Column('mediumint', { name: 'rev_creator', unsigned: true })
  revCreator!: number;

  @Column('varchar', { name: 'rev_edit_summary', length: 200 })
  revEditSummary!: string;
}

@Entity('chii_rev_text', { schema: 'bangumi' })
export class RevText {
  @PrimaryGeneratedColumn({
    type: 'mediumint',
    name: 'rev_text_id',
    unsigned: true,
  })
  revTextId!: number;

  @Column('mediumblob', { name: 'rev_text' })
  revText!: Buffer;
}

@Index('rev_sid', ['revSid', 'revCreator'], {})
@Entity('chii_ep_revisions', { schema: 'bangumi' })
export class EpRevision {
  @PrimaryGeneratedColumn({
    type: 'mediumint',
    name: 'ep_rev_id',
    unsigned: true,
  })
  epRevId!: number;

  @Column('mediumint', { name: 'rev_sid', unsigned: true })
  revSid!: number;

  @Column('varchar', { name: 'rev_eids', length: 255 })
  revEids!: string;

  @Column('mediumtext', { name: 'rev_ep_infobox' })
  revEpInfobox!: string;

  @Column('mediumint', { name: 'rev_creator', unsigned: true })
  revCreator!: number;

  @Column('tinyint', {
    name: 'rev_version',
    unsigned: true,
    default: () => "'0'",
  })
  revVersion!: number;

  @Column('int', { name: 'rev_dateline', unsigned: true })
  revDateline!: number;

  @Column('varchar', { name: 'rev_edit_summary', length: 200 })
  revEditSummary!: string;
}
