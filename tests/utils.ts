import type Ajv from 'ajv';
import addFormats from 'ajv-formats';
import type { FastifyServerOptions } from 'fastify';
import { fastify } from 'fastify';

import type { IAuth } from '@app/lib/auth';

export function createTestServer({ auth, ...opt }: { auth?: IAuth } & FastifyServerOptions) {
  const app = fastify({
    ...opt,
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
      req.auth = auth;
      done();
    });
  }

  return app;
}
