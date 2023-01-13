import * as mime from 'mime-types';
import * as minio from 'minio';

import config from '@app/lib/config';

const s3 = config.image.s3;

const client = new minio.Client({
  endPoint: s3.endPoint,
  port: s3.port,
  useSSL: s3.useSSL,
  accessKey: s3.accessKey,
  secretKey: s3.secretKey,
});

if (!(await client.bucketExists(s3.bucket))) {
  throw new Error('please manually create a bucket named ' + JSON.stringify(s3.bucket));
}

export async function uploadImage(path: string, content: Buffer): Promise<void> {
  const metadata = {} as { ['content-type']?: string };

  const type = mime.lookup(path);
  if (type) {
    metadata['content-type'] = type;
  }

  await client.putObject(s3.bucket, path, content, metadata);
}
