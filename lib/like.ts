import * as lo from 'lodash-es';

import { LikeRepo } from '@app/lib/orm';

export interface Reaction {
  selected: boolean;
  total: number;
  value: number;
}

export async function fetchGroupTopic(
  id: number,
  uid: number,
): Promise<Record<number, Reaction[]>> {
  const data = await LikeRepo.findBy({ mainID: id });

  const r = lo.groupBy(data, (x) => x.relatedID);

  return lo.mapValues(r, (v): Reaction[] => {
    return Object.entries(
      lo.groupBy(v, (a) => {
        return a.value;
      }),
    ).map(([key, values]) => {
      return {
        selected: values.some((x) => x.uid === uid),
        total: values.length,
        value: Number.parseInt(key),
      };
    });
  });
}
