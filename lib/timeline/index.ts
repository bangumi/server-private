import { Type as t } from '@sinclair/typebox';
import Ajv from 'ajv';
import type { ValidateFunction } from 'ajv';
import * as lodash from 'lodash-es';
import * as php from 'php-serialize';

import { logger } from '@app/lib/logger';
import type * as entity from '@app/lib/orm/entity';

import type {
  BlogMemo,
  DoujinMemo,
  DoujinType5Memo,
  GroupMemo,
  IndexMemo,
  MonoMemo,
  Progress2Memo,
  ProgressMemo,
  RelationMemo,
  RenameMemo,
  SubjectMemo,
  WikiMemo,
} from './types';
import {
  Blog,
  Doujin,
  DoujinType5,
  Group,
  Index,
  Mono,
  Progress,
  Progress2,
  Relation,
  Rename,
  Subject,
  Wiki,
} from './types';

/** 在数据库中存为 timeline cat 根据 type 还分为不同的类型 */
const enum TimelineCat {
  Unknown = 0,
  Relation = 1, // add friends, join group
  Wiki = 2,
  Subject = 3,
  Progress = 4,
  /** Type = 2 时为 [SayEditMemo] 其他类型则是 string */
  Say = 5,
  Blog = 6,
  Index = 7,
  Mono = 8,
  Doujin = 9,
}

type Timeline =
  | { batch: boolean; cat: TimelineCat.Relation; id: number; type: 0; memo: RelationMemo }
  | { batch: boolean; cat: TimelineCat.Relation; id: number; type: 1 | 5; memo: string }
  | { batch: boolean; cat: TimelineCat.Relation; id: number; type: 2 | 3 | 4; memo: GroupMemo }
  // cat=2
  | {
      batch: boolean;
      cat: TimelineCat.Wiki;
      id: number;
      type: 0 | 1 | 2 | 3 | 4 | 5 | 6;
      memo: WikiMemo;
    }
  // cat=3
  | { batch: boolean; cat: TimelineCat.Subject; id: number; type: number; memo: SubjectMemo }
  // | { batch: true; cat: TimelineCat.Subject; id: number; type: 0; memo: SubjectMemo }
  | { batch: boolean; cat: TimelineCat.Progress; id: number; type: 0; memo: ProgressMemo }
  | { batch: boolean; cat: TimelineCat.Progress; id: number; type: 1 | 2 | 3; memo: Progress2Memo }
  | { batch: boolean; cat: TimelineCat.Say; id: number; type: 2; memo: RenameMemo }
  | { batch: boolean; cat: TimelineCat.Say; id: number; type: 0 | 1; memo: string }
  | { batch: boolean; cat: TimelineCat.Blog; id: number; type: 0 | 1; memo: BlogMemo }
  // cat=7
  | { batch: boolean; cat: TimelineCat.Index; id: number; type: 0 | 1; memo: IndexMemo }
  // cat=8
  | { batch: boolean; cat: TimelineCat.Mono; id: number; type: 0 | 1; memo: MonoMemo }
  | { batch: boolean; cat: TimelineCat.Doujin; id: number; type: 1 | 3 | 0; memo: DoujinMemo }
  | { batch: boolean; cat: TimelineCat.Doujin; id: number; type: 5 | 6; memo: DoujinType5Memo }
  // | { batch: true; cat: TimelineCat.Wiki; id: number; type: 0; memo: WikiMemo }
  // | { batch: true; cat: TimelineCat.Progress; id: number; type: 0; memo: ProgressMemo }
  // | { batch: true; cat: TimelineCat.Progress; id: number; type: 1 | 2 | 3; memo: Progress2Memo }
  // | { batch: true; cat: TimelineCat.Blog; id: number; type: 0; memo: BlogMemo }
  | { batch: true; cat: TimelineCat.Index; id: number; type: 0; memo: IndexMemo }
  | { batch: true; cat: TimelineCat.Mono; id: number; type: 0; memo: MonoMemo };

