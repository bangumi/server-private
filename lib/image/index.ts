import * as posix from 'node:path/posix';

import { createError } from '@fastify/error';
import { StatusCodes } from 'http-status-codes';

import { getImpl } from './base.ts';

export const SubjectCoverPrefix = 'cover/l/';
export const MonoCoverPrefix = 'crt/l/';

export const ImageTypeCanBeUploaded = ['jpeg', 'jpg', 'png', 'webp'];

const impl = await getImpl();

export async function uploadSubjectImage(path: string, content: Buffer): Promise<void> {
  await impl.uploadImage(posix.join(SubjectCoverPrefix, path), content);
}

export async function deleteSubjectImage(s: string): Promise<void> {
  await impl.deleteImage(posix.join(SubjectCoverPrefix, s));
}

export async function uploadMonoImage(path: string, content: Buffer): Promise<void> {
  await impl.uploadImage(posix.join(MonoCoverPrefix, path), content);
}

export async function deleteMonoImage(s: string): Promise<void> {
  await impl.deleteImage(posix.join(MonoCoverPrefix, s));
}

export const ImageFileTooLarge = createError(
  'IMAGE_FILE_TOO_LARGE',
  'uploaded image file is too large',
  StatusCodes.BAD_REQUEST,
);
export const UnsupportedImageFormat = createError(
  'IMAGE_FORMAT_NOT_SUPPORT',
  `not valid image file, only support ${ImageTypeCanBeUploaded.join(', ')}`,
  StatusCodes.BAD_REQUEST,
);

export const sizeLimit = 4 * 1024 * 1024;
