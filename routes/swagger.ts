import * as fs from 'node:fs';
import * as path from 'node:path';

import type { JSONObject } from '@fastify/swagger';
import swagger from '@fastify/swagger';
import { Type as t } from '@sinclair/typebox';
import type { FastifyInstance, FastifySchema } from 'fastify';
import * as yaml from 'js-yaml';
import type { OpenAPIV3 } from 'openapi-types';

import { CookieKey } from '@app/lib/auth/session';
import { projectRoot, VERSION } from '@app/lib/config';
import { Security } from '@app/lib/openapi';
import * as res from '@app/lib/types/res';

const swaggerUI = fs.readFileSync(path.join(projectRoot, './static/swagger.html'));

const validChars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_';

export function addRoute(app: FastifyInstance) {
  app.get('/', (req, res) => {
    if (!req.url.endsWith('/')) {
      return res.redirect(req.routerPath + '/');
    }
    void res.type('text/html').send(swaggerUI);
  });

  app.get('/openapi.yaml', () => {
    return yaml.dump(app.swagger(), {
      indent: 2,
      sortKeys: true,
      noRefs: true,
    });
  });

  app.addHook('onRoute', (route) => {
    if (!route.schema) {
      return;
    }

    if (route.schema.hide) {
      return;
    }

    if (!route.schema.operationId) {
      if (!route.schema.operationId) {
        throw new Error(`missing operationId on router ${route.url}`);
      }

      for (const x of route.schema.operationId) {
        if (!validChars.includes(x)) {
          throw new Error(`invalid operationId ${route.schema.operationId} on router ${route.url}`);
        }
      }
    }
  });
}

type transformer = <S extends FastifySchema = FastifySchema>({
  schema,
  url,
}: {
  schema: S;
  url: string;
}) => { schema: JSONObject; url: string };

const transform: transformer = ({ schema, url }) => {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!schema) {
    return { schema, url };
  }

  const response = (schema.response ?? {}) as Record<number, unknown>;
  if (!response[500]) {
    response[500] = t.Ref(res.Error, {
      description: '意料之外的服务器错误',
    });
  }
  schema.response = response;
  return { schema: schema as unknown as JSONObject, url };
};

export async function addPlugin(app: FastifyInstance, openapi: Partial<OpenAPIV3.Document>) {
  await app.register(swagger, {
    openapi,
    transform,
    refResolver: {
      clone: true,
      buildLocalReference: (
        json: JSONObject,
        baseUri: unknown,
        /** `fragment` is the `$ref` string when the `$ref` is a relative reference. */
        fragment: string,
        /** `i` is a local counter to generate a unique key. */
        i: number,
      ): string => {
        const id = json.$id;
        if (typeof id === 'string') {
          return id;
        }
        return `def-${i}`;
      },
    },
  });
}

export async function privateAPI(app: FastifyInstance) {
  addRoute(app);
  await addPlugin(app, {
    info: {
      version: VERSION,
      title: 'bangumi private api',
      description:
        '关于订阅通知的 socket.io 相关的文档在 <https://github.com/bangumi/GraphQL/blob/master/docs/socket.io.md>',
    },
    components: {
      securitySchemes: {
        [Security.CookiesSession]: {
          type: 'apiKey',
          in: 'cookie',
          name: CookieKey,
          description:
            '使用 [login](#/auth/login2) 调用 API 登录，或者 使用 [demo](/demo/login) 登录',
        },
      },
    },
  });
}

export async function publicAPI(app: FastifyInstance) {
  addRoute(app);
  await addPlugin(app, {
    info: {
      version: VERSION,
      title: 'hello',
    },
    components: {
      securitySchemes: {
        [Security.OptionalHTTPBearer]: {
          type: 'http',
          description:
            '不强制要求用户认证，但是可能看不到某些敏感内容内容（如 NSFW 或者仅用户自己可见的收藏）',
          scheme: 'Bearer',
        },
        [Security.HTTPBearer]: {
          type: 'http',
          description: '需要使用 access token 进行认证',
          scheme: 'Bearer',
        },
      },
    },
  });
}
