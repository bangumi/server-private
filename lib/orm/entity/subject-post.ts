import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Index('pss_topic_id', ['subjectID'], {})
@Index('sbj_pst_related', ['relatedID'], {})
@Index('sbj_pst_uid', ['userID'], {})
@Entity('chii_subject_posts', { schema: 'bangumi' })
export class SubjectPost {
  @PrimaryGeneratedColumn({ name: 'sbj_pst_id', type: 'mediumint', unsigned: true })
  id!: number;

  @Column('mediumint', { name: 'sbj_pst_mid', unsigned: true })
  subjectID!: number;

  @Column('mediumint', { name: 'sbj_pst_uid', unsigned: true })
  userID!: number;

  @Column('mediumint', { name: 'sbj_pst_related', unsigned: true, default: 0 })
  relatedID!: number;

  @Column('mediumint', { name: 'sbj_pst_content' })
  content!: string;

  @Column('tinyint', { name: 'sbj_pst_state', width: 1, unsigned: true })
  state!: number;

  @Column('int', { name: 'sbj_pst_dateline', unsigned: true, default: 0 })
  dateline!: number;
}
