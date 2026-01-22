import { promisify } from 'node:util';
import * as zlib from 'node:zlib';

import type { RevText } from '@app/lib/rev/type.ts';
import { decode } from '@app/lib/utils';

const decompress = promisify(zlib.inflateRaw);
const compress = promisify(zlib.deflateRaw);

export async function deserializeRevText(o: Buffer): Promise<Record<string, unknown>> {
  return decode(await decompress(o)) as Record<string, unknown>;
}

export async function serializeRevText(o: unknown): Promise<Buffer> {
  return await compress(JSON.stringify(o));
}

export async function parseRevTexts<R = unknown>(
  revTexts: RevText[],
): Promise<
  {
    id: number;
    data: Record<number, R>;
  }[]
> {
  return await Promise.all(
    revTexts.map(async (x) => {
      return {
        id: x.revTextId,
        data: (await deserializeRevText(x.revText)) as Record<number, R>,
      };
    }),
  );
}
