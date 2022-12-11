import * as crypto from 'node:crypto';

const base62Chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const base62CharsLength = base62Chars.length;
const base62MaxByte = 255 - (256 % base62Chars.length);

export async function randomBase62String(length: number): Promise<string> {
  const step = Math.trunc(length + length / 4);
  const buf = Buffer.allocUnsafe(step);

  let result = '';

  let char: string | undefined;
  // eslint-disable-next-line no-constant-condition,@typescript-eslint/no-unnecessary-condition
  while (true) {
    const b = await randomFill(buf);
    for (const rb of b) {
      if (rb > base62MaxByte) {
        continue;
      }

      char = base62Chars[rb % base62CharsLength];

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      result += char!;

      if (result.length === length) {
        return result;
      }
    }
  }
}

async function randomFill(buf: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.randomFill(buf, (err, buf) => {
      if (err) {
        reject(err);
      } else {
        resolve(buf);
      }
    });
  });
}
