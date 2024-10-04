import { createError } from '@fastify/error';
import { StatusCodes } from 'http-status-codes';

export const WikiChangedError = createError<[string]>(
  'WIKI_CHANGED',
  "expected data doesn't match, %s changed",
  StatusCodes.BAD_REQUEST,
);

export function matchExpected<A extends object, B extends Record<keyof A, string>>(
  w: A,
  expected: Partial<B>,
) {
  for (const [key, value] of Object.entries(expected)) {
    if (value === undefined) {
      continue;
    }

    if (w[key as keyof A] !== value) {
      throw new WikiChangedError(key);
    }
  }
}
