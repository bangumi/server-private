import * as crypto from 'node:crypto';

import { customAlphabet } from 'nanoid/async';

const base62Chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
if (base62Chars.length !== 62) {
  throw new TypeError('characters is not 62 length');
}

const generator = customAlphabet(base62Chars, 32);

export const randomBase62String = (size: number) => generator(size);

export async function randomBytes(size: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.randomBytes(size, (err, buf) => {
      if (err) {
        reject(err);
      } else {
        resolve(buf);
      }
    });
  });
}

/**
 * Parse string as int, strictly
 *
 * 避免出现 `parseInt('1abc') === 1` 的问题
 */
export function intval(value: string | number): number {
  const v = parseIntStrict(value);
  if (v === undefined) {
    throw new Error(`"${value}" is not a valid integer`);
  }
  return v;
}

function parseIntStrict(integer: string | number) {
  if (typeof integer === 'number') {
    return Number.isInteger(integer) ? integer : undefined;
  }

  const n = Number(integer);

  if (Number.isInteger(n)) {
    return n;
  }
}

export function md5(s: string) {
  return crypto.createHash('md5').update(s).digest('hex');
}
