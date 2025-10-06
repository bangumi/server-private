import t from 'typebox';
import * as lo from 'lodash-es';

import type { EpTextRev } from '@app/lib/orm/entity/index.ts';
import { RevHistory, RevText } from '@app/lib/orm/entity/index.ts';
import * as orm from '@app/lib/orm/index.ts';
import { EpisodeRepo, EpRevRepo, RevHistoryRepo, RevTextRepo } from '@app/lib/orm/index.ts';
import * as fetcher from '@app/lib/types/fetcher.ts';
import { ghostUser } from '@app/lib/user/utils';
import type { App } from '@app/routes/type.ts';

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  app.get(
    '/ep/:episodeID/history',
    {
      schema: {
        hide: true,
        params: t.Object({
          episodeID: t.Integer({ minimum: 1 }),
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

      const uids = o.map((x) => x.revCreator);
      const users = await fetcher.fetchSlimUsersByIDs(uids);

      const histories = [];
      for (const rev of o) {
        const data: EpTextRev | undefined = revData[rev.revTextId]?.[rev.revId];
        if (!data) {
          continue;
        }
        histories.push({
          revDateline: rev.createdAt,
          creatorID: rev.revCreator,
          creator: users[rev.revCreator] ?? ghostUser(rev.revCreator),
          airdate: data.ep_airdate,
          desc: data.ep_desc,
          name: data.ep_name,
          type: data.ep_type,
          sort: data.ep_sort,
          duration: data.ep_duration,
          name_cn: data.ep_name_cn,
        } as { revDateline: number; creatorID: number });
      }

      for (const rev of batchRevs) {
        histories.push({
          revDateline: rev.revDateline,
          creatorID: rev.revCreator,
          creator: users[rev.revCreator] ?? ghostUser(rev.revCreator),
          batch: rev.revEpInfobox,
        });
      }

      return await res.view('admin/episode-history', {
        ep,
        histories: histories.sort((a, b) => a.revDateline - b.revDateline),
      });
    },
  );
}
