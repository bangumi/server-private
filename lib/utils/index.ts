import { customAlphabet } from 'nanoid/async';

const base62Chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
if (base62Chars.length !== 62) {
  throw new TypeError('characters is not 62 length');
}

const generator = customAlphabet(base62Chars, 32);

export const randomBase62String = (size: number) => generator(size);

// parse int and throw error if NaN
export function parseIntX(n: string): number {
  const o = Number.parseInt(n);

  if (Number.isNaN(o)) {
    throw new TypeError(`n is not valid number`);
  }

  return o;
}
