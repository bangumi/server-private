import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import config from '@app/lib/config';

if (config.image.fs === undefined) {
  throw new Error('missing image fs storage config');
}

const BasePath = config.image.fs.path;

export async function uploadImage(p: string, content: Buffer): Promise<void> {
  p = path.join(BasePath, p);

  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, content);
}
