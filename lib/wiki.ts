import { createError } from '@fastify/error';
import * as diff from 'diff';
import { StatusCodes } from 'http-status-codes';

export const WikiChangedError = createError<[string, string]>(
  'WIKI_CHANGED',
  "expected data doesn't match, %s changed\n%s",
  StatusCodes.BAD_REQUEST,
);

export function matchExpected<A extends object, B extends Record<keyof A, string | null>>(
  w: A,
  expected: Partial<B>,
) {
  for (const [key, value] of Object.entries(expected)) {
    if (value === undefined || value === null) {
      continue;
    }

    const expected = w[key as keyof A];
    if (expected !== value) {
      if (typeof value === 'string') {
        throw new WikiChangedError(key, diff.createPatch(key, expected as string, value));
      }

      throw new WikiChangedError(key, `- ${JSON.stringify(expected)}\n+ ${JSON.stringify(value)}`);
    }
  }
}
