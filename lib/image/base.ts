import config, { Image, testing } from '@app/lib/config.ts';
import { logger } from '@app/lib/logger.ts';

export interface ImageFS {
  uploadImage(path: string, content: Buffer): Promise<void>;

  deleteImage(path: string): Promise<void>;
}

export async function getImpl(): Promise<ImageFS> {
  if (!testing) {
    logger.info(`storage uploaded image in ${config.image.provider}`);
  }

  switch (config.image.provider) {
    case Image.FileSystem: {
      return await import('./fs.ts');
    }
    case Image.S3: {
      return await import('./s3.ts');
    }
    // No default
  }

  throw new Error(`missing image provider implement for "${config.image.provider as string}"`);
}
