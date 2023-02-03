import { md5 } from '@app/lib/utils';

/* eslint-disable unicorn/prefer-code-point,@typescript-eslint/no-non-null-assertion */

/**
 * @param str - 加密内容
 * @param operation - 加密动作
 * @param key - 密钥
 * @returns 加密串
 */
function authcode(str: string, operation: 'DECODE' | 'ENCODE', key = '') {
  key = md5(key);

  const buf =
    operation === 'DECODE'
      ? Uint8Array.from(atob(str), (c) => c.charCodeAt(0))
      : Buffer.from(md5(str + key) + str);

  let result = '';

  const box: number[] = Array.from({ length: 256 });
  const rndkey: number[] = [];
  for (let i = 0; i < 256; i++) {
    rndkey[i] = key.charCodeAt(i % key.length);
    box[i] = i;
  }

  for (let i = 0, j = 0; i < 256; i++) {
    j = (j + box[i]! + rndkey[i]!) % 256;

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

    result += chr(buf[i]! ^ box[(box[a]! + box[j]!) % 256]!);
  }

  if (operation == 'DECODE') {
    // eslint-disable-next-line @typescript-eslint/prefer-string-starts-ends-with
    if (result.slice(0, 8) === md5(result.slice(8) + key).slice(0, 8)) {
      return result.slice(8);
    }

    return '';
  } else {
    return Buffer.from(result).toString('base64').replaceAll('=', '');
  }
}

function chr(s: number) {
  return String.fromCharCode(s);
}

export function decode(str: string, key: string) {
  return authcode(str, 'DECODE', key);
}

export function encode(str: string, key = '') {
  return authcode(str, 'ENCODE', key);
}