const batchAble: Record<TimelineCat, Set<number>> = {
  [TimelineCat.Unknown]: new Set([]),
  [TimelineCat.Relation]: new Set([1, 2, 3, 4, 5]),
  [TimelineCat.Wiki]: new Set([]),
  [TimelineCat.Subject]: new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]),
  [TimelineCat.Progress]: new Set([]),
  [TimelineCat.Say]: new Set([]),
  [TimelineCat.Blog]: new Set([]),
  [TimelineCat.Index]: new Set([]),
  [TimelineCat.Mono]: new Set([1, 8]),
  [TimelineCat.Doujin]: new Set([1, 3, 9]),
};

const ajv = new Ajv({
  strict: true,
  coerceTypes: true,
});

/** -1 type as match all */
const validator: Record<TimelineCat, Record<number, ValidateFunction>> = {
  [TimelineCat.Unknown]: {},
  // 1
  [TimelineCat.Relation]: {
    1: ajv.compile(t.String()),
    2: ajv.compile(Relation),
    3: ajv.compile(Group),
    4: ajv.compile(Group),
    5: ajv.compile(t.String()),
  },
  // 2
  [TimelineCat.Wiki]: {
    0: ajv.compile(Wiki),
    1: ajv.compile(Wiki),
    2: ajv.compile(Wiki),
    3: ajv.compile(Wiki),
    4: ajv.compile(Wiki),
    5: ajv.compile(Wiki),
    6: ajv.compile(Wiki),
  },
  // 3
  [TimelineCat.Subject]: {
    [-1]: ajv.compile(Subject),
    0: ajv.compile(Subject),
    2: ajv.compile(Subject),
    6: ajv.compile(Subject),
    13: ajv.compile(Subject),
  },
  // 4
  [TimelineCat.Progress]: {
    0: ajv.compile(Progress),
    1: ajv.compile(Progress2),
    2: ajv.compile(Progress2),
    3: ajv.compile(Progress2),
  },
  // 5
  [TimelineCat.Say]: {
    0: ajv.compile(t.String()),
    1: ajv.compile(t.String()),
    2: ajv.compile(Rename),
  },
  // 6
  [TimelineCat.Blog]: {
    0: ajv.compile(Blog),
    1: ajv.compile(Blog),
  },
  // 7
  [TimelineCat.Index]: {
    0: ajv.compile(Index),
    1: ajv.compile(Index),
  },
  // 8
  [TimelineCat.Mono]: {
    0: ajv.compile(Mono),
    1: ajv.compile(Mono),
  },
  // 9
  [TimelineCat.Doujin]: {
    [-1]: ajv.compile(Doujin),
    0: ajv.compile(Doujin),
    1: ajv.compile(Doujin),
    3: ajv.compile(Doujin),
    5: ajv.compile(DoujinType5),
    6: ajv.compile(Doujin),
  },
};

export class UnknownTimelineError extends Error {}

