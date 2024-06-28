import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

import type { Subject } from './subject';

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
