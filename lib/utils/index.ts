import * as crypto from 'node:crypto';

const base62Chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const base62CharsLength = base62Chars.length;
const base62MaxByte = 255 - (256 % base62Chars.length);

export function randomBase62String(length: number): string {
  const step = Math.trunc(length + length / 4);
  let result = '';

  let char: string | undefined;

  // eslint-disable-next-line no-constant-condition,@typescript-eslint/no-unnecessary-condition
  while (true) {
    const randomBytes = crypto.randomBytes(step);

    for (const rb of randomBytes) {
      if (rb > base62MaxByte) {
        continue;
      }

      char = base62Chars[rb % base62CharsLength];

      if (char === undefined) {
        continue;
      }

      result += char;

      if (result.length === length) {
        return result;
      }
    }
  }
}
