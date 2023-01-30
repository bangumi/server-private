/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import config, { testing } from '@app/lib/config';
import { logger } from '@app/lib/logger';

export interface ImageFS {
  uploadImage(path: string, content: Buffer): Promise<void>;

  deleteImage(path: string): Promise<void>;
}

export async function getImpl(): Promise<ImageFS> {
  if (!testing) {
    logger.info(`storage uploaded image in ${config.image.provider}`);
  }

  switch (config.image.provider) {
    case 'fs': {
      return await import('./fs');
    }
    case 's3': {
      return await import('./s3');
    }
    // No default
  }

  throw new Error(`missing image provider implement for "${config.image.provider as string}"`);
}