/** 有部分 timeline 的类型不统一，需要额外判断后进行转换 */
export function convertFromOrm(s: entity.Timeline): Timeline | null {
  const batch = Boolean(s.tmlBatch);

  const cat = s.cat;
  const type = s.type;

  if (cat === TimelineCat.Relation) {
    // 1
    const tl = convertRelationOrm(s);
    if (tl) {
      return tl;
    }
  } else if (cat === TimelineCat.Wiki) {
    // 2
    const memo = php.unserialize(s.memo) as WikiMemo;
    // if (typeof memo.subject_id === 'string') {
    //   memo.subject_id = parseInt(memo.subject_id);
    // }
    if (
      type === 0 ||
      type === 1 ||
      type === 2 ||
      type === 3 ||
      type === 4 ||
      type === 5 ||
      type === 6
    ) {
      return { cat, type, memo: memo, id: s.id, batch };
    }
  } else if (cat === TimelineCat.Subject) {
    // 3
    const memo = php.unserialize(s.memo) as SubjectMemo;
    return { cat, type, memo: memo, id: s.id, batch };
  } else if (s.cat === TimelineCat.Progress) {
    // 4
    if (type === 0) {
      const memo = php.unserialize(s.memo) as ProgressMemo;
      // @ts-expect-error 需要清洗数据
      if (memo.eps_total === '??') {
        memo.eps_total = undefined;
      }

      if (memo.vols_total === '??') {
        memo.vols_total = undefined;
      }

      return { cat, type, memo, id: s.id, batch };
    } else if (type === 2 || type === 1 || type === 3) {
      const memo = php.unserialize(s.memo) as Progress2Memo;
      return { cat, type, memo, id: s.id, batch };
    }
  } else if (cat === TimelineCat.Say) {
    // 5
    if (2 === type) {
      return {
        cat: TimelineCat.Say,
        type,
        memo: php.unserialize(s.memo) as RenameMemo,
        id: s.id,
        batch,
      };
    } else if (type === 1 || type === 0) {
      return { cat, type, memo: s.memo, id: s.id, batch: false };
    }
  } else if (cat === TimelineCat.Blog) {
    // 6
    if (type === 0 || type === 1) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      return { cat, type: type, memo: php.unserialize(s.memo), id: s.id, batch };
    }
  } else if (s.cat === TimelineCat.Index) {
    // 7
    const memo = php.unserialize(s.memo) as IndexMemo;
    if (type === 0 || type === 1) {
      return { cat, type, memo: memo, id: s.id, batch };
    }
  } else if (cat === TimelineCat.Mono) {
    // 8
    if (type === 0 || type === 1) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      return { cat, type: type, memo: php.unserialize(s.memo), id: s.id, batch };
    }
  } else if (s.cat === TimelineCat.Doujin) {
    if (type === 0 || type === 1 || type === 3) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      return { cat, type, memo: php.unserialize(s.memo), id: s.id, batch };
    } else if (type === 5 || type === 6) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      return { cat, type, memo: php.unserialize(s.memo), id: s.id, batch };
    }
  }

  throw new UnknownTimelineError(
    `unexpected timeline<id=${s.id}> cat ${s.cat} type ${s.type} ${JSON.stringify(s)}`,
  );
}

function convertRelationOrm(s: entity.Timeline): Timeline | null {
  if (s.type === 2 || s.type === 3 || s.type === 4) {
    return {
      cat: TimelineCat.Relation,
      type: s.type,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      memo: php.unserialize(s.memo),
      id: s.id,
      batch: Boolean(s.tmlBatch),
    };
  }

  if (s.type === 1 || s.type === 5) {
    return { cat: s.cat, type: s.type, memo: s.memo, id: s.id, batch: Boolean(s.tmlBatch) };
  }

  return null;
}

export function validate(t: Timeline) {
  if (
    lodash.isEqual(t.memo, {
      subject_id: null,
      subject_name: '',
      subject_name_cn: '',
      subject_series: null,
    })
  ) {
    logger.warn(`bad timeline ${t.id}`);
    return;
  }

  const validate = validator[t.cat][t.type] ?? validator[t.cat][-1];
  if (!validate) {
    throw new Error(
      `missing validator (cat=${JSON.stringify(t.cat)}, type=${JSON.stringify(
        t.type,
      )}) ${JSON.stringify(t.memo, null, 2)}`,
    );
  }

  if (t.batch) {
    if (!batchAble[t.cat].has(t.type)) {
      throw new Error(`not batch-able (id=${t.id}, cat=${t.cat}, type=${t.type}, batch=true)`);
    }
    for (const memo of Object.values(t.memo)) {
      if (validate(memo)) {
        return;
      }
      if (!validate.errors) {
        return;
      }

      const valid = [...validate.errors];
      if (valid.length > 0) {
        throw new TypeError(
          `not valid (id=${t.id}, cat=${t.cat}, type=${t.type}, batch=true) :\n` +
            JSON.stringify(memo, null, 2) +
            '\n' +
            valid.map((x) => `${x.keyword}: ${x.message ?? ''}`).join('\n'),
        );
      }
    }
  } else {
    if (validate(t.memo)) {
      return;
    }

    if (!validate.errors) {
      return;
    }

    const valid = [...validate.errors];
    if (valid.length > 0) {
      throw new TypeError(
        `not valid (id=${t.id}, cat=${t.cat}, type=${t.type}, batch=false) :\n` +
          JSON.stringify(t, null, 2) +
          '\n' +
          valid.map((x) => `${x.keyword}: ${x.message ?? ''}`).join('\n'),
      );
    }
  }
}
