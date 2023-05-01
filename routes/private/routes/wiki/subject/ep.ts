import type { Static } from '@sinclair/typebox';
import { Type as t } from '@sinclair/typebox';

import { BadRequestError, NotFoundError } from '@app/lib/error';
import { Security, Tag } from '@app/lib/openapi';
import { AppDataSource, EpisodeRepo } from '@app/lib/orm';
import * as orm from '@app/lib/orm';
import * as entity from '@app/lib/orm/entity';
import { Episode, RevHistory } from '@app/lib/orm/entity';
import * as res from '@app/lib/types/res.ts';
import { EpisodeType, formatErrors } from '@app/lib/types/res.ts';
import { formatDuration, parseDuration } from '@app/lib/utils';
import type { App } from '@app/routes/type.ts';

type IEpisodeWikiInfo = Static<typeof EpisodeWikiInfo>;
export const EpisodeWikiInfo = t.Object(
  {
    id: t.Integer(),
    name: t.String(),
    nameCN: t.String(),
    type: t.Enum(EpisodeType),
    ep: t.Number(),
    duration: t.String(),
    date: t.String({ description: 'YYYY-MM-DD', pattern: /(^\d{4}-\d{2}-\d{2}$|^$)/.source }),
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
          200: t.Ref(EpisodeWikiInfo, {
            examples: [
              {
                id: 1148124,
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
          404: t.Ref(res.Error, {
            'x-examples': formatErrors(NotFoundError('episode')),
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
        name: ep.name,
        nameCN: ep.nameCN,
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
        body: t.Partial(t.Omit(EpisodeWikiInfo, ['id']), {
          examples: [
            {
              date: '2023-05-01',
              duration: '3m10s',
              ep: 1,
              name: 'nn',
              nameCN: 'mm',
              summary: 'string',
              type: 0,
            },
          ],
        }),
        response: {
          200: t.Object({}),
          401: t.Ref(res.Error, { description: 'invalid input' }),
          404: t.Ref(res.Error, { 'x-examples': formatErrors(NotFoundError('episode 1')) }),
        },
      },
    },
    async ({ params: { episodeID }, body }): Promise<{}> => {
      const ep = await EpisodeRepo.findOne({ where: { id: episodeID } });
      if (!ep) {
        throw new NotFoundError(`episode ${episodeID}`);
      }

      if (body.date) {
        if (datePattern.test(body.date)) {
          throw new BadRequestError(`${body.date} is not valid date`);
        }

        ep.airDate = body.date;
      }

      if (body.duration) {
        const duration = parseDuration(body.duration);
        if (isNaN(duration)) {
          throw new BadRequestError(
            `${body.date} is not valid duration, use string like 'hh:mm:dd' or '1h10m20s'`,
          );
        }

        ep.duration = formatDuration(duration);
      }

      await AppDataSource.transaction(async (t) => {
        const EpisodeRepo = t.getRepository(Episode);

        const episode = await t.findOneBy(entity.Episode, { id: episodeID });

        await t.findOneBy(entity.RevText, {});

        await EpisodeRepo.update({ id: episodeID }, ep);

        const o = await t.findBy(entity.RevHistory, {
          revMid: episodeID,
          revType: orm.In(RevHistory.episodeTypes),
        });

        await t.findOneBy(entity.RevHistory, {});
        await t.findOneBy(entity.RevText, {});
      });

      const {
        name = ep.name,
        nameCN = ep.nameCN,
        ep: episode = ep.sort,
        date = ep.airDate,
        type = ep.type,
        duration = ep.duration,
        summary = ep.summary,
      } = body;

      return {
        name,
        nameCN,
        ep: episode,
        date,
        type,
        duration,
        summary,
      };
    },
  );
}

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
