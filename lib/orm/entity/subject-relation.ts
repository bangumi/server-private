import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

import type { Subject } from './subject';

@Index('rlt_subject_id', ['subjectId', 'relatedSubjectId', 'viceVersa'], { unique: true })
@Index('rlt_related_subject_type_id', ['relatedSubjectTypeId', 'order'], {})
@Index('rlt_subject_type_id', ['subjectTypeId'], {})
@Index('rlt_relation_type', ['relationType', 'subjectId', 'relatedSubjectId'], {})
@Entity('chii_subject_relations', { schema: 'bangumi' })
export class SubjectRelation {
  @PrimaryColumn('mediumint', {
    name: 'rlt_subject_id',
    comment: '关联主 ID',
    unsigned: true,
  })
  subjectId!: number;

  @PrimaryColumn('tinyint', { name: 'rlt_subject_type_id', unsigned: true })
  subjectTypeId!: number;

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
  relatedSubjectId!: number;

  @Column('tinyint', {
    name: 'rlt_related_subject_type_id',
    comment: '关联目标类型',
    unsigned: true,
  })
  relatedSubjectTypeId!: number;

  /** @deprecated 未使用 */
  @PrimaryColumn('tinyint', { name: 'rlt_vice_versa', unsigned: true })
  viceVersa!: number;

  @Column('tinyint', { name: 'rlt_order', comment: '关联排序', unsigned: true })
  order!: number;

  relatedSubject!: Subject;
}
