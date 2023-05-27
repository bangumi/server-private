import * as fsp from 'node:fs/promises';
import * as path from 'node:path';

import config from '@app/lib/config.ts';

const BasePath = config.image.fs.path;

export async function uploadImage(p: string, content: Buffer): Promise<void> {
  p = path.join(BasePath, p);

  await fsp.mkdir(path.dirname(p), { recursive: true });
  await fsp.writeFile(p, content);
}

export async function deleteImage(p: string): Promise<void> {
  try {
    await fsp.unlink(path.join(BasePath, p));
  } catch (error: unknown) {
    // ignore file not found error
    if ((error as { code?: string }).code === 'ENOENT') {
      return;
    }

    throw error;
  }
}
