import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

import { htmlEscapedString } from '@app/lib/orm/transformer.ts';

@Entity('chii_groups', { schema: 'bangumi' })
export class Group {
  @PrimaryGeneratedColumn({ type: 'smallint', name: 'grp_id', unsigned: true })
  id!: number;

  @Column('smallint', { name: 'grp_cat', unsigned: true, default: () => "'0'" })
  cat!: number;

  @Column('char', { name: 'grp_name', length: 50 })
  name!: string;

  @Column('char', { name: 'grp_title', length: 50 })
  title!: string;

  @Column('varchar', { name: 'grp_icon', length: 255 })
  icon!: string;

  @Column('mediumint', {
    name: 'grp_creator',
    unsigned: true,
    default: () => "'0'",
  })
  grpCreator!: number;

  @Column('mediumint', {
    name: 'grp_topics',
    unsigned: true,
    default: () => "'0'",
  })
  grpTopics!: number;

  @Column('mediumint', {
    name: 'grp_posts',
    unsigned: true,
    default: () => "'0'",
  })
  grpPosts!: number;

  @Column('mediumint', {
    name: 'grp_members',
    unsigned: true,
    default: () => "'1'",
  })
  memberCount!: number;

  @Column('text', { name: 'grp_desc' })
  description!: string;

  @Column('int', { name: 'grp_lastpost', unsigned: true })
  lastPost!: number;

  @Column('int', { name: 'grp_builddate', unsigned: true })
  builddate!: number;

  @Column('tinyint', {
    name: 'grp_accessible',
    comment: '可访问性',
    width: 1,
    default: () => "'1'",
  })
  accessible!: boolean;

  @Column('tinyint', { name: 'grp_nsfw', unsigned: true })
  nsfw!: boolean;
}

@Entity('chii_group_members', { schema: 'bangumi' })
export class GroupMembers {
  @Column('mediumint', { primary: true, name: 'gmb_uid', default: () => "'0'" })
  gmbUid!: number;

  @Column('smallint', { primary: true, name: 'gmb_gid', default: () => "'0'" })
  gmbGid!: number;

  @Column('tinyint', { name: 'gmb_moderator', width: 1, default: () => "'0'" })
  gmbModerator!: boolean;

  @Column('int', { name: 'gmb_dateline', unsigned: true, default: () => "'0'" })
  gmbDateline!: number;
}

@Index('grp_tpc_gid', ['parentID'], {})
@Index('grp_tpc_display', ['display'], {})
@Index('grp_tpc_uid', ['creatorID'], {})
@Index('grp_tpc_lastpost', ['updatedAt'], {})
@Entity('chii_group_topics', { schema: 'bangumi' })
export class GroupTopic {
  @PrimaryGeneratedColumn({
    type: 'mediumint',
    name: 'grp_tpc_id',
    unsigned: true,
  })
  id!: number;

  @Column('mediumint', { name: 'grp_tpc_gid', unsigned: true })
  parentID!: number;

  @Column('mediumint', { name: 'grp_tpc_uid', unsigned: true })
  creatorID!: number;

  @Column('varchar', { name: 'grp_tpc_title', length: 80, transformer: htmlEscapedString })
  title!: string;

  @Column('int', {
    name: 'grp_tpc_dateline',
    unsigned: true,
    default: () => "'0'",
  })
  createdAt!: number;

  @Column('int', {
    name: 'grp_tpc_lastpost',
    unsigned: true,
    default: () => "'0'",
  })
  updatedAt!: number;

  @Column('mediumint', {
    name: 'grp_tpc_replies',
    unsigned: true,
    default: () => "'0'",
  })
  replies!: number;

  @Column('tinyint', { name: 'grp_tpc_state', unsigned: true })
  state!: number;

  @Column('tinyint', {
    name: 'grp_tpc_display',
    unsigned: true,
    default: () => "'1'",
  })
  display!: number;
}

@Index('pss_topic_id', ['topicID'], {})
@Index('grp_pst_related', ['related'], {})
@Index('grp_pst_uid', ['uid'], {})
@Entity('chii_group_posts', { schema: 'bangumi' })
export class GroupPost {
  @PrimaryGeneratedColumn({
    type: 'mediumint',
    name: 'grp_pst_id',
    unsigned: true,
  })
  id!: number;

  @Column('mediumint', { name: 'grp_pst_mid', unsigned: true })
  topicID!: number;

  @Column('mediumint', { name: 'grp_pst_uid', unsigned: true })
  uid!: number;

  @Column('mediumint', {
    name: 'grp_pst_related',
    comment: '关联回复ID',
    unsigned: true,
    default: () => "'0'",
  })
  related!: number;

  @Column('mediumtext', { name: 'grp_pst_content' })
  content!: string;

  @Column('tinyint', { name: 'grp_pst_state', unsigned: true })
  state!: number;

  @Column('int', {
    name: 'grp_pst_dateline',
    unsigned: true,
    default: () => "'0'",
  })
  dateline!: number;
}
