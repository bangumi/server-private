import * as posix from 'node:path/posix';

import { getImpl } from './base';

export const SubjectCoverPrefix = 'pic/cover/l/';

export const SupportedImageExtension = ['webp', 'jpeg', 'jpg', 'png'];

// 在 handler 中验证图片。
export function fileExtension(format: string): string | undefined {
  if (!SupportedImageExtension.includes(format)) {
    return;
  }

  if (format === 'jpeg') {
    return 'jpg';
  }

  return format;
}

const impl = await getImpl();

export async function uploadSubjectImage(path: string, content: Buffer): Promise<void> {
  await impl.uploadImage(posix.join('cover/l/', path), content);
}
