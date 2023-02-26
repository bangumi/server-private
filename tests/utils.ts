import type Ajv from 'ajv';
import addFormats from 'ajv-formats';
import type { FastifyServerOptions } from 'fastify';
import { fastify } from 'fastify';

import type { IAuth } from '@app/lib/auth';
import { emptyAuth } from '@app/lib/auth';

export function createTestServer({
  auth = {},
  ...opt
}: { auth?: Partial<IAuth> } & FastifyServerOptions = {}) {
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
      req.auth = {
        ...emptyAuth(),
        ...auth,
      };
      done();
    });
  }

  return app;
}
