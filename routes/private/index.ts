import Cookie from '@fastify/cookie';

import { cookiesPluginOption } from '@app/lib/auth/session.ts';
import { production } from '@app/lib/config.ts';
import { Auth } from '@app/routes/hooks/pre-handler.ts';
import * as swagger from '@app/routes/swagger.ts';
import type { App } from '@app/routes/type.ts';

import * as collection from './routes/collection.ts';
import * as login from './routes/login.ts';
import * as post from './routes/post.ts';
import * as group from './routes/topic.ts';
import * as user from './routes/user.ts';
import * as wiki from './routes/wiki/index.ts';

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
    hook: 'preHandler',
    parseOptions: cookiesPluginOption,
  });

  void app.addHook('preHandler', Auth);

  await app.register(API);
}

async function API(app: App) {
  await swagger.privateAPI(app);

  await app.register(collection.setup);
  await app.register(login.setup);
  await app.register(group.setup);
  await app.register(post.setup);
  await app.register(user.setup);
  await app.register(wiki.setup, { prefix: '/wiki' });
}
