import { createError } from '@fastify/error';
import * as diff from 'diff';
import { StatusCodes } from 'http-status-codes';
import * as lo from 'lodash-es';

import { type SubjectType, SubjectTypeCN } from '@app/lib/subject/type.ts';

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

export function genRelationComment(
  relatedType: SubjectType,
  commitMessage: string,
  newRelationEdit: unknown[],
  existingRelationEdit: unknown[],
  deleteRelationEdit: unknown[],
) {
  return `${SubjectTypeCN(relatedType) || '条目'}关联${
    newRelationEdit.length === 0 &&
    existingRelationEdit.length === 0 &&
    deleteRelationEdit.length > 0
      ? '删除'
      : '修改'
  }${commitMessage ? ` - ${commitMessage}` : ''}`;
}
