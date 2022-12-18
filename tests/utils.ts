import type Ajv from 'ajv';
import { fastify } from 'fastify';

import type { IAuth } from '../lib/auth';

export function createTestServer({ auth }: { auth?: IAuth }) {
  const app = fastify({
    ajv: {
      plugins: [
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
