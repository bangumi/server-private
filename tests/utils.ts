import * as path from 'node:path';

import fastifyView from '@fastify/view';
import type Ajv from 'ajv';
import addFormats from 'ajv-formats';
import type { FastifyServerOptions } from 'fastify';
import { fastify } from 'fastify';
import { Liquid } from 'liquidjs';

import type { IAuth } from '@app/lib/auth/index.ts';
import { emptyAuth } from '@app/lib/auth/index.ts';
import { production, projectRoot } from '@app/lib/config';
import { defaultSchemaErrorFormatter } from '@app/lib/server.ts';

export function createTestServer({
  auth = {},
  ...opt
}: { auth?: Partial<IAuth> } & FastifyServerOptions = {}) {
  const app = fastify({
    ...opt,
    schemaErrorFormatter: defaultSchemaErrorFormatter,
    ajv: {
      plugins: [
        addFormats,
        function (ajv: Ajv) {
          ajv.addKeyword({ keyword: 'x-examples' });
        },
      ],
    },
  });

  if (auth) {
    app.addHook('preHandler', (req, res, done) => {
      req.auth = {
        ...emptyAuth(),
        ...auth,
      };
      done();
    });
  }
  const liquid = new Liquid({
    root: path.resolve(projectRoot, 'templates'),
    extname: '.liquid',
    cache: production,
    outputEscape: 'escape',
  });

  void app.register(fastifyView, {
    engine: {
      liquid,
    },
    defaultContext: { production },
    root: path.resolve(projectRoot, 'templates'),
    production,
  });

  return app;
}
