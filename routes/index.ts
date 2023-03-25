import type { IAuth } from '@app/lib/auth';
import { logger } from '@app/lib/logger.ts';
import * as demo from '@app/routes/demo';
import * as privateAPI from '@app/routes/private';
import * as publicAPI from '@app/routes/public';
import type { App } from '@app/routes/type';

export async function setup(app: App) {
  logger.debug('setup rest routes');

  app.decorateRequest('auth', null);

  await app.register(privateAPI.setup, { prefix: '/p1' });
  await app.register(publicAPI.setup, { prefix: '/v0.5' });
  await app.register(demo.setup, { prefix: '/demo/' });

  app.get('/img/*', (req, res) => {
    return res.redirect('https://bgm.tv' + req.url);
  });
}

declare module 'fastify' {
  interface FastifyRequest {
    auth: Readonly<IAuth>;
  }
}
