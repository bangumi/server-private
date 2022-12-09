import fs from 'node:fs';
import path from 'node:path';

import type { JSONObject } from '@fastify/swagger';
import swagger from '@fastify/swagger';
import type { FastifyInstance } from 'fastify';
import type { OpenAPIV3 } from 'openapi-types';

import { pkg, projectRoot } from '../config';
import { Security } from '../openapi';

const swaggerUI = fs.readFileSync(path.join(projectRoot, './lib/swagger.html'));

export function addRoute(app: FastifyInstance) {
  app.get('/', (_, res) => {
    void res.type('text/html').send(swaggerUI);
  });

  app.get('/openapi.json', () => {
    return app.swagger();
  });
}

export async function addPlugin(app: FastifyInstance, openapi: Partial<OpenAPIV3.Document>) {
  await app.register(swagger, {
    openapi,
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
      version: pkg.version,
      title: 'hello',
    },
  });
}

export async function publicAPI(app: FastifyInstance) {
  addRoute(app);
  await addPlugin(app, {
    info: {
      version: pkg.version,
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
