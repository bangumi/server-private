import { Type as t } from '@sinclair/typebox';

import { Security, Tag } from '@app/lib/openapi/index.ts';
import { search as searchSubject } from '@app/lib/search/subject';
import * as fetcher from '@app/lib/types/fetcher.ts';
import * as req from '@app/lib/types/req.ts';
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
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        querystring: t.Object({
          limit: t.Optional(
            t.Integer({ default: 20, minimum: 1, maximum: 100, description: 'max 100' }),
          ),
          offset: t.Optional(t.Integer({ default: 0, minimum: 0, description: 'min 0' })),
        }),
        body: req.Ref(req.SubjectSearch),
        response: {
          200: res.Paged(res.Ref(res.SlimSubject)),
        },
      },
    },
    async ({ auth, body, query: { limit = 20, offset = 0 } }) => {
      if (!auth.allowNsfw) {
        body.filter = {
          ...body.filter,
          nsfw: false,
        };
      }
      const resp = await searchSubject({
        keyword: body.keyword,
        sort: body.sort,
        filter: body.filter,
        limit,
        offset,
      });
      const subjects = await fetcher.fetchSlimSubjectsByIDs(resp.ids, auth.allowNsfw);
      const result = [];
      for (const sid of resp.ids) {
        if (subjects[sid]) {
          result.push(subjects[sid]);
        }
      }
      return {
        data: result,
        total: resp.hits,
      };
    },
  );
}
