import * as lo from 'lodash-es';
import { DateTime } from 'luxon';
import t from 'typebox';

import { db, op, schema } from '@app/drizzle';
import { HeaderInvalidError } from '@app/lib/auth/index.ts';
import config from '@app/lib/config.ts';
import { BadRequestError, NotFoundError } from '@app/lib/error.ts';
import { Security, Tag } from '@app/lib/openapi/index.ts';
import { pushRev } from '@app/lib/rev/ep.ts';
import * as fetcher from '@app/lib/types/fetcher.ts';
import * as req from '@app/lib/types/req.ts';
import * as res from '@app/lib/types/res.ts';
import { formatErrors } from '@app/lib/types/res.ts';
import { validateDate } from '@app/lib/utils/date.ts';
import { validateDuration } from '@app/lib/utils/index.ts';
import { matchExpected } from '@app/lib/wiki';
import { requireLogin, requirePermission } from '@app/routes/hooks/pre-handler.ts';
import type { App } from '@app/routes/type.ts';

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  app.get(
    '/ep/:episodeID',
    {
      schema: {
        tags: [Tag.Wiki],
        operationId: 'getEpisodeWikiInfo',
        description: [].join('\n\n'),
        params: t.Object({
          episodeID: t.Integer({ minimum: 1 }),
        }),
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        response: {
          200: res.Ref(res.EpisodeWikiInfo, {
            examples: [
              {
                id: 1148124,
                subjectID: 65536,
                name: 'キマリ×ト×ハジマリ',
                nameCN: '结末×与×开始',
                ep: 60,
                date: '2012-12-23',
                type: 0,
                duration: '00:23:37',
                summary:
                  'ゴンとキルアはG.I.プレイヤー選考会にいよいよ挑戦する。審査を担当するツェズゲラから提示された合格の条件はただ一つ「練を見せる」こと。合格できる者は200人中32名という狭き門だが、ゴンとキルアはくぐり抜けることができるのか！？',
              },
            ] satisfies res.IEpisodeWikiInfo[],
          }),
          404: res.Ref(res.Error, {
            'x-examples': formatErrors(new NotFoundError('episode')),
          }),
        },
      },
    },
    async ({ params: { episodeID } }): Promise<res.IEpisodeWikiInfo> => {
      const [ep] = await db
        .select()
        .from(schema.chiiEpisodes)
        .where(op.eq(schema.chiiEpisodes.id, episodeID))
        .limit(1);
      if (!ep) {
        throw new NotFoundError(`episode ${episodeID}`);
      }

      return {
        id: ep.id,
        subjectID: ep.subjectID,
        name: lo.unescape(ep.name),
        nameCN: lo.unescape(ep.nameCN),
        ep: ep.sort,
        disc: ep.disc,
        date: ep.airdate,
        type: ep.type,
        duration: ep.duration,
        summary: ep.desc,
      };
    },
  );

  app.patch(
    '/ep/:episodeID',
    {
      schema: {
        tags: [Tag.Wiki],
        operationId: 'patchEpisodeWikiInfo',
        description: [].join('\n\n'),
        params: t.Object({
          episodeID: t.Integer({ minimum: 1 }),
        }),
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        body: t.Object(
          {
            commitMessage: t.String(),
            episode: t.Partial(t.Omit(req.EpisodeWikiInfo, ['id']), { $id: undefined }),
            expectedRevision: req.EpisodeExpected,
            authorID: t.Optional(
              t.Integer({
                exclusiveMinimum: 0,
                description: 'when header x-admin-token is provided, use this as author id.',
              }),
            ),
          },
          {
            examples: [
              {
                commitMessage: 'why this episode is edited',
                episode: {
                  date: '2022-01-20',
                  duration: '24:53',
                  ep: 4,
                  name: 'name',
                  nameCN: '中文名',
                  summary: 'a short description',
                  type: 0,
                },
                expectedRevision: {
                  name: 'old name',
                  nameCN: 'old cn name',
                },
              },
            ],
          },
        ),
        response: {
          200: t.Object({}),
          400: res.Ref(res.Error, { description: 'invalid input' }),
          404: res.Ref(res.Error, {
            'x-examples': formatErrors(new NotFoundError('episode 1')),
          }),
        },
      },
      preHandler: [
        requireLogin('edit a episode'),
        requirePermission('edit episode', (auth) => auth.permission.ep_edit),
      ],
    },
    async ({
      auth,
      headers,
      params: { episodeID },
      body: { episode: body, commitMessage, expectedRevision: expected, authorID },
    }): Promise<res.EmptyObject> => {
      const adminToken = headers['x-admin-token'];
      if (authorID !== undefined && adminToken !== config.admin_token) {
        throw new HeaderInvalidError('invalid admin token');
      }

      const [ep] = await db
        .select()
        .from(schema.chiiEpisodes)
        .where(op.eq(schema.chiiEpisodes.id, episodeID))
        .limit(1);
      if (!ep) {
        throw new NotFoundError(`episode ${episodeID}`);
      }

      if (Object.keys(body).length === 0) {
        throw new BadRequestError('request is a empty body');
      }

      if (expected) {
        matchExpected(expected, {
          name: ep.name,
          nameCN: ep.nameCN,
          duration: ep.duration,
          date: ep.airdate,
          summary: ep.desc,
        });
      }

      const updates: Partial<typeof schema.chiiEpisodes.$inferInsert> = {};

      if (body.date) {
        validateDate(body.date);
        updates.airdate = body.date;
      }
      if (body.duration) {
        validateDuration(body.duration);
        updates.duration = body.duration;
      }

      if (body.name !== undefined) {
        updates.name = lo.escape(body.name);
      }

      if (body.nameCN !== undefined) {
        updates.nameCN = lo.escape(body.nameCN);
      }

      if (body.summary !== undefined) {
        updates.desc = body.summary;
      }

      if (body.ep !== undefined) {
        updates.sort = body.ep;
      }

      if (body.disc !== undefined) {
        updates.disc = body.disc;
      }

      if (body.type !== undefined) {
        updates.type = body.type;
      }

      let finalAuthorID = auth.userID;
      if (authorID !== undefined) {
        if (!(await fetcher.fetchSlimUserByID(authorID))) {
          throw new BadRequestError(`user ${authorID} does not exist`);
        }
        finalAuthorID = authorID;
      }

      const now = DateTime.now().toUnixInteger();

      await db.transaction(async (t) => {
        await pushRev(t, {
          revisions: [
            {
              episodeID,
              rev: {
                ep_airdate: updates.airdate ?? ep.airdate,
                ep_desc: updates.desc ?? ep.desc,
                ep_duration: updates.duration ?? ep.duration,
                ep_name: updates.name ?? ep.name,
                ep_name_cn: updates.nameCN ?? ep.nameCN,
                ep_sort: (updates.sort ?? ep.sort).toString(),
                ep_disc: (updates.disc ?? ep.disc).toString(),
                ep_type: (updates.type ?? ep.type).toString(),
              },
            },
          ],
          creator: finalAuthorID,
          now,
          comment: commitMessage,
        });
      });

      if (Object.keys(updates).length > 0) {
        await db
          .update(schema.chiiEpisodes)
          .set(updates)
          .where(op.eq(schema.chiiEpisodes.id, episodeID));
      }

      return {};
    },
  );
}
