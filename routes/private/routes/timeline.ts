import { Type as t } from '@sinclair/typebox';

import { Security, Tag } from '@app/lib/openapi/index.ts';
import { getTimelineInbox } from '@app/lib/timeline/inbox';
import { fetchTimelineByIDs } from '@app/lib/timeline/item.ts';
import { TimelineMode } from '@app/lib/timeline/type.ts';
import * as fetcher from '@app/lib/types/fetcher.ts';
import * as req from '@app/lib/types/req.ts';
import * as res from '@app/lib/types/res.ts';
import type { App } from '@app/routes/type.ts';

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  app.get(
    '/timeline',
    {
      schema: {
        summary: '获取时间线',
        operationId: 'getTimeline',
        tags: [Tag.Timeline],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        querystring: t.Object({
          mode: t.Optional(
            t.Ref(req.FilterMode, {
              description: '登录时默认为 friends, 未登录或没有好友时始终为 all',
            }),
          ),
          offset: t.Optional(t.Integer({ default: 0, minimum: 0, description: 'min 0' })),
        }),
        response: {
          200: t.Array(t.Ref(res.Timeline)),
        },
      },
    },
    async ({ auth, query: { mode = TimelineMode.Friends, offset = 0 } }) => {
      const ids = [];
      switch (mode) {
        case TimelineMode.Friends: {
          const ret = await getTimelineInbox(auth.userID, 20, offset);
          ids.push(...ret);
          break;
        }
        case TimelineMode.All: {
          const ret = await getTimelineInbox(0, 20, offset);
          ids.push(...ret);
          break;
        }
      }
      const result = await fetchTimelineByIDs(ids);
      const items = [];
      for (const tid of ids) {
        const item = result[tid];
        if (item) {
          items.push(item);
        }
      }
      const users = await fetcher.fetchSlimUsersByIDs(items.map((i) => i.uid));
      for (const item of items) {
        item.user = users[item.uid];
      }
      return items;
    },
  );
}
