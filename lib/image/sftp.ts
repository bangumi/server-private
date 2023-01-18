import * as posix from 'node:path/posix';

import config from '@app/lib/config';
import Client from '@app/vendor/sftp';

if (config.image.sftp === undefined) {
  throw new Error('missing image sftp storage config');
}

const sftp = new Client();

await sftp.connect({
  host: config.image.sftp.host,
  port: config.image.sftp.port,
  username: config.image.sftp.username,
  password: config.image.sftp.password,
});

const SFTP_BASE_PATH = config.image.sftp.path;

export async function uploadImage(path: string, content: Buffer): Promise<void> {
  path = posix.join(SFTP_BASE_PATH, path);

  await sftp.mkdir(posix.dirname(path), true);
  await sftp.put(content, posix.join(SFTP_BASE_PATH, path));
}
