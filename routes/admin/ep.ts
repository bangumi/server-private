import { Type as t } from '@sinclair/typebox';
import * as lo from 'lodash-es';

import type { EpTextRev } from '@app/lib/orm/entity/index.ts';
import { RevHistory, RevText } from '@app/lib/orm/entity/index.ts';
import * as orm from '@app/lib/orm/index.ts';
import {
  addCreator,
  EpisodeRepo,
  EpRevRepo,
  RevHistoryRepo,
  RevTextRepo,
} from '@app/lib/orm/index.ts';
import type { App } from '@app/routes/type.ts';

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  app.get(
    '/ep/:episodeID/history',
    {
      schema: {
        hide: true,
        params: t.Object({
          episodeID: t.Integer({ exclusiveMinimum: 0 }),
        }),
      },
    },
    async ({ params: { episodeID } }, res) => {
      const ep = await EpisodeRepo.findOneBy({ id: episodeID });

      if (!ep) {
        return res.status(404).send();
      }

      const o = await RevHistoryRepo.findBy({
        revMid: episodeID,
        revType: orm.In(RevHistory.episodeTypes),
      });

      // const revs: {
      //   airdate: string;
      //   desc: string;
      //   duration: string;
      //   name: string;
      //   name_cn: string;
      //   sort: string;
      //   type: string;
      // }[] = [];

      const s = episodeID.toString();

      // `episodeID=123` 时可能查询到 `123456` 的批量修改
      const epBatchRevs = await EpRevRepo.findBy([
        { revEids: orm.Like(`%${episodeID}%`), revSid: ep.subjectID },
        { revEids: episodeID.toString(), revSid: ep.subjectID },
      ]);

      const batchRevs = epBatchRevs
        .map((x) => {
          return {
            ...x,
            eids: x.revEids.split(','),
            creatorID: x.revCreator,
          };
        })
        .filter((x) => x.eids.includes(s));

      const revTexts = await RevTextRepo.findBy({
        revTextId: orm.In(lo.uniq(o.map((x) => x.revTextId))),
      });

      const revText = await RevText.parse<EpTextRev>(revTexts);
      const revData = Object.fromEntries(revText.map((x) => [x.id, x.data]));

      return await res.view('admin/episode-history', {
        ep,
        histories: await addCreator(
          [
            ...o
              .map((x) => {
                const data: EpTextRev | undefined = revData[x.revTextId]?.[x.revId];
                if (!data) {
                  return null;
                }

                return {
                  revDateline: x.createdAt,
                  creatorID: x.revCreator,
                  airdate: data.ep_airdate,
                  desc: data.ep_desc,
                  name: data.ep_name,
                  type: data.ep_type,
                  sort: data.ep_sort,
                  duration: data.ep_duration,
                  name_cn: data.ep_name_cn,
                } as { revDateline: number; creatorID: number };
              })
              .filter(function <T>(t: T | null): t is T {
                return t !== null;
              }),

            ...batchRevs.map((x) => {
              return {
                revDateline: x.revDateline,
                creatorID: x.revCreator,
                eids: x.eids,
                batch: x.revEpInfobox,
              };
            }),
          ].sort((a, b) => a.revDateline - b.revDateline),
          { ghostUser: true },
        ),
      });
    },
  );
}
