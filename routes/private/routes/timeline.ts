import { Type as t } from '@sinclair/typebox';

// import { db, op } from '@app/drizzle/db.ts';
// import type * as orm from '@app/drizzle/orm.ts';
// import * as schema from '@app/drizzle/schema';
import { Security, Tag } from '@app/lib/openapi/index.ts';
import { TimelineCat } from '@app/lib/timeline/type.ts';
// import * as res from '@app/lib/types/res.ts';
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
          cat: t.Optional(t.Enum(TimelineCat, { description: '时间线类型' })),
          limit: t.Optional(
            t.Integer({ default: 20, minimum: 1, maximum: 100, description: 'max 100' }),
          ),
          offset: t.Optional(t.Integer({ default: 0, minimum: 0, description: 'min 0' })),
        }),
        response: {
          200: {},
        },
      },
    },
    () => {
      return {};
    },
  );
}
