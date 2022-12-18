import type { Dayjs } from 'dayjs';
import * as lodash from 'lodash-es';
import * as php from 'php-serialize';

import { UnreachableError } from './errors';
import type * as Prisma from './generated/client';
import * as orm from './orm';
import prisma from './prisma';

/**
 * `nt_type`
 *
 * Todo 参照下面的 `_settings`
 */
export const enum Type {
  Unknown = 0,
  GroupTopicReply = 1,
  GroupPostReply = 2,
  IndexTopicReply = 3,
  IndexPostReply = 4,

  CharacterTopicReply = 5,
  CharacterPostReply = 6,
  _7,
  _8,
  _9,
  _10,
  _11,
  _12,
  _13,
  _14,
  _15,
  _16,
  _17,
  _18,
  _19,
  _20,
  _21,
  _22,
  _23,
  _24,
  _25,
  _26,
  _27,
  _28,
  _29,
  _30,
  _31,
  _32,
  _33,
  _34,
}

interface Creation {
  destUserID: number;
  sourceUserID: number;
  now: Dayjs;
  type: Type;
  /** 对应回帖所对应 post id */
  postID: number;
  /** 帖子 id, 章节 id ... */
  topicID: number;
  title: string;
}

/** Used in transaction */
export async function create(
  t: Prisma.Prisma.TransactionClient,
  { destUserID, sourceUserID, now, type, postID, topicID, title }: Creation,
): Promise<void> {
  if (destUserID === sourceUserID) {
    return;
  }

  const setting = await userNotifySetting(destUserID);

  if (setting.blockedUsers.includes(sourceUserID)) {
    return;
  }

  if (setting.CommentNotification === PrivacyFilter.None) {
    return;
  }

  if (setting.CommentNotification === PrivacyFilter.Friends) {
    const isFriend = await orm.isFriends(destUserID, sourceUserID);

    if (!isFriend) {
      return;
    }
  }

  const hash = hashType(type);
  let notifyField = await t.notifyField.findFirst({ where: { hash, topicID } });

  if (!notifyField) {
    notifyField = await t.notifyField.create({
      data: {
        title: title,
        hash,
        topicID,
      },
    });
  }

  await t.notify.create({
    data: {
      uid: destUserID,
      from_uid: sourceUserID,
      unread: true,
      dateline: now.unix(),
      type,
      notify_field_id: notifyField.id,
      postID,
    },
  });

  const unread = await countNotifyRecord(t, destUserID);

  await t.members.update({
    where: { id: destUserID },
    data: { new_notify: unread },
  });
}

/** @internal 从 notify 表中读取真正的未读通知数量 */
async function countNotifyRecord(
  t: Prisma.Prisma.TransactionClient,
  userID: number,
): Promise<number> {
  return t.notify.count({ where: { uid: userID, unread: true } });
}

/** 从用户表的 new_notify 读取未读通知缓存。 */
export async function count(userID: number): Promise<number> {
  const u = await prisma.members.findFirst({ where: { id: userID } });

  return u?.new_notify ?? 0;
}

export async function markAllAsRead(userID: number, id: number[] | undefined): Promise<void> {
  await prisma.$transaction(async (t) => {
    await t.notify.updateMany({
      where: {
        uid: userID,
        id: id ? { in: id } : undefined,
      },
      data: { unread: false },
    });

    const c = await countNotifyRecord(t, userID);

    await t.members.update({
      where: { id: userID },
      data: { new_notify: c },
    });
  });
}

const enum PrivacyFilter {
  All = 0,
  Friends = 1,
  None = 2,
}

type UserPrivacySettingsField = number;

const UserPrivacyReceivePrivateMessage: UserPrivacySettingsField = 1;
const UserPrivacyReceiveTimelineReply: UserPrivacySettingsField = 30;
const UserPrivacyReceiveMentionNotification: UserPrivacySettingsField = 20;
const UserPrivacyReceiveCommentNotification: UserPrivacySettingsField = 21;

interface PrivacySetting {
  TimelineReply: PrivacyFilter;
  CommentNotification: PrivacyFilter;
  MentionNotification: PrivacyFilter;
  PrivateMessage: PrivacyFilter;

  blockedUsers: number[];
}

async function userNotifySetting(userID: number): Promise<PrivacySetting> {
  const f = await prisma.memberFields.findFirstOrThrow({ where: { uid: userID } });

  const field = php.unserialize(f.privacy) as Record<number, number>;

  return {
    PrivateMessage: field[UserPrivacyReceivePrivateMessage] as PrivacyFilter,
    TimelineReply: field[UserPrivacyReceiveTimelineReply] as PrivacyFilter,
    MentionNotification: field[UserPrivacyReceiveMentionNotification] as PrivacyFilter,
    CommentNotification: field[UserPrivacyReceiveCommentNotification] as PrivacyFilter,
    blockedUsers: f.blocklist
      .split(',')
      .map((x) => x.trim())
      .map((x) => Number.parseInt(x)),
  };
}

