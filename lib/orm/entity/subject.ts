import { Column, Entity, Index, PrimaryColumn, PrimaryGeneratedColumn } from 'typeorm';

import { BooleanTransformer, htmlEscapedString, UnixTimestamp } from '@app/lib/orm/transformer.ts';

import type { User } from './user.ts';

@Index('subject_name_cn', ['nameCN'], {})
@Index('subject_platform', ['platform'], {})
@Index('subject_creator', ['subjectCreator'], {})
@Index('subject_series', ['subjectSeries'], {})
@Index('subject_series_entry', ['subjectSeriesEntry'], {})
@Index('subject_airtime', ['subjectAirtime'], {})
@Index('subject_ban', ['subjectBan'], {})
@Index('subject_idx_cn', ['subjectIdxCn', 'typeID'], {})
@Index('subject_type_id', ['typeID'], {})
@Index('subject_name', ['name'], {})
@Index('order_by_name', ['subjectBan', 'typeID', 'subjectSeries', 'platform', 'name'], {})
@Index('browser', ['subjectBan', 'typeID', 'subjectSeries', 'platform'], {})
@Index('subject_nsfw', ['subjectNsfw'], {})
@Entity('chii_subjects', { schema: 'bangumi' })
export class Subject {
  @PrimaryGeneratedColumn({
    type: 'mediumint',
    name: 'subject_id',
    unsigned: true,
  })
  id!: number;

  @Column('smallint', {
    name: 'subject_type_id',
    unsigned: true,
    default: () => "'0'",
  })
  typeID!: number;

  @Column('varchar', { name: 'subject_name', length: 80, transformer: htmlEscapedString })
  name!: string;

  @Column('varchar', { name: 'subject_name_cn', length: 80, transformer: htmlEscapedString })
  nameCN!: string;

  @Column('varchar', {
    name: 'subject_uid',
    comment: 'isbn / imdb',
    length: 20,
  })
  subjectUid!: string;

  @Column('mediumint', { name: 'subject_creator', unsigned: true })
  subjectCreator!: number;

  @Column('int', {
    name: 'subject_dateline',
    unsigned: true,
    default: () => "'0'",
  })
  updatedAt!: number;

  @Column('varchar', { name: 'subject_image', length: 255 })
  subjectImage!: string;

  @Column('smallint', {
    name: 'subject_platform',
    unsigned: true,
    default: () => "'0'",
  })
  platform!: number;

  @Column('mediumtext', { name: 'field_infobox', transformer: htmlEscapedString })
  fieldInfobox!: string;

  @Column('mediumtext', { name: 'field_meta_tags', default: () => '' })
  metaTags!: string;

  @Column('mediumtext', {
    name: 'field_summary',
    comment: 'summary',
  })
  fieldSummary!: string;

  @Column('mediumtext', { name: 'field_5', comment: 'author summary' })
  field_5!: string;

  @Column('mediumint', {
    name: 'field_volumes',
    comment: '卷数',
    unsigned: true,
    default: () => "'0'",
  })
  fieldVolumes!: number;

  @Column('mediumint', {
    name: 'field_eps',
    unsigned: true,
    default: () => "'0'",
  })
  fieldEps!: number;

  @Column('mediumint', {
    name: 'subject_wish',
    unsigned: true,
    default: () => "'0'",
  })
  subjectWish!: number;

  @Column('mediumint', {
    name: 'subject_collect',
    unsigned: true,
    default: () => "'0'",
  })
  subjectCollect!: number;

  @Column('mediumint', {
    name: 'subject_doing',
    unsigned: true,
    default: () => "'0'",
  })
  subjectDoing!: number;

  @Column('mediumint', {
    name: 'subject_on_hold',
    comment: '搁置人数',
    unsigned: true,
    default: () => "'0'",
  })
  subjectOnHold!: number;

  @Column('mediumint', {
    name: 'subject_dropped',
    comment: '抛弃人数',
    unsigned: true,
    default: () => "'0'",
  })
  subjectDropped!: number;

  @Column('tinyint', {
    name: 'subject_series',
    unsigned: true,
    default: () => "'0'",
  })
  subjectSeries!: number;

  @Column('mediumint', {
    name: 'subject_series_entry',
    unsigned: true,
    default: () => "'0'",
  })
  subjectSeriesEntry!: number;

