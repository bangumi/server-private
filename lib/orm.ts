import dayjs from 'dayjs';
import * as php from 'php-serialize';

import type { TopicDisplay } from './auth/rule';
import { UnexpectedNotFoundError } from './errors';
import { logger } from './logger';
import prisma from './prisma';
import type { ReplyState } from './topic';

export interface Page {
  limit?: number;
  offset?: number;
}

export interface IUser {
  id: number;
  username: string;
  nickname: string;
  groupID: number;
  img: string;
  regTime: number;
  sign: string;
}

export async function fetchUserByUsername(username: string): Promise<IUser | null> {
  const user = await prisma.members.findFirst({
    where: { username },
  });

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    nickname: user.nickname,
    username: user.username,
    img: user.avatar,
    groupID: user.groupid,
    regTime: user.regdate,
    sign: user.sign,
  };
}

export async function fetchUser(userID: number): Promise<IUser | null> {
  if (!userID) {
    throw new Error(`undefined user id ${userID}`);
  }
  const user = await prisma.members.findFirst({
    where: { id: userID },
  });

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    nickname: user.nickname,
    username: user.username,
    img: user.avatar,
    groupID: user.groupid,
    regTime: user.regdate,
    sign: user.sign,
  };
}

export interface Permission {
  app_erase?: boolean;
  ban_post?: boolean;
  ban_visit?: boolean;
  doujin_subject_erase?: boolean;
  doujin_subject_lock?: boolean;
  ep_edit?: boolean;
  ep_erase?: boolean;
  ep_lock?: boolean;
  ep_merge?: boolean;
  ep_move?: boolean;
  manage_app?: boolean;
  manage_report?: boolean;
  manage_topic_state?: boolean;
  manage_user?: boolean;
  manage_user_group?: boolean;
  manage_user_photo?: boolean;
  mono_edit?: boolean;
  mono_erase?: boolean;
  mono_lock?: boolean;
  mono_merge?: boolean;
  report?: boolean;
  subject_cover_erase?: boolean;
  subject_cover_lock?: boolean;
  subject_edit?: boolean;
  subject_erase?: boolean;
  subject_lock?: boolean;
  subject_merge?: boolean;
  subject_refresh?: boolean;
  subject_related?: boolean;
  user_ban?: boolean;
  user_group?: boolean;
  user_list?: boolean;
  user_wiki_apply?: boolean;
  user_wiki_approve?: boolean;
}

export async function fetchPermission(userGroup: number): Promise<Readonly<Permission>> {
  const permission = await prisma.userGroups.findFirst({ where: { usr_grp_id: userGroup } });
  if (!permission) {
    logger.warn("can't find permission for userGroup %d", userGroup);
    return {};
  }

  if (!permission.usr_grp_perm) {
    return {};
  }

  return Object.freeze(
    Object.fromEntries(
      Object.entries(
        php.unserialize(permission.usr_grp_perm) as Record<keyof Permission, string>,
      ).map(([key, value]) => [key, value === '1']),
    ),
  );
}

export async function addCreator<T extends { creatorID: number }>(
  arr: T[],
): Promise<(T & { creator: IUser })[]> {
  const users = await fetchUsers(arr.map((x) => x.creatorID));

  return arr.map((o) => {
    const user = users[o.creatorID];
    if (!user) {
      throw new UnexpectedNotFoundError(`user ${o.creatorID}`);
    }

    return { ...o, creator: user };
  });
}

export async function fetchUsers(userIDs: number[]): Promise<Record<number, IUser>> {
  if (userIDs.length === 0) {
    return {};
  }

  const users = await prisma.members.findMany({
    where: { id: { in: userIDs } },
  });

  return Object.fromEntries(
    users.map((user) => [
      user.id,
      {
        id: user.id,
        nickname: user.nickname,
        username: user.username,
        img: user.avatar,
        groupID: user.groupid,
        regTime: user.regdate,
        sign: user.sign,
        user_group: user.groupid,
      },
    ]),
  );
}

export interface ITopic {
  id: number;
  parentID: number;
  creatorID: number;
  updatedAt: number;
  createdAt: number;
  title: string;
  repliesCount: number;
}

export async function fetchTopicList(
  type: 'group' | 'subject',
  id: number,
  { limit = 30, offset = 0 }: Page,
  { display }: { display: TopicDisplay[] },
): Promise<[number, ITopic[]]> {
  if (type === 'group') {
    const where = {
      gid: id,
      display: { in: display },
    } as const;

    const total = await prisma.groupTopics.count({ where });
    const topics = await prisma.groupTopics.findMany({
      where,
      orderBy: { dateline: 'desc' },
      skip: offset,
      take: limit,
    });

    return [
      total,
      topics.map((x) => {
        return {
          id: x.id,
          parentID: x.gid,
          creatorID: x.uid,
          title: x.title,
          createdAt: x.dateline,
          updatedAt: x.lastpost,
          repliesCount: x.replies,
        };
      }),
    ];
  }

  const where = { sbj_tpc_subject_id: id, sbj_tpc_display: { in: display } } as const;
  const total = await prisma.chii_subject_topics.count({ where });

  const topics = await prisma.chii_subject_topics.findMany({
    where,
    orderBy: { sbj_tpc_dateline: 'desc' },
    skip: offset,
    take: limit,
  });

  return [
    total,
    topics.map((x) => {
      return {
        id: x.sbj_tpc_id,
        parentID: x.sbj_tpc_subject_id,
        creatorID: x.sbj_tpc_uid,
        title: x.sbj_tpc_title,
        updatedAt: x.sbj_tpc_dateline,
        createdAt: x.sbj_tpc_lastpost,
        repliesCount: x.sbj_tpc_replies,
      };
    }),
  ];
}

