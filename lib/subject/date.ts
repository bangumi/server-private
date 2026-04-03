import type { Wiki } from '@bgm38/wiki';

import { DATE } from '@app/lib/utils/date.ts';
import { extractDateFromString } from '@app/lib/wiki';
import { getSubjectPlatformSortKeys } from '@app/vendor';

import type { SubjectType } from './type';

export function extractDate(w: Wiki, typeID: SubjectType, platform: number): DATE {
  const keys = getSubjectPlatformSortKeys(typeID, platform);

  const values = keys
    .map((key) => {
      return w.data.find((v) => v.key === key);
    })
    .filter((v) => v !== undefined);

  for (const item of values) {
    if (!item) {
      continue;
    }
    if (item.value) {
      const parsed = extractDateFromString(item.value);
      if (parsed) {
        return parsed;
      }
    }

    for (const value of item.values ?? []) {
      if (value.v) {
        const parsed = extractDateFromString(value.v);
        if (parsed) {
          return parsed;
        }
      }
    }
  }

  return new DATE(0, 0, 0);
}
