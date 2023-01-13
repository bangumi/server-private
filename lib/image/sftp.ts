import * as posix from 'node:path/posix';

import {
  LOCAL_IMAGE_STORAGE_PATH,
  SFTP_BASE_PATH,
  SFTP_HOST,
  SFTP_PASSWORD,
  SFTP_USERNAME,
} from '@app/lib/config';
import Client from '@app/vendor/sftp';

const sftp = new Client();

await sftp.connect({
  host: SFTP_HOST,
  port: 22,
  username: SFTP_USERNAME,
  password: SFTP_PASSWORD,
});

export async function uploadImage(path: string, content: Buffer): Promise<void> {
  path = posix.join(LOCAL_IMAGE_STORAGE_PATH, path);

  await sftp.mkdir(posix.dirname(path), true);
  await sftp.put(content, posix.join(SFTP_BASE_PATH, path));
}
