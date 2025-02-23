import * as php from '@trim21/php-serialize';
import * as lodash from 'lodash-es';
import type { DateTime } from 'luxon';

import { db, incr, op, schema } from '@app/drizzle';
import { siteUrl } from '@app/lib/config.ts';
import { isFriends, parseBlocklist } from '@app/lib/user/utils.ts';

import { NotFoundError, UnreachableError } from './error.ts';

/**
 * `nt_type`
 *
 * Todo 参照下面的 `_settings`
 */
export const enum NotifyType {
  Unknown = 0,
  GroupTopicReply = 1,
  GroupPostReply = 2,
  IndexTopicReply = 3,
  IndexPostReply = 4,
  CharacterTopicReply = 5,
  CharacterPostReply = 6,
  SubjectTopicReply = 7,
  SubjectPostReply = 8,
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

const enum PrivacyFilter {
  All = 0,
  Friends = 1,
  None = 2,
}

interface Creation {
  destUserID: number;
  sourceUserID: number;
  now: DateTime;
  type: NotifyType;
  /** 对应回帖所对应 post id */
  postID: number;
  /** 帖子 id, 章节 id ... */
  topicID: number;
  title: string;
}

export interface INotify {
  id: number;
  type: NotifyType;
  createdAt: number;
  fromUid: number;
  title: string;
  topicID: number;
  postID: number;
  unread: boolean;
}

interface Filter {
  unread?: boolean;
  limit: number;
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

export const Notify = {
  async create({
    destUserID,
    sourceUserID,
    now,
    type,
    postID,
    topicID,
    title,
  }: Creation): Promise<void> {
    if (destUserID === sourceUserID) {
      return;
    }
    const setting = await getUserNotifySetting(destUserID);
    if (setting.blockedUsers.includes(sourceUserID)) {
      return;
    }
    if (setting.CommentNotification === PrivacyFilter.None) {
      return;
    }
    if (setting.CommentNotification === PrivacyFilter.Friends) {
      const isFriend = await isFriends(destUserID, sourceUserID);
      if (!isFriend) {
        return;
      }
    }
    const hash = hashType(type);
    let fieldID = 0;
    const [field] = await db
      .select()
      .from(schema.chiiNotifyField)
      .where(
        op.and(
          op.eq(schema.chiiNotifyField.hash, hash),
          op.eq(schema.chiiNotifyField.rid, topicID),
        ),
      )
      .limit(1);
    if (field) {
      fieldID = field.id;
    } else {
      const [result] = await db.insert(schema.chiiNotifyField).values({
        title,
        hash,
        rid: topicID,
      });
      fieldID = result.insertId;
    }
    await db.transaction(async (t) => {
      await t.insert(schema.chiiNotify).values({
        uid: destUserID,
        fromUID: sourceUserID,
        unread: true,
        createdAt: now.toUnixInteger(),
        type,
        mid: fieldID,
        related: postID,
      });
      await t
        .update(schema.chiiUsers)
        .set({ newNotify: incr(schema.chiiUsers.newNotify) })
        .where(op.eq(schema.chiiUsers.id, destUserID));
    });
  },

  async markAllAsRead(userID: number, ids?: number[]): Promise<void> {
    await db.transaction(async (t) => {
      await t
        .update(schema.chiiNotify)
        .set({ unread: false })
        .where(
          op.and(
            op.eq(schema.chiiNotify.uid, userID),
            op.eq(schema.chiiNotify.unread, true),
            ids ? op.inArray(schema.chiiNotify.id, ids) : undefined,
          ),
        );
      const [{ count = 0 } = {}] = await t
        .select({ count: op.count(schema.chiiNotify.id) })
        .from(schema.chiiNotify)
        .where(op.and(op.eq(schema.chiiNotify.uid, userID), op.eq(schema.chiiNotify.unread, true)));
      await t
        .update(schema.chiiUsers)
        .set({ newNotify: count })
        .where(op.eq(schema.chiiUsers.id, userID));
    });
  },

  async count(userID: number): Promise<number> {
    const [user] = await db
      .select()
      .from(schema.chiiUsers)
      .where(op.eq(schema.chiiUsers.id, userID));
    return user?.newNotify ?? 0;
  },

  async list(userID: number, { unread, limit = 30 }: Filter): Promise<INotify[]> {
    const conditions = [op.eq(schema.chiiNotify.uid, userID)];
    if (unread !== undefined) {
      conditions.push(op.eq(schema.chiiNotify.unread, unread));
    }
    const notifications = await db
      .select()
      .from(schema.chiiNotify)
      .where(op.and(...conditions))
      .orderBy(op.desc(schema.chiiNotify.createdAt))
      .limit(limit);
    if (notifications.length === 0) {
      return [];
    }
    const fieldIDs = lodash.uniq(notifications.map((x) => x.mid));
    const fields = await db
      .select()
      .from(schema.chiiNotifyField)
      .where(op.inArray(schema.chiiNotifyField.id, fieldIDs));
    const fieldMap = Object.fromEntries(fields.map((x) => [x.id, x]));
    return notifications.map((x) => {
      const field = fieldMap[x.mid];
      return {
        id: x.id,
        type: x.type,
        createdAt: x.createdAt,
        fromUid: x.fromUID,
        title: field?.title ?? '',
        topicID: field?.rid ?? 0,
        postID: x.related,
        unread: x.unread,
      } satisfies INotify;
    });
  },
};

async function getUserNotifySetting(userID: number): Promise<PrivacySetting> {
  const [uf] = await db
    .select()
    .from(schema.chiiUserFields)
    .where(op.eq(schema.chiiUserFields.uid, userID));
  if (!uf) {
    throw new NotFoundError('user not found');
  }

  const field = php.parse(uf.privacy) as Record<number, number>;

  return {
    PrivateMessage: field[UserPrivacyReceivePrivateMessage] as PrivacyFilter,
    TimelineReply: field[UserPrivacyReceiveTimelineReply] as PrivacyFilter,
    MentionNotification: field[UserPrivacyReceiveMentionNotification] as PrivacyFilter,
    CommentNotification: field[UserPrivacyReceiveCommentNotification] as PrivacyFilter,
    blockedUsers: parseBlocklist(uf.blocklist),
  };
}

/** 计算 notifyField 的 hash 字段，参照 settings */
function hashType(t: NotifyType): number {
  const setting = _settings[t];
  if (!setting) {
    throw new UnreachableError(`missing setting for notify type ${t}`);
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
    url: `${siteUrl}/group/topic`,
    url_mobile: 'MOBILE_URL/topic/group/',
    anchor: '#post_',
    prefix: '在你的小组话题',
    suffix: '中发表了新回复',
    id: 1,
    hash: 1,
    merge: 1,
  },
  2: {
    url: `${siteUrl}/group/topic`,
    url_mobile: 'MOBILE_URL/topic/group/',
    anchor: '#post_',
    prefix: '在小组话题',
    suffix: '中回复了你',
    id: 2,
    hash: 1,
    merge: 1,
  },
  3: {
    url: `${siteUrl}/subject/topic`,
    url_mobile: '/topic/subject',
    anchor: '#post_',
    prefix: '在你的条目讨论',
    suffix: '中发表了新回复',
    id: 3,
    hash: 3,
    merge: 1,
  },
  4: {
    url: `${siteUrl}/subject/topic/`,
    url_mobile: 'MOBILE_URL/topic/subject/',
    anchor: '#post_',
    prefix: '在条目讨论',
    suffix: '中回复了你',
    id: 4,
    hash: 3,
    merge: 1,
  },
  5: {
    url: `${siteUrl}/character/`,
    url_mobile: 'MOBILE_URL/topic/crt/',
    anchor: '#post_',
    prefix: '在角色讨论',
    suffix: '中发表了新回复',
    id: 5,
    hash: 5,
    merge: 1,
  },
  6: {
    url: `${siteUrl}/character/`,
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
    url: `${siteUrl}/blog/`,
    anchor: '#post_',
    prefix: '在日志',
    suffix: '中回复了你',
    id: 8,
    hash: 7,
    merge: 1,
  },
  '9': {
    url: `${siteUrl}/subject/ep/`,
    url_mobile: 'MOBILE_URL/topic/ep/',
    anchor: '#post_',
    prefix: '在章节讨论',
    suffix: '中发表了新回复',
    id: 9,
    hash: 9,
    merge: 1,
  },
  '10': {
    url: `${siteUrl}/subject/ep/`,
    url_mobile: 'MOBILE_URL/topic/ep/',
    anchor: '#post_',
    prefix: '在章节讨论',
    suffix: '中回复了你',
    id: 10,
    hash: 9,
    merge: 1,
  },
  '11': {
    url: `${siteUrl}/index/`,
    anchor: '#post_',
    append: '/comments',
    prefix: '在目录',
    suffix: '中给你留言了',
    id: 11,
    hash: 11,
    merge: 1,
  },
  '12': {
    url: `${siteUrl}/index/`,
    anchor: '#post_',
    append: '/comments',
    prefix: '在目录',
    suffix: '中回复了你',
    id: 12,
    hash: 11,
    merge: 1,
  },
  '13': {
    url: `${siteUrl}/person/`,
    url_mobile: 'MOBILE_URL/topic/prsn/',
    anchor: '#post_',
    prefix: '在人物',
    suffix: '中回复了你',
    id: 13,
    hash: 13,
    merge: 1,
  },
  '14': {
    url: `${siteUrl}/user/`,
    anchor: '#',
    prefix: '请求与你成为好友',
    suffix: '',
    id: 14,
    hash: 14,
  },
  '15': {
    url: `${siteUrl}/user/`,
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
    url: `${siteUrl}/user/chobits_user/timeline/status/`,
    anchor: '#post_',
    prefix: '回复了你的 <a href="%2$s%3$s" class="nt_link link_%4$s" target="_blank">吐槽</a>',
    suffix: '',
    id: 22,
    hash: 22,
    merge: 1,
  },
  '23': {
    url: `${siteUrl}/group/topic/`,
    url_mobile: 'MOBILE_URL/topic/group/',
    anchor: '#post_',
    prefix: '在小组话题',
    suffix: '中提到了你',
    id: 23,
    hash: 1,
    merge: 1,
  },
  '24': {
    url: `${siteUrl}/subject/topic/`,
    url_mobile: 'MOBILE_URL/topic/subject/',
    anchor: '#post_',
    prefix: '在条目讨论',
    suffix: '中提到了你',
    id: 24,
    hash: 3,
    merge: 1,
  },
  '25': {
    url: `${siteUrl}/character/`,
    url_mobile: 'MOBILE_URL/topic/crt/',
    anchor: '#post_',
    prefix: '在角色',
    suffix: '中提到了你',
    id: 25,
    hash: 5,
    merge: 1,
  },
  '26': {
    url: `${siteUrl}/person/`,
    url_mobile: 'MOBILE_URL/topic/prsn/',
    anchor: '#post_',
    prefix: '在人物讨论',
    suffix: '中提到了你',
    id: 26,
    hash: 5,
    merge: 1,
  },
  '27': {
    url: `${siteUrl}/index/`,
    anchor: '#post_',
    append: '/comments',
    prefix: '在目录',
    suffix: '中提到了你',
    id: 28,
    hash: 11,
    merge: 1,
  },
  '28': {
    url: `${siteUrl}/user/chobits_user/timeline/status/`,
    anchor: '#post_',
    prefix: '在',
    suffix: '中提到了你',
    id: 28,
    hash: 22,
    merge: 1,
  },
  '29': {
    url: `${siteUrl}/blog/`,
    anchor: '#post_',
    prefix: '在日志',
    suffix: '中提到了你',
    id: 29,
    hash: 7,
    merge: 1,
  },
  '30': {
    url: `${siteUrl}/subject/ep/`,
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
