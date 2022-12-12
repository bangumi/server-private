/**
 * 从环境变量和 `projectRoot/config.yaml` 读取配置 可以设置的值 env.NODE_ENV 'production' | 'stage' | 'test' 在测试时会被
 * vitest 会设置此环境变量为 'test'，在生产环境会被设置为 'production', 在测试部属环境被会设置为 stage
 *
 * Env.REDIS_URI 默认 'redis://127.0.0.1:3306/0'
 *
 * Env.HCAPTCHA_SECRET_KEY 默认为 hCaptcha 的开发用key '0x0000000000000000000000000000000000000000'
 *
 * Env.HTTPS_PROXY 默认为空，如果设置了的话，会作为 hCaptcha 的代理
 *
 * Env.DATABASE_URL prisma 会使用这个环境变量，未在这个文件内读取
 *
 * 配置文件见 `configFileType` 变量，定义了配置文件的 json schema
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import url from 'node:url';

import type { Static } from '@sinclair/typebox';
import { Type as t } from '@sinclair/typebox';
import Ajv from 'ajv';
import type { RedisOptions } from 'ioredis';
import * as yaml from 'js-yaml';

// read from env

const {
  HCAPTCHA_SECRET_KEY = '0x0000000000000000000000000000000000000000',
  HTTPS_PROXY = '',
  TURNSTILE_SECRET_KEY = '1x0000000000000000000000000000000AA',
  TURNSTILE_SITE_KEY = '1x00000000000000000000AA',
  NODE_ENV,
  REDIS_URI,
} = process.env;

export const production = NODE_ENV === 'production';
export const stage = NODE_ENV === 'stage';
export const testing = NODE_ENV === 'test';

export const projectRoot = url.fileURLToPath(new URL('..', import.meta.url));
export const pkg = JSON.parse(
  fs.readFileSync(path.resolve(projectRoot, 'package.json'), 'utf8'),
) as { version: string };

export const redisPrefix = `graphql-${pkg.version}`;

const u = url.parse(REDIS_URI ?? 'redis://127.0.0.1:3306/0');

const [username, password] = (u.auth ?? '').split(':', 2);

export const redisOption = {
  host: u.hostname ?? '127.0.0.1',
  port: u.port ? Number.parseInt(u.port) : 3306,
  db: u.pathname ? Number.parseInt(u.pathname.slice(1)) : 0,
  username,
  password,
  lazyConnect: true,
} satisfies RedisOptions;

export { HCAPTCHA_SECRET_KEY, HTTPS_PROXY, TURNSTILE_SITE_KEY, TURNSTILE_SECRET_KEY };

// read config file

const configFilePath = path.resolve(projectRoot, 'config.yaml');

let configFileContent = '{}';
if (fs.existsSync(configFilePath)) {
  configFileContent = fs.readFileSync(configFilePath, 'utf8');
}

export const fileConfig = yaml.load(configFileContent) as Static<typeof configFileType>;

// validate config file

const configFileType = t.Object({
  nsfw_word: t.Optional(t.String({ minLength: 1 })),
  disable_words: t.Optional(t.String()),
  banned_domain: t.Optional(t.String()),
});

const schema = new Ajv({ allErrors: true }).compile(configFileType);

const valid = schema(fileConfig);

if (!valid) {
  const errorMessage =
    schema.errors?.map((x) => '  ' + (x.message ?? `wrong data type ${x.schemaPath}`)).join('\n') ??
    '';

  throw new TypeError('failed to validate config file:\n' + errorMessage);
}
