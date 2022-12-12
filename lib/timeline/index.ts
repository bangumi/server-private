import { Type as t } from '@sinclair/typebox';
import { TypeCompiler } from '@sinclair/typebox/compiler';
import type { ValueError } from '@sinclair/typebox/errors';
import * as php from 'php-serialize';

import type * as Prisma from '../generated/client';
import type {
  BlogMemo,
  DoujinMemo,
  GroupMemo,
  IndexMemo,
  MonoMemo,
  ProgressMemo,
  RelationMemo,
  RenameMemo,
  SubjectMemo,
  WikiMemo,
} from './types';
import {
  Doujin,
  Group,
  Progress,
  Wiki,
  Subject,
  Blog,
  Index,
  Mono,
  Rename,
  Relation,
} from './types';

/**
 * 在数据库中存为 timeline cat
 * 根据 type 还分为不同的类型
 */
const enum TimelineCat {
  Unknown = 0,
  Relation = 1, // add friends, join group
  Wiki = 2,
  Subject = 3,
  Progress = 4,
  /**
   * type = 2 时为 [SayEditMemo]
   * 其他类型则是 string
   */
  Say = 5,
  Blog = 6,
  Index = 7,
  Mono = 8,
  Doujin = 9,
}

type Timeline =
  | { cat: TimelineCat.Relation; id: number; type: 0; memo: RelationMemo }
  | { cat: TimelineCat.Relation; id: number; type: 3 | 4; memo: GroupMemo }
  | { cat: TimelineCat.Wiki; id: number; type: 0; memo: WikiMemo }
  | { cat: TimelineCat.Subject; id: number; type: 0; memo: SubjectMemo }
  | { cat: TimelineCat.Progress; id: number; type: 0; memo: ProgressMemo }
  | { cat: TimelineCat.Say; id: number; type: 2; memo: RenameMemo }
  | { cat: TimelineCat.Say; id: number; type: 0; memo: string }
  | { cat: TimelineCat.Blog; id: number; type: 0; memo: BlogMemo }
  | { cat: TimelineCat.Index; id: number; type: 0; memo: IndexMemo }
  | { cat: TimelineCat.Mono; id: number; type: 0; memo: MonoMemo }
  | { cat: TimelineCat.Doujin; id: number; type: 0; memo: DoujinMemo };

const validator: Record<
  TimelineCat,
  Record<
    number,
    { Check(v: unknown): boolean; Errors(value: unknown): IterableIterator<ValueError> }
  >
> = {
  [TimelineCat.Unknown]: {},
  [TimelineCat.Relation]: {
    2: TypeCompiler.Compile(Relation),
    3: TypeCompiler.Compile(Group),
    4: TypeCompiler.Compile(Group),
  },
  [TimelineCat.Subject]: { 0: TypeCompiler.Compile(Subject) },
  [TimelineCat.Progress]: { 0: TypeCompiler.Compile(Progress) },
  [TimelineCat.Say]: {
    0: TypeCompiler.Compile(t.String()),
    2: TypeCompiler.Compile(Rename),
  },
  [TimelineCat.Blog]: { 0: TypeCompiler.Compile(Blog) },
  [TimelineCat.Index]: { 0: TypeCompiler.Compile(Index) },
  [TimelineCat.Mono]: { 0: TypeCompiler.Compile(Mono) },
  [TimelineCat.Doujin]: { 0: TypeCompiler.Compile(Doujin) },
  [TimelineCat.Wiki]: { 0: TypeCompiler.Compile(Wiki) },
};

export const timeline = {
  convertFromOrm(s: Prisma.Timeline): Timeline {
    if (s.cat === TimelineCat.Relation && (s.type === 2 || s.type === 3 || s.type === 4)) {
      // @ts-expect-error 写一个 type safe的太麻烦了，直接忽略了
      return {
        cat: TimelineCat.Relation,
        type: s.type,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        memo: php.unserialize(s.memo),
        id: s.id,
      };
    } else if (s.cat === TimelineCat.Say) {
      if (s.type === 2) {
        return {
          cat: TimelineCat.Say,
          type: 2,
          memo: php.unserialize(s.memo) as RenameMemo,
          id: s.id,
        };
      }
      return { cat: TimelineCat.Say, type: 0, memo: s.memo, id: s.id };
    } else if (s.cat === TimelineCat.Index) {
      const memo = php.unserialize(s.memo) as IndexMemo;
      if (typeof memo.idx_id === 'string') {
        memo.idx_id = Number.parseInt(memo.idx_id);
      }
      return { cat: s.cat, type: 0, memo: memo, id: s.id };
    } else if (s.cat === TimelineCat.Doujin) {
      const memo = php.unserialize(s.memo) as DoujinMemo;
      if (typeof memo.id === 'string') {
        memo.id = Number.parseInt(memo.id);
      }
      return { cat: s.cat, type: s.type as 0, memo: memo, id: s.id };
    } else if (s.cat === TimelineCat.Progress) {
      const memo = php.unserialize(s.memo) as ProgressMemo;
      if (typeof memo.subject_id === 'string') {
        memo.subject_id = Number.parseInt(memo.subject_id);
      }

      if (typeof memo.eps_total === 'string') {
        memo.eps_total = Number.parseInt(memo.eps_total);
      }

      if (memo.vols_total === '??') {
        memo.vols_total = undefined;
      }

      for (const [key, value] of Object.entries(memo)) {
        // eslint-disable-next-line   @typescript-eslint/no-unnecessary-condition
        if (value === null) {
          // @ts-expect-error php null
          memo[key] = undefined;
        }
      }

      return { cat: s.cat, type: s.type as 0, memo: memo, id: s.id };
    } else if (
      s.cat === TimelineCat.Wiki ||
      s.cat === TimelineCat.Mono ||
      s.cat === TimelineCat.Subject ||
      s.cat === TimelineCat.Blog
    ) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      return { cat: s.cat, type: s.type as 0, memo: php.unserialize(s.memo), id: s.id };
    }

    throw new Error(`unexpected cat ${s.cat} type ${s.type}`);
  },

  validate(t: Timeline) {
    const C = validator[t.cat][t.type];
    if (C) {
      const valid = [...C.Errors(t.memo)];
      if (valid.length > 0) {
        throw new TypeError(
          'not valid:\n' +
            JSON.stringify(t) +
            '\n' +
            valid.map((x) => `${x.path}: ${x.message}`).join('\n'),
        );
      }
    }
  },
};
