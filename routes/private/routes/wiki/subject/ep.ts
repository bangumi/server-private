import { Type as t } from '@sinclair/typebox';
import * as lo from 'lodash-es';
import { DateTime } from 'luxon';

import { db } from '@app/drizzle';
import { BadRequestError, NotFoundError } from '@app/lib/error.ts';
import { Security, Tag } from '@app/lib/openapi/index.ts';
import { EpisodeRepo } from '@app/lib/orm/index.ts';
import { pushRev } from '@app/lib/rev/ep.ts';
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
        security: [{ [Security.CookiesSession]: [] }],
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
      const ep = await EpisodeRepo.findOne({ where: { id: episodeID } });
      if (!ep) {
        throw new NotFoundError(`episode ${episodeID}`);
      }

      return {
        id: ep.id,
        subjectID: ep.subjectID,
        name: lo.unescape(ep.name),
        nameCN: lo.unescape(ep.nameCN),
        ep: ep.sort,
        disc: ep.epDisc,
        date: ep.date,
        type: ep.type,
        duration: ep.duration,
        summary: ep.summary,
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
        security: [{ [Security.CookiesSession]: [] }],
        body: t.Object(
          {
            commitMessage: t.String(),
            episode: t.Partial(t.Omit(req.EpisodeWikiInfo, ['id']), { $id: undefined }),
            expectedRevision: req.EpisodeExpected,
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
      params: { episodeID },
      body: { episode: body, commitMessage, expectedRevision: expected },
    }): Promise<res.EmptyObject> => {
      const ep = await EpisodeRepo.findOne({ where: { id: episodeID } });
      if (!ep) {
        throw new NotFoundError(`episode ${episodeID}`);
      }

      if (Object.keys(body).length === 0) {
        throw new BadRequestError('request is a empty body');
      }

      if (expected) {
        matchExpected(ep, expected);
      }

      if (body.date) {
        validateDate(body.date);
        ep.date = body.date;
      }
      if (body.duration) {
        validateDuration(body.duration);
        ep.duration = body.duration;
      }

      if (body.name !== undefined) {
        ep.name = lo.escape(body.name);
      }

      if (body.nameCN !== undefined) {
        ep.nameCN = lo.escape(body.nameCN);
      }

      if (body.summary !== undefined) {
        ep.summary = body.summary;
      }

      if (body.ep !== undefined) {
        ep.sort = body.ep;
      }

      if (body.disc !== undefined) {
        ep.epDisc = body.disc;
      }

      if (body.type !== undefined) {
        ep.type = body.type;
      }

      const now = DateTime.now().toUnixInteger();

      await db.transaction(async (t) => {
        await pushRev(t, {
          revisions: [
            {
              episodeID,
              rev: {
                ep_airdate: ep.date,
                ep_desc: ep.summary,
                ep_duration: ep.duration,
                ep_name: ep.name,
                ep_name_cn: ep.nameCN,
                ep_sort: ep.sort.toString(),
                ep_disc: ep.epDisc.toString(),
                ep_type: ep.type.toString(),
              },
            },
          ],
          creator: auth.userID,
          now,
          comment: commitMessage,
        });
      });

      await EpisodeRepo.update({ id: episodeID }, ep);

      return {};
    },
  );
}