export async function fetchSubject(id: number) {
  const subject = await prisma.subjects.findFirst({
    where: { subject_id: id },
  });

  if (!subject) {
    return null;
  }

  const f = await prisma.subjectFields.findFirst({
    where: { subject_id: id },
  });

  if (!f) {
    throw new UnexpectedNotFoundError(`subject fields ${id}`);
  }

  return {
    id: subject.subject_id,
    nsfw: subject.subject_nsfw,
    redirect: f.field_redirect,
  };
}

interface IGroup {
  id: number;
  name: string;
  nsfw: boolean;
  description: string;
  title: string;
  createdAt: number;
  totalMembers: number;
  icon: string;
  accessible: boolean;
}

export async function fetchGroupByID(id: number): Promise<IGroup | null> {
  const group = await prisma.chii_groups.findFirst({
    where: { grp_id: id },
  });

  if (!group) {
    return null;
  }

  return {
    id: group.grp_id,
    name: group.grp_name,
    title: group.grp_title,
    nsfw: group.grp_nsfw,
    description: group.grp_desc,
    createdAt: group.grp_builddate,
    icon: group.grp_icon,
    totalMembers: group.grp_members,
    accessible: group.grp_accessible,
  } satisfies IGroup;
}

export async function fetchGroup(name: string): Promise<IGroup | null> {
  const group = await prisma.chii_groups.findFirst({
    where: { grp_name: name },
  });

  if (!group) {
    return null;
  }

  return {
    id: group.grp_id,
    name: group.grp_name,
    title: group.grp_title,
    nsfw: group.grp_nsfw,
    description: group.grp_desc,
    icon: group.grp_icon,
    createdAt: group.grp_builddate,
    totalMembers: group.grp_members,
    accessible: group.grp_accessible,
  } satisfies IGroup;
}

interface IBaseReply {
  id: number;
  text: string;
  creatorID: number;
  state: number;
  createdAt: number;
}

interface ISubReply extends IBaseReply {
  repliedTo: number;
}

export interface IReply extends IBaseReply {
  replies: ISubReply[];
}

interface ITopicDetails {
  id: number;
  title: string;
  text: string;
  state: number;
  createdAt: number;
  creatorID: number;
  // group ID or subject ID
  parentID: number;
  replies: IReply[];
}

export async function fetchTopicDetails(type: 'group', id: number): Promise<ITopicDetails | null> {
  const topic = await prisma.groupTopics.findFirst({
    where: { id: id },
  });

  if (!topic) {
    return null;
  }

  const replies = await prisma.groupPosts.findMany({
    where: {
      mid: topic.id,
    },
  });

  const top = replies.shift();
  if (!top) {
    throw new UnexpectedNotFoundError(`top reply of topic(${type}) ${id}`);
  }

  const subReplies: Record<number, ISubReply[]> = {};

  for (const x of replies.filter((x) => x.related !== 0)) {
    const sub: ISubReply = {
      id: x.id,
      repliedTo: x.related,
      creatorID: x.uid,
      text: x.content,
      state: x.state,
      createdAt: x.dateline,
    };

    subReplies[x.related] ??= [];
    subReplies[x.related]?.push(sub);
  }

  const topLevelReplies = replies
    .filter((x) => x.related === 0)
    .map(function (x): IReply {
      return {
        id: x.id,
        replies: subReplies[x.id] ?? ([] as ISubReply[]),
        creatorID: x.uid,
        text: x.content,
        state: x.state,
        createdAt: x.dateline,
      };
    });

  return {
    id: topic.id,
    title: topic.title,
    parentID: topic.gid,
    text: top.content,
    state: topic.state,
    replies: topLevelReplies,
    creatorID: top.uid,
    createdAt: top.dateline,
  } satisfies ITopicDetails;
}

export async function fetchFriends(id?: number): Promise<Record<number, boolean>> {
  if (!id) {
    return {};
  }

  const friends = await prisma.friends.findMany({
    where: { frd_uid: id },
  });

  return Object.fromEntries(friends.map((x) => [x.frd_fid, true]));
}

interface PostCreation {
  title: string;
  content: string;
  groupID: number;
  userID: number;
  display: TopicDisplay;
  state: ReplyState;
}

export async function createPostInGroup(post: PostCreation): Promise<{ id: number }> {
  const now = dayjs();

  return await prisma.$transaction(async (t) => {
    const topic = await t.groupTopics.create({
      data: {
        title: post.title,
        gid: post.groupID,
        uid: post.userID,
        state: post.state,
        lastpost: now.unix(),
        dateline: now.unix(),
        replies: 0,
        display: post.display,
      },
    });

    await t.groupPosts.create({
      data: {
        mid: topic.id,
        dateline: now.unix(),
        state: post.state,
        uid: post.userID,
        content: post.content,
        related: 0,
      },
    });

    return { id: topic.id };
  });
}

export async function isMemberInGroup(gid: number, uid: number): Promise<boolean> {
  const inGroup = await prisma.groupMembers.findFirst({
    where: { gmb_gid: gid, gmb_uid: uid },
  });

  return Boolean(inGroup);
}

export async function fetchUserX(id: number): Promise<IUser> {
  const u = await fetchUser(id);
  if (!u) {
    throw new UnexpectedNotFoundError(`user ${id}`);
  }

  return u;
}
