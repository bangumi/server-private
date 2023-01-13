import { IMAGE_STORAGE_PROVIDER } from '@app/lib/config';

export interface ImageFS {
  /**
   * Upload image to storage. implement should check file exists and create directory if not exists
   *
   * @throws FileExistError
   */
  uploadImage(path: string, content: Buffer): Promise<void>;
}

// TODO: add s3 to replace sftp
export async function getImpl(): Promise<ImageFS> {
  if (IMAGE_STORAGE_PROVIDER === 'sftp') {
    return await import('./sftp');
  } else if (IMAGE_STORAGE_PROVIDER === 'local-fs') {
    return await import('./fs');
  }

  throw new Error('missing image provider');
}