export interface INotify {
  id: number;
  type: Type;
  createdAt: number;
  fromUid: number;
  title: string;
  topicID: number;
  postID: number;
}

interface Filter {
  unread?: boolean;
  limit: number;
}

/** 返回通知 */
export async function list(
  userID: number,
  { unread = true, limit = 30 }: Filter,
): Promise<INotify[]> {
  const notifications: Prisma.Notify[] = await prisma.notify.findMany({
    where: { uid: userID, unread },
    orderBy: { dateline: 'desc' },
    take: limit,
  });

  if (notifications.length === 0) {
    return [];
  }

  const fieldIds = lodash.uniq(notifications.map((x) => x.notify_field_id));

  const fields = await prisma.notifyField.findMany({
    where: {
      id: { in: fieldIds },
    },
  });

  const fieldMap = Object.fromEntries(fields.map((x) => [x.id, x]));

  return notifications.map((x) => {
    const field = fieldMap[x.notify_field_id];
    return {
      id: x.id,
      type: x.type,
      createdAt: x.dateline,
      fromUid: x.from_uid,
      title: field?.title ?? '',
      topicID: field?.topicID ?? 0,
      postID: x.postID,
    } satisfies INotify;
  });
}

/** 计算 notifyField 的 hash 字段，参照 settings */
function hashType(t: Type): number {
  const setting = _settings[t];
  if (!setting) {
    throw new UnreachableError('setting in t');
  }

  return setting.hash;
}

interface setting {
  url: string;

  prefix: string;
  suffix: string;

  append?: string;
  url_mobile?: string;
  anchor: string;
  id: number;
  hash: number;
  merge?: number;
}

