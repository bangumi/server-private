import { Column, Entity, Index } from 'typeorm';

import { UnixTimestamp } from '@app/lib/orm/transformer';

const TYPE_SUBJECT_COVER = 1;
const TYPE_GROUP_TOPIC = 7;
const TYPE_GROUP_REPLY = 8;
const TYPE_SBJ_REPLY = 10;
const TYPE_EP_REPLY = 11;

/** 用于点赞/封面投票 */
@Index('idx_uid', ['uid'], {})
@Index('idx_related', ['relatedID'], {})
@Index('type', ['type', 'mainID', 'uid'], {})
@Entity('chii_likes', { schema: 'bangumi' })
export class Like {
  static readonly TYPE_SUBJECT_COVER = TYPE_SUBJECT_COVER;

  static readonly TYPE_GROUP_TOPIC = TYPE_GROUP_TOPIC;
  static readonly TYPE_GROUP_REPLY = TYPE_GROUP_REPLY;

  static readonly TYPE_SBJ_REPLY = TYPE_SBJ_REPLY;
  static readonly TYPE_EP_REPLY = TYPE_EP_REPLY;

  static readonly $like_types = [TYPE_GROUP_REPLY, TYPE_SBJ_REPLY, TYPE_EP_REPLY] as const;

  static readonly $allow_reaction_types = [
    TYPE_GROUP_REPLY,
    TYPE_SBJ_REPLY,
    TYPE_EP_REPLY,
  ] as const;

  public static readonly $like_interactions = Object.freeze({
    0: '44', // bgm67
    80: '41', // bgm64
    54: '15', // bgm38
    85: '46', // bgm69
    104: '65', // bgm88

    88: '49', // bgm72
    62: '23', // bgm46
    79: '40', // bgm63
    53: '14', // bgm37
    122: '83', // bgm106

    92: '53', // bgm76
    118: '79', // bgm102
    90: '51', // bgm74
    76: '37', // bgm60
    60: '21', // bgm44

    128: '89', // bgm112
    47: '08', // bgm31
    68: '29', // bgm52
    137: '98', // bgm121
    132: '93', // bgm116
  });

  @Column('mediumint', { primary: true, name: 'type', unsigned: true })
  type!: number;

  @Column('mediumint', { primary: true, name: 'related_id' })
  relatedID!: number;

  @Column('mediumint', { unsigned: true, name: 'main_id', default: '0' })
  mainID!: number;

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
    transformer: UnixTimestamp,
  })
  createdAt!: Date;
}
