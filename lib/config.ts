/**
 * 从 `projectRoot/config.yaml` 和环境变量读取配置。 配置文件见 `config.example.yaml`。
 *
 * {@link configSchema} 定义了配置文件的 json schema
 *
 * 可以使用环境变量会覆盖对应的文件配置，如 `CHII_MYSQL_DB` 会覆盖 `mysql.db`, `CHII_TURNSTILE_SECRET-KEY` 会覆盖
 * `turnstile.secret_key`
 *
 * 除此之外可以设置的环境变量：
 *
 * {@link NODE_ENV}
 *
 * 'production' | 'stage' | 'test' 在测试时会被 vitest 会设置此环境变量为 'test'， 在生产环境会被设置为 'production',
 * 在测试部属环境被会设置为 stage
 *
 * {@link HTTPS_PROXY}
 *
 * 默认为空，如果设置了的话，会作为 turnstile 的代理
 *
 * {@link REF}
 *
 * 用于 docker 镜像，不用设置。
 *
 * @packageDocumentation
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as process from 'node:process';
import * as url from 'node:url';

import { Type as t } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';
import Ajv from 'ajv';
import * as yaml from 'js-yaml';
import * as lo from 'lodash-es';

// read from env

const { HTTPS_PROXY = '', NODE_ENV, REF } = process.env;

export const production = NODE_ENV === 'production';
export const stage = NODE_ENV === 'stage';
export const developing = NODE_ENV === 'development';
export const testing = NODE_ENV === 'test';

export const projectRoot = url.fileURLToPath(new URL('..', import.meta.url));
export const pkg = JSON.parse(
  fs.readFileSync(path.resolve(projectRoot, 'package.json'), 'utf8'),
) as { version: string };

export const redisPrefix = `graphql-${pkg.version}`;

export const VERSION = developing ? 'development' : REF || pkg.version;

export { HTTPS_PROXY };

/** WARNING: 所有的 key 都必需小写，而且不能包含下划线。 */
const configSchema = t.Object({
  nsfw_word: t.Optional(t.String({ minLength: 1 })),
  disable_words: t.Optional(t.String()),
  banned_domain: t.Optional(t.String()),

  redis: t.Object({
    uri: t.String({ default: 'redis://127.0.0.1:3306/0' }),
  }),

  image: t.Object({
    provider: t.Enum({ FS: 'fs', SFTP: 'sftp' } as const),
    fs: t.Object({
      path: t.String({ default: './tmp/images' }),
    }),
    sftp: t.Object({
      path: t.String({ default: '/var/lib/data/images' }),
      host: t.String(),
      port: t.Integer({ default: 22 }),
      username: t.String(),
      password: t.String(),
    }),
  }),

  turnstile: t.Object({
    secret: t.String({ default: '1x0000000000000000000000000000000AA', description: 'secret key' }),
    site: t.String({ default: '1x00000000000000000000AA', description: 'site key' }),
  }),

  mysql: t.Object({
    db: t.String({ default: 'bangumi' }),
    host: t.String({ default: '127.0.0.1' }),
    port: t.Integer({ default: 3306 }),
    user: t.String({ default: 'user' }),
    password: t.String({ default: 'password' }),
  }),
});

// read config file

const configFilePath = path.resolve(projectRoot, 'config.yaml');

let configFileContent = '{}';
if (fs.existsSync(configFilePath)) {
  configFileContent = fs.readFileSync(configFilePath, 'utf8');
}

const config = lo.assign(Value.Create(configSchema), yaml.load(configFileContent));
export default config;

const envPrefix = 'CHII_';

for (const [key, value] of Object.entries(process.env)) {
  if (key.startsWith(envPrefix)) {
    const keyPath = key.slice(envPrefix.length).toLowerCase().replace('_', '.').replace('-', '_');
    lo.set(config, keyPath, value);
  }
}

const ajv = new Ajv({ allErrors: true, coerceTypes: true });

const schema = ajv.compile(configSchema);

const valid = schema(config);

if (!valid) {
  const errorMessage =
    schema.errors?.map((x) => '  ' + (x.message ?? `wrong data type ${x.schemaPath}`)).join('\n') ??
    '';

  throw new TypeError('failed to validate config file:\n' + errorMessage);
}
