import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Index('tml_uid', ['creatorID'], {})
@Index('tml_cat', ['cat'], {})
@Index('tml_batch', ['tmlBatch'], {})
@Index('query_tml_cat', ['creatorID', 'cat'], {})
@Entity('chii_timeline', { schema: 'bangumi' })
export class Timeline {
  @PrimaryGeneratedColumn({ type: 'int', name: 'tml_id', unsigned: true })
  id!: number;

  @Column('mediumint', {
    name: 'tml_uid',
    unsigned: true,
    default: () => "'0'",
  })
  creatorID!: number;

  @Column('smallint', { name: 'tml_cat', unsigned: true })
  cat!: number;

  @Column('smallint', {
    name: 'tml_type',
    unsigned: true,
    default: () => "'0'",
  })
  type!: number;

  @Column('char', { name: 'tml_related', length: 255, default: () => "'0'" })
  tmlRelated!: string;

  @Column('mediumtext', { name: 'tml_memo' })
  memo!: string;

  @Column('mediumtext', { name: 'tml_img' })
  img!: string;

  @Column('tinyint', { name: 'tml_batch', unsigned: true })
  tmlBatch!: number;

  @Column('tinyint', {
    name: 'tml_source',
    comment: '更新来源',
    unsigned: true,
    default: () => "'0'",
  })
  tmlSource!: number;

  @Column('mediumint', {
    name: 'tml_replies',
    comment: '回复数',
    unsigned: true,
  })
  tmlReplies!: number;

  @Column('int', { name: 'tml_dateline', unsigned: true, default: () => "'0'" })
  createdAt!: number;

  // @Column('tinyint', {
  //   name: 'tml_status',
  //   unsigned: true,
  //   default: () => "'0'",
  // })
  // tmlStatus!: number;
}
