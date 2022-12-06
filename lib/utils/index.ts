import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';

export async function* walk(dir: string): AsyncGenerator<string> {
  for await (const d of await fs.promises.opendir(dir)) {
    const entry = path.join(dir, d.name);
    if (d.isDirectory()) yield* walk(entry);
    else if (d.isFile()) yield entry;
  }
}

const base62Chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const base62CharsLength = base62Chars.length;
const base62MaxByte = 255 - (256 % base62Chars.length);

export function randomBase62String(length: number) {
  let result = '';
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const randomBytes = crypto.randomBytes(Math.trunc(length / 4));

    for (const rb of randomBytes) {
      if (rb > base62MaxByte) {
        continue;
      }

      const char = base62Chars[rb % base62CharsLength];

      result += char;

      if (result.length === length) {
        return result;
      }
    }
  }
}
