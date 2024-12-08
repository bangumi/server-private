import { Type as t } from '@sinclair/typebox';

import { db, op } from '@app/drizzle/db.ts';
import * as schema from '@app/drizzle/schema';
import { TypedCache } from '@app/lib/cache.ts';
import { Security, Tag } from '@app/lib/openapi/index.ts';
import { TimelineCat, TimelineMode } from '@app/lib/timeline/type.ts';
import * as convert from '@app/lib/types/convert.ts';
import * as fetcher from '@app/lib/types/fetcher.ts';
import * as res from '@app/lib/types/res.ts';
import type { App } from '@app/routes/type.ts';

interface cacheKey {
  uid: number;
  cat: number;
}

const tmlCache = TypedCache<cacheKey, res.ITimeline[]>((key) => `tml:${key.uid}:${key.cat}`);

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
            t.Enum(TimelineMode, {
              description:
                'all: 全站, friends: 好友; 登录时默认为 friends, 未登录或没有好友时始终为 all',
            }),
          ),
          cat: t.Optional(t.Enum(TimelineCat, { description: '时间线类型' })),
          since: t.Optional(t.Integer({ minimum: 0, description: '起始 Timeline ID' })),
          offset: t.Optional(t.Integer({ default: 0, minimum: 0, description: 'min 0' })),
        }),
        response: {
          200: t.Array(t.Ref(res.Timeline)),
        },
      },
    },
    async ({ auth, query: { mode = TimelineMode.Friends, cat, since, offset = 0 } }) => {
      const key = { uid: auth.userID, cat: cat ?? 0 };
      const conditions = [];
      if (cat) {
        conditions.push(op.eq(schema.chiiTimeline.cat, cat));
      }
      if (since) {
        // 由于 timeline 表没有 createdAt 字段的索引，所以这里使用 id 作为 since
        conditions.push(op.gte(schema.chiiTimeline.id, since));
      }
      if (auth.login && mode === TimelineMode.Friends) {
        const friendIDs = await fetcher.fetchFriendIDsByUserID(auth.userID);
        if (friendIDs.length > 0) {
          conditions.push(op.inArray(schema.chiiTimeline.uid, friendIDs));
        } else {
          key.uid = 0;
        }
      }
      if (offset === 0) {
        const cached = await tmlCache.get(key);
        if (cached) {
          return cached;
        }
      }

      const data = await db
        .select()
        .from(schema.chiiTimeline)
        .innerJoin(schema.chiiUsers, op.eq(schema.chiiTimeline.uid, schema.chiiUsers.id))
        .where(conditions.length > 0 ? op.and(...conditions) : undefined)
        .orderBy(op.desc(schema.chiiTimeline.id))
        .limit(20)
        .offset(offset);
      const items = data.map((d) => convert.toTimeline(d.chii_timeline, d.chii_members));
      if (offset === 0) {
        await tmlCache.set(key, items);
      }
      return items;
    },
  );
}
