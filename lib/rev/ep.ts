import * as lo from 'lodash-es';

import { AppDataSource, RevHistoryRepo, RevTextRepo } from '@app/lib/orm';
import * as orm from '@app/lib/orm';
import type { EpTextRev } from '@app/lib/orm/entity';
import * as entity from '@app/lib/orm/entity';
import { RevText } from '@app/lib/orm/entity';


export async function getSingleTypeRev(mid: number, type: number) {
  const o = await RevHistoryRepo.findBy({ revMid: mid, revType: type });

  const revTexts = await RevTextRepo.findBy({
    revTextId: orm.In(lo.uniq(o.map((x) => x.revTextId))),
  });

  const revText = await RevText.parse<EpTextRev>(revTexts);
  const revData = Object.fromEntries(revText.map((x) => [x.id, x.data]));

  return o
    .map((x) => {
      const data: EpTextRev | undefined = revData[x.revTextId]?.[x.revId];
      if (!data) {
        return null;
      }

      return {
        revDateline: x.revDateline,
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
    }).sort((a, b) => a.revDateline - b.revDateline);
}


export async function pushRev(episodeID: number, rev: EpTextRev, creator: number, now: Date) {
  return getSingleTypeRev(8, entity.RevHistory.TypeEp);
  return await AppDataSource.transaction(async t => {

  });
}
