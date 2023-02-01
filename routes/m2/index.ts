import { Type as t } from '@sinclair/typebox';

import * as orm from '@app/lib/orm';
import * as res from '@app/lib/types/res';
import { handleTopicDetail } from '@app/routes/private/routes/topic';
import type { App } from '@app/routes/type';

/* eslint-disable-next-line @typescript-eslint/require-await */
export async function setup(app: App) {
  app.get(
    '/',
    {
      schema: {
        hide: true,
      },
    },
    async ({ query }, res) => {
      const { type = 'group' } = query as { type?: string };
      if (type && !expectedTypes.has(type)) {
        return res.redirect('/m2');
      }

      const data = { type, items: await fetchRecentGroupTopic() };

      return res.view('m/index', data);
    },
  );

  app.get(
    '/topic/group/:topicID',
    {
      schema: {
        hide: true,
        params: t.Object({
          topicID: t.Integer({ exclusiveMinimum: 0 }),
        }),
      },
    },
    async ({ params: { topicID }, auth }, res) => {
      const topic = await handleTopicDetail({ params: { id: topicID }, auth });

      await res.view('m/group-topic', topic);
    },
  );
}

const expectedTypes = new Set(['group', 'subject', 'ep', 'mono']);

export interface Item {
  id: number;
  type: 'subject' | 'group';
  author: {
    nickname: string;
    username: string;
    avatar: string;
  };
  count: number;
  title: string;

  time: string;

  // 小组名/条目名
  name: string;
  // 小组 id 不一定是 int
  parentID: string;
}

async function fetchRecentGroupTopic(): Promise<Item[]> {
  const now = Date.now() / 1000;
  const topics = await orm.GroupTopicRepo.find({
    take: 40,
    order: {
      dateline: 'desc',
    },
  });

  const groups = await orm.fetchGroups(topics.map((x) => x.gid));
  const users = await orm.fetchUsers(topics.map((x) => x.creatorID));

  return topics
    .map(function (t): Item | undefined {
      const user = users[t.creatorID];
      if (!user) {
        return;
      }
      const group = groups[t.gid];
      if (!group) {
        return;
      }

      return {
        type: 'group',
        id: t.id,
        count: t.replies,
        title: t.title,
        time: formatRelativeTime(now - t.dateline),
        author: {
          nickname: user.nickname,
          username: user.username,
          avatar: res.toResUser(user).avatar.large,
        },
        name: group.title,
        parentID: group.name,
      } satisfies Item;
    })
    .filter(function (e): e is Item {
      return e !== undefined;
    });
}

function formatRelativeTime(seconds: number): string {
  if (seconds < 60) {
    // Less than a minute has passed:
    return `${seconds} seconds ago`;
  } else if (seconds < 3600) {
    // Less than an hour has passed:
    return `${Math.floor(seconds / 60)} minutes ago`;
  } else if (seconds < 86400) {
    // Less than a day has passed:
    return `${Math.floor(seconds / 3600)} hours ago`;
  } else if (seconds < 2620800) {
    // Less than a month has passed:
    return `${Math.floor(seconds / 86400)} days ago`;
  } else if (seconds < 31449600) {
    // Less than a year has passed:
    return `${Math.floor(seconds / 2620800)} months ago`;
  }
  // More than a year has passed:
  return `${Math.floor(seconds / 31449600)} years ago`;
}
