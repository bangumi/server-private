import * as posix from 'node:path/posix';

import { getImpl } from './base.ts';

export const SubjectCoverPrefix = 'cover/l/';

export const ImageTypeCanBeUploaded = ['jpeg', 'jpg', 'png', 'webp'];

const impl = await getImpl();

/** @returns 最终图片文件的相对路径 */
export async function uploadSubjectImage(path: string, content: Buffer): Promise<void> {
  await impl.uploadImage(posix.join(SubjectCoverPrefix, path), content);
}

export async function deleteSubjectImage(s: string): Promise<void> {
  await impl.deleteImage(posix.join(SubjectCoverPrefix, s));
}
