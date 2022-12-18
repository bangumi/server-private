import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

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
  lastpost!: number;

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
