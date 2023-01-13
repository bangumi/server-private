import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import { LOCAL_IMAGE_STORAGE_PATH } from '@app/lib/config';

export async function uploadImage(p: string, content: Buffer): Promise<void> {
  p = path.join(LOCAL_IMAGE_STORAGE_PATH, p);

  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, content);
}
