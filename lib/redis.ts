import * as url from 'node:url';

import Redis from 'ioredis';

const u = url.parse(process.env.REDIS_URI ?? 'redis://127.0.0.1:3306/0');

const [username, password] = (u.auth ?? '').split(':', 2);

export function createRedis() {
  return new Redis({
    host: u.hostname ?? '127.0.0.1',
    port: u.port ? Number.parseInt(u.port) : 3306,
    db: u.pathname ? Number.parseInt(u.pathname.slice(1)) : 0,
    username: username,
    password: password,
  });
}

const r = createRedis();

export default r;
