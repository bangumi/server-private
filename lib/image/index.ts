import type { FormatEnum } from 'sharp';

import { getImpl } from './base';

// 在 handler 中验证图片。
export const SupportedImageExtension: (keyof FormatEnum)[] = ['webp', 'jpeg', 'jpg', 'png'];

const impl = await getImpl();

export async function uploadImage(path: string, content: Buffer): Promise<void> {
  await impl.uploadImage(path, content);
}
