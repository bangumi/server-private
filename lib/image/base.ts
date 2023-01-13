import { IMAGE_STORAGE } from '@app/lib/config';

export interface ImageFS {
  uploadImage(path: string, content: Buffer): Promise<void>;
}

// TODO: add s3 support
export async function getImpl(): Promise<ImageFS> {
  if (IMAGE_STORAGE === 'sftp') {
    return await import('./sftp');
  } else if (IMAGE_STORAGE === 'local-fs') {
    return await import('./fs');
  }

  throw new Error('missing image provider');
}
