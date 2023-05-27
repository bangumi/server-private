/** Discuz encryption/decryption, don't use it for non-legacy encryption or decryption */

import { md5 } from '@app/lib/utils/index.ts';

/* eslint-disable unicorn/prefer-code-point,@typescript-eslint/no-non-null-assertion */

/**
 * @param str - 加密内容
 * @param decode - 解密/加密
 * @param key - 密钥
 * @returns 加密串
 */
function authCode(str: string, decode: boolean, key = '') {
  key = md5(key);

  const buf = decode ? Buffer.from(str, 'base64') : Buffer.from(md5(str + key) + str);

  let result = '';

  const box: number[] = Array.from({ length: 256 });
  const randomKey: number[] = Array.from({ length: 256 });
  for (let i = 0; i < 256; i++) {
    randomKey[i] = key.charCodeAt(i % key.length);
    box[i] = i;
  }

  for (let i = 0, j = 0; i < 256; i++) {
    j = (j + box[i]! + randomKey[i]!) % 256;

    const tmp = box[i]!;
    box[i] = box[j]!;
    box[j] = tmp;
  }

  for (let a = 0, j = 0, i = 0; i < buf.length; i++) {
    a = (a + 1) % 256;
    j = (j + box[a]!) % 256;

    const tmp = box[a]!;
    box[a] = box[j]!;
    box[j] = tmp;

    result += String.fromCodePoint(buf[i]! ^ box[(box[a]! + box[j]!) % 256]!);
  }

  if (decode) {
    // eslint-disable-next-line @typescript-eslint/prefer-string-starts-ends-with
    if (result.slice(0, 8) === md5(result.slice(8) + key).slice(0, 8)) {
      return result.slice(8);
    }

    return '';
  }
  return Buffer.from(result).toString('base64').replaceAll('=', '');
}

export function decode(str: string, key: string) {
  return authCode(str, true, key);
}

export function encode(str: string, key = '') {
  return authCode(str, false, key);
}
