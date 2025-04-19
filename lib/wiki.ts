import { createError } from '@fastify/error';
import { StatusCodes } from 'http-status-codes';

export const WikiChangedError = createError<[string, unknown, unknown]>(
  'WIKI_CHANGED',
  "expected data doesn't match, %s changed, expecting %j, currently %j",
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

    if (w[key as keyof A] !== value) {
      throw new WikiChangedError(key, value, w[key as keyof A]);
    }
  }
}
