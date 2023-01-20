import config from '@app/lib/config';
import type { App } from '@app/lib/rest/type';
import { DateTime, Duration } from 'luxon';
import * as console from 'console';

export async function setup(app: App) {
  app.get(
    '/',
    {
      schema: {
        hide: true,
      },
    },
    async ({ query, auth }, res) => {
      const { type = '' } = query as { type?: string };
      if (type) {
        if (!expectedTypes.includes(type)) {
          return res.redirect('/m2');
        }
      }

      const data = { type, items: await fetchRecentGroupTopic() };

      return res.view('m/index', data);
    },
  );
}

const expectedTypes = ['group', 'subject', 'ep', 'mono'];

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

const rtf1 = new Intl.RelativeTimeFormat('en', { style: 'short' });

async function fetchRecentGroupTopic(): Promise<Item[]> {
  return [{
    type: 'subject',
    id: 12331,
    author: {
      nickname: 'gothicgundam',
      username: '11',
      avatar: 'https://lain.bgm.tv/pic/user/l/000/22/85/228529.jpg?r=1619534072',
    },
    count: 10,
    name: '哈',
    parentID: 'qq',
    title: '一个假item',
    time: formatRelativeTime(Duration.fromObject({ day: 3 }).toMillis() / 1000),
  }];
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
