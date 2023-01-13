/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import config from '@app/lib/config';

export interface ImageFS {
  uploadImage(path: string, content: Buffer): Promise<void>;
}

// TODO: add s3 to replace sftp
export async function getImpl(): Promise<ImageFS> {
  if (config.image.provider === 'sftp') {
    return await import('./sftp');
  } else if (config.image.provider === 'fs') {
    return await import('./fs');
  }

  throw new Error('missing image provider');
}
