import { DateTime } from 'luxon';
import { Column, Entity, Index } from 'typeorm';

/** 用于点赞/封面投票 */
@Index('idx_uid', ['uid'], {})
@Index('idx_related', ['relatedID'], {})
@Entity('chii_likes', { schema: 'bangumi' })
export class Like {
  static readonly TYPE_SUBJECT_COVER = 1;

  @Column('mediumint', { primary: true, name: 'type', unsigned: true })
  type!: number;

  @Column('mediumint', { primary: true, name: 'related_id' })
  relatedID!: number;

  @Column('mediumint', { primary: true, name: 'uid', unsigned: true })
  uid!: number;

  @Column('mediumint', { name: 'value', unsigned: true })
  value = 0;

  @Column('tinyint', { name: 'ban', unsigned: true, default: () => "'0'" })
  ban = 0;

  /** Use `@CreateDateColumn` after https://github.com/typeorm/typeorm/issues/8701 is fixed */
  @Column('int', {
    name: 'created_at',
    comment: 'unix timestamp seconds',
    unsigned: true,
    transformer: {
      to: (value: Date) => Math.trunc(value.getTime() / 1000),
      from: (value: number) => DateTime.fromSeconds(value).toJSDate(),
    },
  })
  createdAt!: Date;
}
