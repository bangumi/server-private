/**
 * 从配置文件和环境变量读取配置。
 *
 * 在设置了 `CHII_CONFIG_FILE` 环境变量时会加载，如果未设置或者是空字符串则会从 `projectRoot/config.yaml` 加载。
 *
 * 配置文件参考 `config.example.yaml`。
 *
 * {@link schema} 定义了配置文件的 json schema
 *
 * 可以使用环境变量会覆盖对应的文件配置，如 `MYSQL_DB` 会覆盖 `mysql.db`, 具体可用的环境变量和对应的配置项也定义在 {@link schema}。
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

import type { Static, TSchema } from '@sinclair/typebox';
import { Kind, Type as t } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import ajvKeywords from 'ajv-keywords';
import * as yaml from 'js-yaml';
import * as lo from 'lodash-es';

// read from env

const { HTTPS_PROXY = '', NODE_ENV, REF, CHII_CONFIG_FILE } = process.env;

export const production = NODE_ENV === 'production';
export const stage = NODE_ENV === 'stage';
export const developing = NODE_ENV === 'development';
export const testing = NODE_ENV === 'test';

export const projectRoot = url.fileURLToPath(new URL('..', import.meta.url));
export const pkg = JSON.parse(
  fs.readFileSync(path.resolve(projectRoot, 'package.json'), 'utf8'),
) as { version: string };

export const VERSION = developing ? 'development' : REF || pkg.version;

export const redisPrefix = `graphql-${VERSION}`;

export { HTTPS_PROXY };

const schema = t.Object({
  server: t.Object({
    port: t.Integer({ default: 4000, env: 'PORT' }),
    host: t.String({ default: '0.0.0.0', env: 'HOST' }),
    requestIDHeader: t.String({ default: 'x-request-id', transform: ['toLowerCase'] }),
    clientIpHeader: t.String({ default: 'x-real-ip', transform: ['toLowerCase'] }),
  }),

  siteUrl: t.String({ default: 'https://next.bgm.tv ', transform: ['trim'] }),

  nsfw_word: t.Optional(t.String({ minLength: 1 })),
  disable_words: t.Optional(t.String()),
  banned_domain: t.Optional(t.String()),

  php_session_secret_key: t.String({
    default: 'default-secret-key-not-safe-in-production',
    env: 'PHP_SESSION_SECRET_KEY',
    pattern: new RegExp('[0-9a-zA-Z]').source,
    description: '用于读取 `bgm.tv` 域名的 cookies session',
  }),

  redisUri: t.String({ default: 'redis://127.0.0.1:3306/0', env: 'REDIS_URI' }),

  image: t.Object({
    gatewayDomain: t.String({ default: 'lain.bgm.tv' }),
    provider: t.Enum(
      {
        s3: 's3',
        FS: 'fs',
      } as const,
      { default: 'fs', env: 'CHII_IMAGE_PROVIDER' },
    ),
    imaginaryUrl: t.Optional(
      t.String({
        description: 'url to docker image running https://github.com/h2non/imaginary',
      }),
    ),
    fs: t.Object({
      path: t.String({ default: './tmp/images' }),
    }),
    s3: t.ReadonlyOptional(
      t.Object({
        endPoint: t.String({ env: 'CHII_IMAGE_S3_ENDPOINT' }),
        bucket: t.String({ default: 'chii-image', env: 'CHII_IMAGE_S3_BUCKET' }),
        port: t.Integer({ default: 9000, env: 'CHII_IMAGE_S3_PORT' }),
        useSSL: t.Boolean({ default: false, env: 'CHII_IMAGE_S3_USE_SSL' }),
        accessKey: t.String({ env: 'CHII_IMAGE_S3_ACCESS_KEY' }),
        secretKey: t.String({ env: 'CHII_IMAGE_S3_SECRET_KEY' }),
      }),
    ),
  }),

  turnstile: t.Object({
    secretKey: t.String({
      default: '1x0000000000000000000000000000000AA',
      env: 'TURNSTILE_SECRET_KEY',
    }),
    siteKey: t.String({ default: '1x00000000000000000000AA', env: 'TURNSTILE_SITE_KEY' }),
  }),

  mysql: t.Object({
    db: t.String({ default: 'bangumi', env: 'MYSQL_DB' }),
    host: t.String({ default: '127.0.0.1', env: 'MYSQL_HOST' }),
    port: t.Integer({ default: 3306, env: 'MYSQL_PORT' }),
    user: t.String({ default: 'user', env: 'MYSQL_USER' }),
    password: t.String({ default: 'password', env: 'MYSQL_PASS' }),
  }),
});

function readConfig(): Static<typeof schema> {
  const configFilePath = CHII_CONFIG_FILE || path.resolve(projectRoot, 'config.yaml');

  let configFileContent = '{}';
  if (fs.existsSync(configFilePath)) {
    configFileContent = fs.readFileSync(configFilePath, 'utf8');
  }

  const config = lo.merge(Value.Create(schema), yaml.load(configFileContent));

  function readFromEnv(keyPath: string[], o: TSchema) {
    if (o[Kind] === 'Object') {
      for (const [key, value] of Object.entries(o.properties as Record<string, TSchema>)) {
        readFromEnv([...keyPath, key], value);
      }

      return;
    }

    const envKey = o.env as string | undefined;
    if (envKey) {
      const v = process.env[envKey];
      if (v !== undefined) {
        lo.set(config, keyPath, v);
      }
    }
  }

  readFromEnv([], schema);

  const ajv = new Ajv({ allErrors: true, coerceTypes: true, keywords: ['env'], strict: false });
  addFormats(ajv);
  ajvKeywords(ajv, 'transform');

  const check = ajv.compile(schema);

  const valid = check(config);

  if (!valid) {
    const errorMessage =
      check.errors
        ?.map(
          (x) => '  ' + (x.instancePath + ': ' + (x.message ?? `wrong data type ${x.schemaPath}`)),
        )
        .join('\n') ?? '';

    throw new TypeError('failed to validate config file:\n' + errorMessage);
  }

  return config;
}

// read config file
const config = readConfig();

export default config;
export const imageDomain = config.image.gatewayDomain;
export const siteUrl = config.siteUrl;
