import { customAlphabet } from 'nanoid/async';

const base62Chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
if (base62Chars.length !== 62) {
  throw new TypeError('characters is not 62 length');
}

const generator = customAlphabet(base62Chars, 32);

export const randomBase62String = (size: number) => generator(size);
