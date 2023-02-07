import Cookie from '@fastify/cookie';

import { production } from '@app/lib/config';
import { SessionAuth } from '@app/routes/hooks/pre-handler';
import * as swagger from '@app/routes/swagger';
import type { App } from '@app/routes/type';

import * as login from './routes/login';
import * as post from './routes/post';
import * as group from './routes/topic';
import * as user from './routes/user';
import * as wiki from './routes/wiki';

export async function setup(app: App) {
  if (production) {
    app.addHook('onRequest', async (req, res) => {
      if (req.method === 'GET') {
        return;
      }

      const ref = req.headers.referer;
      if (ref && !ref.startsWith('https://next.bgm.tv/')) {
        await res.send('bad referer');
      }
    });
  }

  await app.register(Cookie, {
    hook: 'preHandler', // set to false to disable cookie autoparsing or set autoparsing on any of the following hooks: 'onRequest', 'preParsing', 'preHandler', 'preValidation'. default: 'onRequest'
    parseOptions: {}, // options for parsing cookies
  });

  void app.addHook('preHandler', SessionAuth);

  await app.register(API);
}

async function API(app: App) {
  await swagger.privateAPI(app);

  await app.register(login.setup);
  await app.register(group.setup);
  await app.register(post.setup);
  await app.register(user.setup);
  await app.register(wiki.setup, { prefix: '/wiki' });
}
