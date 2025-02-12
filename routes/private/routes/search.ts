import { Type as t } from '@sinclair/typebox';

import { db, op } from '@app/drizzle/db.ts';
import * as schema from '@app/drizzle/schema';
import { Security, Tag } from '@app/lib/openapi/index.ts';
import client from '@app/lib/search/client';
import * as convert from '@app/lib/types/convert.ts';
import * as res from '@app/lib/types/res.ts';
import type { App } from '@app/routes/type.ts';

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  app.get(
    '/search/subjects',
    {
      schema: {
        summary: '搜索条目',
        operationId: 'searchSubjects',
        tags: [Tag.Search],
        querystring: t.Object({
          keyword: t.String({ description: '搜索关键词' }),
          limit: t.Optional(
            t.Integer({ default: 20, minimum: 1, maximum: 100, description: 'max 100' }),
          ),
          offset: t.Optional(t.Integer({ default: 0, minimum: 0, description: 'min 0' })),
        }),
        response: {
          200: res.Paged(res.Ref(res.SlimSubject)),
        },
      },
    },
    async ({ query: { keyword } }) => {
      const results = await client.search(keyword).limit(10).execute();
    },
  );
}
