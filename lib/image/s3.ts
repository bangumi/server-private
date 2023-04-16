import {
  CreateBucketCommand,
  DeleteObjectCommand,
  ListBucketsCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import * as mime from 'mime-types';

import config from '@app/lib/config';

const s3 = config.image.s3;

const client = new S3Client({
  endpoint: {
    protocol: s3.useSSL ? 'https:' : 'http:',
    hostname: s3.endPoint,
    port: s3.port,
    path: '/',
  },
  forcePathStyle: true,
  credentials: {
    accessKeyId: s3.accessKey,
    secretAccessKey: s3.secretKey,
  },
  region: 'REGION',
});

const cmd = new ListBucketsCommand({});
const res = await client.send(cmd);
if (!res.Buckets?.some((x) => x.Name === s3.bucket)) {
  const cmd = new CreateBucketCommand({
    Bucket: s3.bucket,
  });

  await client.send(cmd);
}

export async function uploadImage(path: string, content: Buffer): Promise<void> {
  const metadata = {} as { ['content-type']?: string };

  const type = mime.lookup(path);
  if (type) {
    metadata['content-type'] = type;
  }

  await client.send(
    new PutObjectCommand({
      Bucket: s3.bucket,
      Key: path,
      ContentType: type || undefined,
      Body: content,
    }),
  );
}

export async function deleteImage(p: string): Promise<void> {
  await client.send(
    new DeleteObjectCommand({
      Bucket: s3.bucket,
      Key: p,
    }),
  );
}
