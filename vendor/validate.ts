import type { Static, TSchema } from 'typebox';
import { Value } from 'typebox/value';

export function assertValue<T extends TSchema>(
  schema: T,
  value: unknown,
  source: string,
): asserts value is Static<T> {
  if (Value.Check(schema, value)) {
    return;
  }
  const [error] = Value.Errors(schema, value);
  throw new Error(`invalid ${source}: ${error?.message ?? 'unknown error'}`);
}