  @Column('varchar', { name: 'subject_idx_cn', length: 1 })
  subjectIdxCn!: string;

  @Column('tinyint', { name: 'subject_airtime', unsigned: true })
  subjectAirtime!: number;

  @Column('tinyint', { name: 'subject_nsfw', width: 1, transformer: BooleanTransformer })
  subjectNsfw!: boolean;

  @Column('tinyint', {
    name: 'subject_ban',
    unsigned: true,
    default: () => "'0'",
  })
  subjectBan!: number;

  locked(): boolean {
    return this.subjectBan === 2;
  }

  fields!: SubjectFields;
}

@Index('sort_id', ['fieldTid'], {})
@Index('subject_airtime', ['fieldAirtime'], {})
@Index('field_rank', ['fieldRank'], {})
@Index('field_date', ['date'], {})
@Index('field_year_mon', ['year', 'month'], {})
@Index('field_year', ['year'], {})
@Index('query_date', ['subjectID', 'date'], {})
@Entity('chii_subject_fields', { schema: 'bangumi' })
export class SubjectFields {
  @PrimaryGeneratedColumn({
    type: 'mediumint',
    name: 'field_sid',
    unsigned: true,
  })
  subjectID!: number;

  @Column('smallint', {
    name: 'field_tid',
    unsigned: true,
    default: () => "'0'",
  })
  fieldTid!: number;

  @Column('mediumtext', { name: 'field_tags' })
  fieldTags!: string;

  @Column('mediumint', {
    name: 'field_rate_1',
    unsigned: true,
    default: () => "'0'",
  })
  fieldRate_1!: number;

  @Column('mediumint', {
    name: 'field_rate_2',
    unsigned: true,
    default: () => "'0'",
  })
  fieldRate_2!: number;

  @Column('mediumint', {
    name: 'field_rate_3',
    unsigned: true,
    default: () => "'0'",
  })
  fieldRate_3!: number;

  @Column('mediumint', {
    name: 'field_rate_4',
    unsigned: true,
    default: () => "'0'",
  })
  fieldRate_4!: number;

  @Column('mediumint', {
    name: 'field_rate_5',
    unsigned: true,
    default: () => "'0'",
  })
  fieldRate_5!: number;

  @Column('mediumint', {
    name: 'field_rate_6',
    unsigned: true,
    default: () => "'0'",
  })
  fieldRate_6!: number;

  @Column('mediumint', {
    name: 'field_rate_7',
    unsigned: true,
    default: () => "'0'",
  })
  fieldRate_7!: number;

  @Column('mediumint', {
    name: 'field_rate_8',
    unsigned: true,
    default: () => "'0'",
  })
  fieldRate_8!: number;

  @Column('mediumint', {
    name: 'field_rate_9',
    unsigned: true,
    default: () => "'0'",
  })
  fieldRate_9!: number;

  @Column('mediumint', {
    name: 'field_rate_10',
    unsigned: true,
    default: () => "'0'",
  })
  fieldRate_10!: number;

  @Column('tinyint', { name: 'field_airtime', unsigned: true })
  fieldAirtime!: number;

  @Column('int', { name: 'field_rank', unsigned: true, default: () => "'0'" })
  fieldRank!: number;

  @Column('year', { name: 'field_year', comment: '放送年份' })
  year!: number;

  @Column('tinyint', { name: 'field_mon', comment: '放送月份' })
  month!: number;

  @Column('tinyint', {
    name: 'field_week_day',
    comment: '放送日(星期X)',
    width: 1,
  })
  fieldWeekDay!: number;

  @Column('date', { name: 'field_date', comment: '放送日期' })
  date!: string;

  @Column('mediumint', {
    name: 'field_redirect',
    unsigned: true,
    default: () => "'0'",
  })
  fieldRedirect!: number;
}

@Index('img_subject_id', ['subjectID'], {})
@Index('img_nsfw', ['nsfw', 'ban'], {})
@Entity('chii_subject_imgs', { schema: 'bangumi' })
export class SubjectImage {
  @PrimaryGeneratedColumn({ type: 'mediumint', name: 'img_id', unsigned: true })
  id!: number;

  @Column('mediumint', { name: 'img_subject_id', unsigned: true })
  subjectID!: number;

  @Column('mediumint', { name: 'img_uid', unsigned: true })
  uid!: number;

