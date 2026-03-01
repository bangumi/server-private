import { createError } from '@fastify/error';
import * as diff from 'diff';
import { StatusCodes } from 'http-status-codes';
import * as lo from 'lodash-es';

import type { SubjectType } from '@app/lib/subject/type.ts';
import { findSubjectRelationType } from '@app/vendor';

export const WikiChangedError = createError<[string]>(
  'WIKI_CHANGED',
  "expected data doesn't match\n%s",
  StatusCodes.BAD_REQUEST,
);

export function matchExpected<
  E extends Record<string, string | string[] | null>,
  C extends Record<keyof E, string | string[]>,
>(expectedObject: E, currentObject: C) {
  for (const [key, expected] of Object.entries(expectedObject)) {
    if (expected === undefined || expected === null) {
      continue;
    }

    const current = currentObject[key as keyof E];

    if (!lo.isEqual(expected, current)) {
      throw new WikiChangedError(readableDiff(key, expected, current));
    }
  }
}

function readableDiff<T extends string | string[]>(name: string, expected: T, current: T): string {
  if (Array.isArray(expected)) {
    return diff.createPatch(
      name,
      expected.join('\n') + '\n',
      (current as string[]).join('\n') + '\n',
      'expected',
      'current',
    );
  }

  return diff.createPatch(name, `${expected}\n`, `${current}\n`, 'expected', 'current');
}

export const reverseRelations = {
  2: [
    // 动画-动画
    [2, 3], // 前传-续集
    [4, 5], // 总集篇-全集
    [6, 12], // 番外篇-主线故事
    [11, 12], // 衍生-主线故事
  ],
  1: [
    // 书籍-书籍
    [1002, 1003], // 系列-单行本
    [1005, 1006], // 前传-续集
    [1007, 1008], // 番外篇-主线故事
  ],
  4: [
    // 游戏-游戏
    [4002, 4003], // 前传-续集
    [4006, 4009], // 外传-主线故事,
    [4018, 4019], // 合集-收录作品
  ],
  3: [],
  6: [
    [2, 3], // 前传-续集
    [4, 5], // 总集篇-全集
    [6, 12], // 番外篇-主线故事
    [11, 12], // 衍生-主线故事
  ],
};

export function isRelationViceVersa(subjectType: number, relationType: number): boolean {
  const rtype = findSubjectRelationType(subjectType, relationType);
  if (!rtype) throw new Error('invalid relation type');
  return !rtype.skip_vice_versa;
}

export function getReverseRelation(
  subjectType: SubjectType,
  relatedType: SubjectType,
  relationType: number,
): number {
  if (relatedType !== subjectType) return 1;
  for (const duo of reverseRelations[subjectType]) {
    const relatedIndex = duo.indexOf(relationType);
    if (!(relatedIndex + 1)) continue;
    const reverseRelationType = duo[+!!relatedIndex];
    if (reverseRelationType) {
      return reverseRelationType;
    } else {
      break;
    }
  }
  return relationType;
}
