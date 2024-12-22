import type { Static } from '@sinclair/typebox';
import { Type as t } from '@sinclair/typebox';
import * as lo from 'lodash-es';

import { BadRequestError, NotFoundError } from '@app/lib/error.ts';
import { Security, Tag } from '@app/lib/openapi/index.ts';
import { AppDataSource, EpisodeRepo } from '@app/lib/orm/index.ts';
import { pushRev } from '@app/lib/rev/ep.ts';
import * as req from '@app/lib/types/req.ts';
import * as res from '@app/lib/types/res.ts';
import { formatErrors } from '@app/lib/types/res.ts';
import { parseDuration } from '@app/lib/utils/index.ts';
import { requireLogin, requirePermission } from '@app/routes/hooks/pre-handler.ts';
import type { App } from '@app/routes/type.ts';

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

type IEpisodeWikiInfo = Static<typeof EpisodeWikiInfo>;
export const EpisodeWikiInfo = t.Object(
  {
    id: t.Integer(),
    subjectID: t.Integer(),
    name: t.String(),
    nameCN: t.String(),
    type: res.Ref(req.EpisodeType),
    ep: t.Number(),
    duration: t.String({ examples: ['24:53', '24m52s'] }),
    date: t.Optional(
      t.String({
        description: 'YYYY-MM-DD',
        pattern: datePattern.source,
        examples: ['2022-02-02'],
      }),
    ),
    summary: t.String(),
  },
  {
    $id: 'EpisodeWikiInfo',
  },
);

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  app.addSchema(EpisodeWikiInfo);

  app.get(
    '/ep/:episodeID',
    {
      schema: {
        tags: [Tag.Wiki],
        operationId: 'getEpisodeWikiInfo',
        description: [].join('\n\n'),
        params: t.Object({
          episodeID: t.Integer({ examples: [1148124], minimum: 0 }),
        }),
        security: [{ [Security.CookiesSession]: [] }],
        response: {
          200: res.Ref(EpisodeWikiInfo, {
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
            ] satisfies IEpisodeWikiInfo[],
          }),
          404: res.Ref(res.Error, {
            'x-examples': formatErrors(new NotFoundError('episode')),
          }),
        },
      },
    },
    async ({ params: { episodeID } }): Promise<IEpisodeWikiInfo> => {
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
        date: ep.airDate,
        type: 0,
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
          episodeID: t.Integer({ examples: [1148124], minimum: 0 }),
        }),
        security: [{ [Security.CookiesSession]: [] }],
        body: t.Object(
          {
            commitMessage: t.String(),
            episode: t.Partial(t.Omit(EpisodeWikiInfo, ['id']), { $id: undefined }),
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
              },
            ],
          },
        ),
        response: {
          200: t.Object({}),
          400: res.Ref(res.Error, { description: 'invalid input' }),
          404: res.Ref(res.Error, { 'x-examples': formatErrors(new NotFoundError('episode 1')) }),
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
      body: { episode: body, commitMessage },
    }): Promise<res.EmptyObject> => {
      const ep = await EpisodeRepo.findOne({ where: { id: episodeID } });
      if (!ep) {
        throw new NotFoundError(`episode ${episodeID}`);
      }

      if (Object.keys(body).length === 0) {
        throw new BadRequestError('request is a empty body');
      }

      if (body.date) {
        if (!datePattern.test(body.date)) {
          throw new BadRequestError(`${body.date} is not valid date`);
        }

        ep.airDate = body.date;
      }

      if (body.duration) {
        const duration = parseDuration(body.duration);
        if (Number.isNaN(duration)) {
          throw new BadRequestError(
            `${body.duration} is not valid duration, use string like 'hh:mm:dd' or '1h10m20s'`,
          );
        }

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

      const now = new Date();

      await AppDataSource.transaction(async (t) => {
        await pushRev(t, {
          episodeID,
          rev: {
            ep_airdate: ep.airDate,
            ep_desc: ep.summary,
            ep_duration: ep.duration,
            ep_name: ep.name,
            ep_name_cn: ep.nameCN,
            ep_sort: '0',
            ep_type: '0',
          },
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