  /**
   * Base file name,
   *
   * @example E4/da/5_wUARf.jpg
   */
  @Column('varchar', { name: 'img_target', length: 255 })
  target!: string;

  @Column('mediumint', { name: 'img_vote', unsigned: true })
  vote!: number;

  @Column('tinyint', { name: 'img_nsfw', unsigned: true })
  nsfw!: number;

  @Column('tinyint', { name: 'img_ban', unsigned: true })
  ban!: number;

  @Column('int', {
    name: 'img_dateline',
    unsigned: true,
    transformer: UnixTimestamp,
  })
  createdAt!: Date;
}

@Index('rlt_subject_id', ['subjectID', 'relatedSubjectID', 'viceVersa'], { unique: true })
@Index('rlt_related_subject_type_id', ['relatedSubjectTypeID', 'order'], {})
@Index('rlt_subject_type_id', ['subjectTypeID'], {})
@Index('rlt_relation_type', ['relationType', 'subjectID', 'relatedSubjectID'], {})
@Entity('chii_subject_relations', { schema: 'bangumi' })
export class SubjectRelation {
  @PrimaryColumn('mediumint', {
    name: 'rlt_subject_id',
    comment: '关联主 ID',
    unsigned: true,
  })
  subjectID!: number;

  @PrimaryColumn('tinyint', { name: 'rlt_subject_type_id', unsigned: true })
  subjectTypeID!: number;

  @Column('smallint', {
    name: 'rlt_relation_type',
    comment: '关联类型',
    unsigned: true,
  })
  relationType!: number;

  @Column('mediumint', {
    name: 'rlt_related_subject_id',
    comment: '关联目标 ID',
    unsigned: true,
  })
  relatedSubjectID!: number;

  @Column('tinyint', {
    name: 'rlt_related_subject_type_id',
    comment: '关联目标类型',
    unsigned: true,
  })
  relatedSubjectTypeID!: number;

  /** @deprecated 未使用 */
  @PrimaryColumn('tinyint', { name: 'rlt_vice_versa', unsigned: true })
  viceVersa!: number;

  @Column('tinyint', { name: 'rlt_order', comment: '关联排序', unsigned: true })
  order!: number;

  relatedSubject!: Subject;
}

@Index('sbj_tpc_lastpost', ['updatedAt', 'parentID', 'display'], {})
@Index('tpc_display', ['display'], {})
@Index('sbj_tpc_uid', ['creatorID'], {})
@Index('tpc_subject_id', ['parentID'], {})
@Entity('chii_subject_topics', { schema: 'bangumi' })
export class SubjectTopic {
  @PrimaryGeneratedColumn({
    type: 'mediumint',
    name: 'sbj_tpc_id',
    unsigned: true,
  })
  id!: number;

  @Column('mediumint', { name: 'sbj_tpc_subject_id', unsigned: true })
  parentID!: number;

  @Column('mediumint', { name: 'sbj_tpc_uid', unsigned: true })
  creatorID!: number;

  @Column('varchar', { name: 'sbj_tpc_title', length: 80, transformer: htmlEscapedString })
  title!: string;

  @Column('int', {
    name: 'sbj_tpc_dateline',
    unsigned: true,
    default: () => "'0'",
  })
  createdAt!: number;

  @Column('int', {
    name: 'sbj_tpc_lastpost',
    unsigned: true,
    default: () => "'0'",
  })
  updatedAt!: number;

  @Column('mediumint', {
    name: 'sbj_tpc_replies',
    unsigned: true,
    default: () => "'0'",
  })
  replies!: number;

  @Column('tinyint', { name: 'sbj_tpc_state', unsigned: true })
  state!: number;

  @Column('tinyint', {
    name: 'sbj_tpc_display',
    unsigned: true,
    default: () => "'1'",
  })
  display!: number;

  creator!: User;
}

@Index('pss_topic_id', ['topicID'], {})
@Index('sbj_pst_related', ['related'], {})
@Index('sbj_pst_uid', ['uid'], {})
@Entity('chii_subject_posts', { schema: 'bangumi' })
export class SubjectPost {
  @PrimaryGeneratedColumn({ name: 'sbj_pst_id', type: 'mediumint', unsigned: true })
  id!: number;

  @Column('mediumint', { name: 'sbj_pst_mid', unsigned: true })
  topicID!: number;

