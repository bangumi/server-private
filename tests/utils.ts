import * as path from 'node:path';

import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import fastifyView from '@fastify/view';
import type { FastifyServerOptions } from 'fastify';
import { fastify } from 'fastify';
import { Liquid } from 'liquidjs';

import { buildAjvOptions } from '@app/lib/ajv.ts';
import type { IAuth } from '@app/lib/auth/index.ts';
import { emptyAuth } from '@app/lib/auth/index.ts';
import { production, projectRoot } from '@app/lib/config';
import { defaultSchemaErrorFormatter } from '@app/lib/server.ts';
import { addSchemas } from '@app/routes/schemas';
import type { App } from '@app/routes/type.ts';

export function createTestServer({
  auth = {},
  ...opt
}: { auth?: Partial<IAuth> } & FastifyServerOptions = {}) {
  const app: App = fastify({
    ...opt,
    schemaErrorFormatter: defaultSchemaErrorFormatter,
    ajv: {
      ...buildAjvOptions(),
    },
  }).withTypeProvider<TypeBoxTypeProvider>();

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

  addSchemas(app);
  return app;
}
