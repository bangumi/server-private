import * as crypto from 'node:crypto';

const base62Chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
if (base62Chars.length !== 62) {
  throw new TypeError('characters is not 62 length');
}

export function customAlphabet(
  alphabet: string,
  defaultSize = 21,
): (size: number) => Promise<string> {
  const mask = (2 << (31 - Math.clz32((alphabet.length - 1) | 1))) - 1;
  const step = Math.ceil((1.6 * mask * defaultSize) / alphabet.length);
  const tick: (init: string, size: number) => Promise<string> = (
    prefix: string,
    size: number = defaultSize,
  ) =>
    randomBytes(step).then((bytes: Buffer) => {
      let i = step;
      while (i--) {
        // @ts-expect-error ignore string overload
        prefix += alphabet[bytes[i] & mask] || '';
        if (prefix.length === size) {
          return prefix;
        }
      }
      return tick(prefix, size);
    });
  return (size) => tick('', size);
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
