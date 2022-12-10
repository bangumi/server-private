import * as php from 'php-serialize';

import { UnexpectedNotFoundError } from './errors';
import { logger } from './logger';
import prisma from './prisma';

interface Page {
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
  };
}

export async function fetchUser(userID: number): Promise<IUser | null> {
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
  };
}

export interface Permission {
  user_list?: boolean;
  manage_user_group?: boolean;
  manage_user_photo?: boolean;
  manage_topic_state?: boolean;
  manage_report?: boolean;
  user_ban?: boolean;
  manage_user?: boolean;
  user_group?: boolean;
  user_wiki_approve?: boolean;
  doujin_subject_erase?: boolean;
  user_wiki_apply?: boolean;
  doujin_subject_lock?: boolean;
  subject_edit?: boolean;
  subject_lock?: boolean;
  subject_refresh?: boolean;
  subject_related?: boolean;
  subject_merge?: boolean;
  subject_erase?: boolean;
  subject_cover_lock?: boolean;
  subject_cover_erase?: boolean;
  mono_edit?: boolean;
  mono_lock?: boolean;
  mono_merge?: boolean;
  mono_erase?: boolean;
  ep_edit?: boolean;
  ep_move?: boolean;
  ep_merge?: boolean;
  ep_lock?: boolean;
  ep_erase?: boolean;
  report?: boolean;
  manage_app?: boolean;
  app_erase?: boolean;
}

export async function fetchPermission(userGroup: number): Promise<Readonly<Permission>> {
  const permission = await prisma.userGroups.findFirst({ where: { usr_grp_id: userGroup } });
  if (!permission) {
    logger.warn("can't find permission for userGroup %d", userGroup);
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

async function fetchUsers(userIDs: number[]): Promise<Record<number, IUser>> {
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
      },
    ]),
  );
}

export interface ITopic {
  id: number;
  parentID: number;
  creatorID: number;
  title: string;
  lastRepliedAt: number;
  repliesCount: number;
}

export async function fetchTopic(
  type: 'group' | 'subject',
  id: number,
  { limit = 30, offset = 0 }: Page,
): Promise<[number, ITopic[]]> {
  if (type === 'group') {
    const total = await prisma.chii_group_topics.count({
      where: { grp_tpc_gid: id },
    });

    const topics = await prisma.chii_group_topics.findMany({
      where: { grp_tpc_gid: id },
      orderBy: { grp_tpc_dateline: 'desc' },
      skip: offset,
      take: limit,
    });

    return [
      total,
      topics.map((x) => {
        return {
          id: x.grp_tpc_id,
          parentID: x.grp_tpc_gid,
          creatorID: x.grp_tpc_uid,
          title: x.grp_tpc_title,
          lastRepliedAt: x.grp_tpc_dateline,
          repliesCount: x.grp_tpc_replies,
        };
      }),
    ];
  }

  const total = await prisma.chii_subject_topics.count({ where: { sbj_tpc_subject_id: id } });

  const topics = await prisma.chii_subject_topics.findMany({
    where: { sbj_tpc_subject_id: id },
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
        lastRepliedAt: x.sbj_tpc_dateline,
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

  return {
    id: subject.subject_id,
  };
}

export async function fetchGroup(name: string) {
  const group = await prisma.chii_groups.findFirst({
    where: { grp_name: name },
  });

  if (!group) {
    return null;
  }

  return {
    id: group.grp_id,
  };
}