const _settings: Record<number, setting> = {
  1: {
    url: '/group/topic',
    url_mobile: 'MOBILE_URL/topic/group/',
    anchor: '#post_',
    prefix: '在你的小组话题',
    suffix: '中发表了新回复',
    id: 1,
    hash: 1,
    merge: 1,
  },
  2: {
    url: '/group/topic',
    url_mobile: 'MOBILE_URL/topic/group/',
    anchor: '#post_',
    prefix: '在小组话题',
    suffix: '中回复了你',
    id: 2,
    hash: 1,
    merge: 1,
  },
  3: {
    url: '/subject/topic',
    url_mobile: '/topic/subject',
    anchor: '#post_',
    prefix: '在你的条目讨论',
    suffix: '中发表了新回复',
    id: 3,
    hash: 3,
    merge: 1,
  },
  4: {
    url: 'SITE_URL/subject/topic/',
    url_mobile: 'MOBILE_URL/topic/subject/',
    anchor: '#post_',
    prefix: '在条目讨论',
    suffix: '中回复了你',
    id: 4,
    hash: 3,
    merge: 1,
  },
  5: {
    url: 'SITE_URL/character/',
    url_mobile: 'MOBILE_URL/topic/crt/',
    anchor: '#post_',
    prefix: '在角色讨论',
    suffix: '中发表了新回复',
    id: 5,
    hash: 5,
    merge: 1,
  },
  6: {
    url: 'SITE_URL/character/',
    url_mobile: 'MOBILE_URL/topic/crt/',
    anchor: '#post_',
    prefix: '在角色',
    suffix: '中回复了你',
    id: 6,
    hash: 5,
    merge: 1,
  },
  7: {
    url: '/blog/',
    anchor: '#post_',
    prefix: '在你的日志',
    suffix: '中发表了新回复',
    id: 7,
    hash: 7,
    merge: 1,
  },
  '8': {
    url: 'SITE_URL/blog/',
    anchor: '#post_',
    prefix: '在日志',
    suffix: '中回复了你',
    id: 8,
    hash: 7,
    merge: 1,
  },
  '9': {
    url: 'SITE_URL/subject/ep/',
    url_mobile: 'MOBILE_URL/topic/ep/',
    anchor: '#post_',
    prefix: '在章节讨论',
    suffix: '中发表了新回复',
    id: 9,
    hash: 9,
    merge: 1,
  },
  '10': {
    url: 'SITE_URL/subject/ep/',
    url_mobile: 'MOBILE_URL/topic/ep/',
    anchor: '#post_',
    prefix: '在章节讨论',
    suffix: '中回复了你',
    id: 10,
    hash: 9,
    merge: 1,
  },
  '11': {
    url: 'SITE_URL/index/',
    anchor: '#post_',
    append: '/comments',
    prefix: '在目录',
    suffix: '中给你留言了',
    id: 11,
    hash: 11,
    merge: 1,
  },
  '12': {
    url: 'SITE_URL/index/',
    anchor: '#post_',
    append: '/comments',
    prefix: '在目录',
    suffix: '中回复了你',
    id: 12,
    hash: 11,
    merge: 1,
  },
  '13': {
    url: 'SITE_URL/person/',
    url_mobile: 'MOBILE_URL/topic/prsn/',
    anchor: '#post_',
    prefix: '在人物',
    suffix: '中回复了你',
    id: 13,
    hash: 13,
    merge: 1,
  },
  '14': {
    url: 'SITE_URL/user/',
    anchor: '#',
    prefix: '请求与你成为好友',
    suffix: '',
    id: 14,
    hash: 14,
  },
  '15': {
    url: 'SITE_URL/user/',
    anchor: '#',
    prefix: '通过了你的好友请求',
    suffix: '',
    id: 15,
    hash: 14,
  },
  '17': {
    url: 'DOUJIN_URL/club/topic/',
    anchor: '#post_',
    prefix: '在你的社团讨论',
    suffix: '中发表了新回复',
    id: 17,
    hash: 17,
    merge: 1,
  },
  '18': {
    url: 'DOUJIN_URL/club/topic/',
    anchor: '#post_',
    prefix: '在社团讨论',
    suffix: '中回复了你',
    id: 18,
    hash: 17,
    merge: 1,
  },
  '19': {
    url: 'DOUJIN_URL/subject/',
    anchor: '#post_',
    prefix: '在同人作品',
    suffix: '中回复了你',
    id: 19,
    hash: 19,
    merge: 1,
  },
  '20': {
    url: 'DOUJIN_URL/event/topic/',
    anchor: '#post_',
    prefix: '在你的展会讨论',
    suffix: '中发表了新回复',
    id: 20,
    hash: 20,
    merge: 1,
  },
  '21': {
    url: 'DOUJIN_URL/event/topic/',
    anchor: '#post_',
    prefix: '在展会讨论',
    suffix: '中回复了你',
    id: 21,
    hash: 20,
    merge: 1,
  },
  '22': {
    url: 'SITE_URL/user/chobits_user/timeline/status/',
    anchor: '#post_',
    prefix: '回复了你的 <a href="%2$s%3$s" class="nt_link link_%4$s" target="_blank">吐槽</a>',
    suffix: '',
    id: 22,
    hash: 22,
    merge: 1,
  },
  '23': {
    url: 'SITE_URL/group/topic/',
    url_mobile: 'MOBILE_URL/topic/group/',
    anchor: '#post_',
    prefix: '在小组话题',
    suffix: '中提到了你',
    id: 23,
    hash: 1,
    merge: 1,
  },
  '24': {
    url: 'SITE_URL/subject/topic/',
    url_mobile: 'MOBILE_URL/topic/subject/',
    anchor: '#post_',
    prefix: '在条目讨论',
    suffix: '中提到了你',
    id: 24,
    hash: 3,
    merge: 1,
  },
  '25': {
    url: 'SITE_URL/character/',
    url_mobile: 'MOBILE_URL/topic/crt/',
    anchor: '#post_',
    prefix: '在角色',
    suffix: '中提到了你',
    id: 25,
    hash: 5,
    merge: 1,
  },
  '26': {
    url: 'SITE_URL/person/',
    url_mobile: 'MOBILE_URL/topic/prsn/',
    anchor: '#post_',
    prefix: '在人物讨论',
    suffix: '中提到了你',
    id: 26,
    hash: 5,
    merge: 1,
  },
  '27': {
    url: 'SITE_URL/index/',
    anchor: '#post_',
    append: '/comments',
    prefix: '在目录',
    suffix: '中提到了你',
    id: 28,
    hash: 11,
    merge: 1,
  },
  '28': {
    url: 'SITE_URL/user/chobits_user/timeline/status/',
    anchor: '#post_',
    prefix: '在',
    suffix: '中提到了你',
    id: 28,
    hash: 22,
    merge: 1,
  },
  '29': {
    url: 'SITE_URL/blog/',
    anchor: '#post_',
    prefix: '在日志',
    suffix: '中提到了你',
    id: 29,
    hash: 7,
    merge: 1,
  },
  '30': {
    url: 'SITE_URL/subject/ep/',
    url_mobile: 'MOBILE_URL/topic/ep/',
    anchor: '#post_',
    prefix: '在章节讨论',
    suffix: '中提到了你',
    id: 30,
    hash: 9,
    merge: 1,
  },
  '31': {
    url: 'DOUJIN_URL/club/',
    anchor: '/shoutbox#post_',
    prefix: '在社团',
    suffix: '的留言板中提到了你',
    id: 31,
    hash: 31,
    merge: 1,
  },
  '32': {
    url: 'DOUJIN_URL/club/topic/',
    anchor: '#post_',
    prefix: '在社团讨论',
    suffix: '中提到了你',
    id: 32,
    hash: 17,
    merge: 1,
  },
  '33': {
    url: 'DOUJIN_URL/subject/',
    anchor: '#post_',
    prefix: '在同人作品',
    suffix: '中提到了你',
    id: 33,
    hash: 19,
    merge: 1,
  },
  '34': {
    url: 'DOUJIN_URL/event/topic/',
    anchor: '#post_',
    prefix: '在展会讨论',
    suffix: '中提到了你',
    id: 34,
    hash: 20,
    merge: 1,
  },
};
