import type Ajv from 'ajv';
import addFormats from 'ajv-formats';
import type { FastifyServerOptions } from 'fastify';
import { fastify } from 'fastify';

import type { IAuth } from '@app/lib/auth/index.ts';
import { emptyAuth } from '@app/lib/auth/index.ts';
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
        addFormats.default,
        function (ajv: Ajv.default) {
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
