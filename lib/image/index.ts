import * as posix from 'node:path/posix';

import { getImpl } from './base';

export const SubjectCoverPrefix = 'cover/l/';

export const SupportedImageExtension = ['jpeg', 'jpg', 'png'];

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

/** @returns 最终图片文件的相对路径 */
export async function uploadSubjectImage(path: string, content: Buffer): Promise<void> {
  await impl.uploadImage(posix.join(SubjectCoverPrefix, path), content);
}
