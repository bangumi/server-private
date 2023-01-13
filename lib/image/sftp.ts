import * as posix from 'node:path/posix';

import config from '@app/lib/config';
import Client from '@app/vendor/sftp';

const sftp = new Client();

await sftp.connect({
  host: config.image_storage.sftp.host,
  port: config.image_storage.sftp.port,
  username: config.image_storage.sftp.username,
  password: config.image_storage.sftp.password,
});

const SFTP_BASE_PATH = config.image_storage.sftp.path;

export async function uploadImage(path: string, content: Buffer): Promise<void> {
  path = posix.join(SFTP_BASE_PATH, path);

  await sftp.mkdir(posix.dirname(path), true);
  await sftp.put(content, posix.join(SFTP_BASE_PATH, path));
}
