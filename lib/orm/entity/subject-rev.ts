import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Index('rev_subject_id', ['subjectID', 'creatorID'], {})
@Index('rev_type', ['type'], {})
@Index('rev_dateline', ['createdAt'], {})
@Index('rev_creator', ['creatorID', 'id'], {})
@Entity('chii_subject_revisions', { schema: 'bangumi' })
export class SubjectRev {
  @PrimaryGeneratedColumn({ type: 'mediumint', name: 'rev_id', unsigned: true })
  id!: number;

  @Column('tinyint', {
    name: 'rev_type',
    comment: '修订类型',
    unsigned: true,
    default: () => "'1'",
  })
  type!: number;

  @Column('mediumint', { name: 'rev_subject_id', unsigned: true })
  subjectID!: number;

  @Column('smallint', {
    name: 'rev_type_id',
    unsigned: true,
    default: () => "'0'",
  })
  typeID!: number;

  @Column('mediumint', { name: 'rev_creator', unsigned: true })
  creatorID!: number;

  @Column('int', { name: 'rev_dateline', unsigned: true, default: () => "'0'" })
  createdAt!: number;

  @Column('varchar', { name: 'rev_name', length: 80 })
  name!: string;

  @Column('varchar', { name: 'rev_name_cn', length: 80 })
  nameCN!: string;

  @Column('mediumtext', { name: 'rev_field_infobox' })
  infobox!: string;

  @Column('mediumtext', { name: 'rev_field_summary' })
  summary!: string;

  @Column('mediumtext', { name: 'rev_vote_field' })
  revVoteField!: string;

  @Column('mediumint', { name: 'rev_field_eps', unsigned: true })
  eps!: number;

  @Column('varchar', { name: 'rev_edit_summary', length: 200 })
  commitMessage!: string;

  @Column('smallint', { name: 'rev_platform', unsigned: true })
  platform!: number;
}
