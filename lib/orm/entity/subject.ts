import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Index('subject_name_cn', ['subjectNameCn'], {})
@Index('subject_platform', ['platform'], {})
@Index('subject_creator', ['subjectCreator'], {})
@Index('subject_series', ['subjectSeries'], {})
@Index('subject_series_entry', ['subjectSeriesEntry'], {})
@Index('subject_airtime', ['subjectAirtime'], {})
@Index('subject_ban', ['subjectBan'], {})
@Index('subject_idx_cn', ['subjectIdxCn', 'subjectTypeId'], {})
@Index('subject_type_id', ['subjectTypeId'], {})
@Index('subject_name', ['subjectName'], {})
@Index(
  'order_by_name',
  ['subjectBan', 'subjectTypeId', 'subjectSeries', 'platform', 'subjectName'],
  {},
)
@Index('browser', ['subjectBan', 'subjectTypeId', 'subjectSeries', 'platform'], {})
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
  subjectTypeId!: number;

  @Column('varchar', { name: 'subject_name', length: 80 })
  subjectName!: string;

  @Column('varchar', { name: 'subject_name_cn', length: 80 })
  subjectNameCn!: string;

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
  subjectDateline!: number;

  @Column('varchar', { name: 'subject_image', length: 255 })
  subjectImage!: string;

  @Column('smallint', {
    name: 'subject_platform',
    unsigned: true,
    default: () => "'0'",
  })
  platform!: number;

  @Column('mediumtext', { name: 'field_infobox' })
  fieldInfobox!: string;

  @Column('mediumtext', { name: 'field_summary', comment: 'summary' })
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

  @Column('tinyint', { name: 'subject_nsfw', width: 1 })
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
}

@Index('sort_id', ['fieldTid'], {})
@Index('subject_airtime', ['fieldAirtime'], {})
@Index('field_rank', ['fieldRank'], {})
@Index('field_date', ['fieldDate'], {})
@Index('field_year_mon', ['fieldYear', 'fieldMon'], {})
@Index('field_year', ['fieldYear'], {})
@Index('query_date', ['subject_id', 'fieldDate'], {})
@Entity('chii_subject_fields', { schema: 'bangumi' })
export class SubjectFields {
  @PrimaryGeneratedColumn({
    type: 'mediumint',
    name: 'field_sid',
    unsigned: true,
  })
  subject_id!: number;

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
  fieldYear!: number;

  @Column('tinyint', { name: 'field_mon', comment: '放送月份' })
  fieldMon!: number;

  @Column('tinyint', {
    name: 'field_week_day',
    comment: '放送日(星期X)',
    width: 1,
  })
  fieldWeekDay!: boolean;

  @Column('date', { name: 'field_date', comment: '放送日期' })
  fieldDate!: string;

  @Column('mediumint', {
    name: 'field_redirect',
    unsigned: true,
    default: () => "'0'",
  })
  fieldRedirect!: number;
}
