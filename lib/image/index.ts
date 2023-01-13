import { getImpl } from './base';

const impl = await getImpl();

export async function uploadImage(path: string, content: Buffer): Promise<void> {
  await impl.uploadImage(path, content);
}
