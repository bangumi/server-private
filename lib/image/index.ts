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

export async function uploadImage(path: string, content: Buffer): Promise<void> {
  await impl.uploadImage(path, content);
}
