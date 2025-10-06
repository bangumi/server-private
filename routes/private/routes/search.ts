import t from 'typebox';

import { Security, Tag } from '@app/lib/openapi/index.ts';
import { search as searchCharacter } from '@app/lib/search/character';
import { search as searchPerson } from '@app/lib/search/person';
import { search as searchSubject } from '@app/lib/search/subject';
import * as fetcher from '@app/lib/types/fetcher.ts';
import * as req from '@app/lib/types/req.ts';
import * as res from '@app/lib/types/res.ts';
import type { App } from '@app/routes/type.ts';

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  app.post(
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
        body: req.Ref(req.SearchSubject),
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
        total: resp.total,
      };
    },
  );

  app.post(
    '/search/characters',
    {
      schema: {
        summary: '搜索角色',
        operationId: 'searchCharacters',
        tags: [Tag.Search],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        querystring: t.Object({
          limit: t.Optional(
            t.Integer({ default: 20, minimum: 1, maximum: 100, description: 'max 100' }),
          ),
          offset: t.Optional(t.Integer({ default: 0, minimum: 0, description: 'min 0' })),
        }),
        body: req.Ref(req.SearchCharacter),
        response: {
          200: res.Paged(res.Ref(res.SlimCharacter)),
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
      const resp = await searchCharacter({
        keyword: body.keyword,
        filter: body.filter,
        limit,
        offset,
      });
      const characters = await fetcher.fetchSlimCharactersByIDs(resp.ids, auth.allowNsfw);
      const result = [];
      for (const cid of resp.ids) {
        if (characters[cid]) {
          result.push(characters[cid]);
        }
      }
      return {
        data: result,
        total: resp.total,
      };
    },
  );

  app.post(
    '/search/persons',
    {
      schema: {
        summary: '搜索人物',
        operationId: 'searchPersons',
        tags: [Tag.Search],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        querystring: t.Object({
          limit: t.Optional(
            t.Integer({ default: 20, minimum: 1, maximum: 100, description: 'max 100' }),
          ),
          offset: t.Optional(t.Integer({ default: 0, minimum: 0, description: 'min 0' })),
        }),
        body: req.Ref(req.SearchPerson),
        response: {
          200: res.Paged(res.Ref(res.SlimPerson)),
        },
      },
    },
    async ({ auth, body, query: { limit = 20, offset = 0 } }) => {
      const resp = await searchPerson({
        keyword: body.keyword,
        filter: body.filter,
        limit,
        offset,
      });
      const persons = await fetcher.fetchSlimPersonsByIDs(resp.ids, auth.allowNsfw);
      const result = [];
      for (const pid of resp.ids) {
        if (persons[pid]) {
          result.push(persons[pid]);
        }
      }
      return {
        data: result,
        total: resp.total,
      };
    },
  );
}