  @Column('mediumint', { name: 'sbj_pst_uid', unsigned: true })
  uid!: number;

  @Column('mediumint', { name: 'sbj_pst_related', unsigned: true, default: 0 })
  related!: number;

  @Column('mediumint', { name: 'sbj_pst_content' })
  content!: string;

  @Column('tinyint', { name: 'sbj_pst_state', width: 1, unsigned: true })
  state!: number;

  @Column('int', { name: 'sbj_pst_dateline', unsigned: true, default: 0 })
  dateline!: number;

  creator!: User;
}

@Index('interest_collect_dateline', ['collectDateline'], {})
@Index('interest_id', ['uid', 'private'], {})
@Index('interest_lasttouch', ['lastTouch'], {})
@Index('interest_private', ['private'], {})
@Index('interest_rate', ['rate'], {})
@Index('interest_subject_id', ['subjectID', 'type'], {})
@Index('interest_subject_id_2', ['subjectID'], {})
@Index('interest_subject_type', ['type'], {})
@Index('interest_type', ['type'], {})
@Index('interest_type_2', ['type', 'uid'], {})
@Index('interest_uid', ['uid'], {})
@Index('interest_uid_2', ['uid', 'private', 'lastTouch'], {})
@Index('subject_collect', ['subjectID', 'type', 'private', 'collectDateline'], {})
@Index('subject_comment', ['subjectID', 'hasComment', 'private', 'lastTouch'], {})
@Index('subject_lasttouch', ['subjectID', 'private', 'lastTouch'], {})
@Index('subject_rate', ['type', 'rate', 'private'], {})
@Index('tag_subject_id', ['subjectType', 'type', 'uid'], {})
@Index('top_subject', ['subjectID', 'subjectType', 'doingDateline'], {})
@Index('user_collect_latest', ['subjectType', 'type', 'uid', 'private'], {})
@Index('user_collect_type', ['subjectType', 'type', 'uid', 'private', 'collectDateline'], {})
@Index('user_collects', ['subjectType', 'uid'], {})
@Entity('chii_subject_interests', { schema: 'bangumi' })
export class SubjectInterest {
  @PrimaryGeneratedColumn({ type: 'int', name: 'interest_id', unsigned: true })
  id!: number;

  @Column('mediumint', { name: 'interest_uid', unsigned: true })
  uid!: number;

  @Column('mediumint', { name: 'interest_subject_id', unsigned: true })
  subjectID!: number;

  @Column('smallint', {
    name: 'interest_subject_type',
    unsigned: true,
    default: () => "'0'",
  })
  subjectType!: number;

  @Column('tinyint', {
    name: 'interest_rate',
    unsigned: true,
    default: () => "'0'",
  })
  rate!: number;

  @Column('tinyint', {
    name: 'interest_type',
    unsigned: true,
    default: () => "'0'",
  })
  type!: number;

  @Column('tinyint', { name: 'interest_has_comment', unsigned: true })
  hasComment!: number;

  @Column('mediumtext', { name: 'interest_comment' })
  comment!: string;

  @Column('mediumtext', { name: 'interest_tag' })
  tag!: string;

  @Column('mediumint', {
    name: 'interest_ep_status',
    unsigned: true,
    default: () => "'0'",
  })
  epStatus!: number;

  @Column('mediumint', {
    name: 'interest_vol_status',
    comment: '卷数',
    unsigned: true,
  })
  volStatus!: number;

  @Column('int', { name: 'interest_wish_dateline', unsigned: true })
  wishDateline!: number;

  @Column('int', { name: 'interest_doing_dateline', unsigned: true })
  doingDateline!: number;

  @Column('int', { name: 'interest_collect_dateline', unsigned: true })
  collectDateline!: number;

  @Column('int', { name: 'interest_on_hold_dateline', unsigned: true })
  onHoldDateline!: number;

  @Column('int', { name: 'interest_dropped_dateline', unsigned: true })
  droppedDateline!: number;

  @Column('char', { name: 'interest_create_ip', length: 15 })
  createIp!: string;

  @Column('char', { name: 'interest_lasttouch_ip', length: 15 })
  lastTouchIp!: string;

  @Column('int', {
    name: 'interest_lasttouch',
    unsigned: true,
    default: () => "'0'",
  })
  lastTouch!: number;

  @Column('tinyint', { name: 'interest_private', unsigned: true })
  private!: number;
}
