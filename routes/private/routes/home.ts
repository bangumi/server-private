import { DateTime } from 'luxon';
import t from 'typebox';

import { db, op, schema } from '@app/drizzle';
import type { IAuth } from '@app/lib/auth/index.ts';
import { fetchFamousGroups } from '@app/lib/home/famous-group';
import { fetchHotSubjectTopics } from '@app/lib/home/hot-topic';
import {
  fetchProgress,
  type IProgressItem,
  ProgressItem,
  ProgressSubject,
} from '@app/lib/home/progress';
import { logger } from '@app/lib/logger.ts';
import { Security, Tag } from '@app/lib/openapi/index.ts';
import { getTimelineInbox } from '@app/lib/timeline/inbox';
import { fetchTimelineByIDs } from '@app/lib/timeline/item';
import { TopicDisplay } from '@app/lib/topic/type.ts';
import * as fetcher from '@app/lib/types/fetcher.ts';
import * as res from '@app/lib/types/res.ts';
import { fetchJoinedGroups } from '@app/lib/user/utils';
import { requireLogin } from '@app/routes/hooks/pre-handler.ts';
import type { App } from '@app/routes/type.ts';

import { Calendar, CalendarItem, type ICalendarItem } from './calendar.ts';

export const HomeResponse = t.Object(
  {
    progress: t.Array(res.Ref(ProgressItem)),
    timeline: t.Array(res.Ref(res.Timeline)),
    groupTopics: t.Array(res.Ref(res.GroupTopic)),
    famousGroups: t.Array(res.Ref(res.SlimGroup)),
    hotSubjectTopics: t.Array(res.Ref(res.SubjectTopic)),
    calendar: res.Ref(Calendar),
  },
  { $id: 'HomeResponse' },
);

const EMPTY_CALENDAR: Record<number, ICalendarItem[]> = {};

async function fetchGroupTopics(userID: number, allowNsfw: boolean): Promise<res.IGroupTopic[]> {
  const gids = await fetchJoinedGroups(userID);
  if (gids.length === 0) {
    return [];
  }
  const data = await db
    .select({ id: schema.chiiGroupTopics.id })
    .from(schema.chiiGroupTopics)
    .where(
      op.and(
        op.eq(schema.chiiGroupTopics.display, TopicDisplay.Normal),
        op.inArray(schema.chiiGroupTopics.gid, gids),
      ),
    )
    .orderBy(op.desc(schema.chiiGroupTopics.updatedAt))
    .limit(6);
  const tids = data.map((x) => x.id);
  if (tids.length === 0) {
    return [];
  }
  const topics = await fetcher.fetchGroupTopicsByIDs(tids);
  const users = await fetcher.fetchSlimUsersByIDs(
    Object.values(topics).map((topic) => topic.creatorID),
  );
  const groups = await fetcher.fetchSlimGroupsByIDs(
    Object.values(topics).map((topic) => topic.parentID),
    allowNsfw,
  );
  const result: res.IGroupTopic[] = [];
  for (const tid of tids) {
    const topic = topics[tid];
    if (!topic) {
      continue;
    }
    const creator = users[topic.creatorID];
    const group = groups[topic.parentID];
    if (!creator || !group) {
      continue;
    }
    result.push({
      ...topic,
      creator,
      group,
      replies: [],
    });
  }
  return result;
}

async function fetchTimeline(auth: Readonly<IAuth>, limit: number): Promise<res.ITimeline[]> {
  const ids = await getTimelineInbox(auth.userID, limit);
  if (ids.length === 0) {
    return [];
  }
  const result = await fetchTimelineByIDs(auth, ids);
  const items = [];
  for (const tid of ids) {
    const item = result[tid];
    if (item) {
      items.push(item);
    }
  }
  const uids = items.map((v) => v.uid);
  const users = await fetcher.fetchSlimUsersByIDs(uids);
  for (const item of items) {
    item.user = users[item.uid];
  }
  return items;
}

async function fetchCalendar(allowNsfw: boolean): Promise<Record<number, ICalendarItem[]>> {
  const items = await fetcher.fetchSubjectOnAirItems();
  const subjectIDs = items.map((i) => i.id);
  const subjects = await fetcher.fetchSlimSubjectsByIDs(subjectIDs, allowNsfw);
  const result: Record<number, ICalendarItem[]> = {};
  for (const item of items) {
    const subject = subjects[item.id];
    if (!subject) {
      continue;
    }
    const weekday = result[item.weekday] || [];
    weekday.push({
      subject,
      watchers: item.watchers,
    });
    result[item.weekday] = weekday;
  }
  return result;
}

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  app.addSchema(CalendarItem);
  app.addSchema(Calendar);
  app.addSchema(ProgressSubject);
  app.addSchema(ProgressItem);
  app.addSchema(HomeResponse);

  app.get(
    '/me/home',
    {
      schema: {
        summary: '获取登录用户首页数据',
        description:
          '聚合登录用户首页所需的全部数据：进度管理、好友时间线、小组话题、热门小组、热门条目讨论与每日放送。' +
          '各个区块独立计算，单个区块失败时返回空数据，不影响其他区块。',
        operationId: 'getMeHome',
        tags: [Tag.Home],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        response: {
          200: res.Ref(HomeResponse),
        },
      },
      preHandler: [requireLogin('view home page')],
    },
    async ({ auth }) => {
      const startedAt = DateTime.now().toUnixInteger();

      const [progress, timeline, groupTopics, famousGroups, hotSubjectTopics, calendar] =
        await Promise.all([
          fetchProgress(auth.userID, auth.allowNsfw).catch((error) => {
            logger.error(error, 'failed to fetch home progress');
            return [] as IProgressItem[];
          }),
          fetchTimeline(auth, 20).catch((error) => {
            logger.error(error, 'failed to fetch home timeline');
            return [] as res.ITimeline[];
          }),
          fetchGroupTopics(auth.userID, auth.allowNsfw).catch((error) => {
            logger.error(error, 'failed to fetch home group topics');
            return [] as res.IGroupTopic[];
          }),
          fetchFamousGroups().catch((error) => {
            logger.error(error, 'failed to fetch home famous groups');
            return [] as res.ISlimGroup[];
          }),
          fetchHotSubjectTopics(auth.allowNsfw).catch((error) => {
            logger.error(error, 'failed to fetch home hot subject topics');
            return [] as res.ISubjectTopic[];
          }),
          fetchCalendar(auth.allowNsfw).catch((error) => {
            logger.error(error, 'failed to fetch home calendar');
            return EMPTY_CALENDAR;
          }),
        ]);

      logger.info(
        'home page of user %d aggregated in %ds',
        auth.userID,
        DateTime.now().toUnixInteger() - startedAt,
      );

      return { progress, timeline, groupTopics, famousGroups, hotSubjectTopics, calendar };
    },
  );
}
