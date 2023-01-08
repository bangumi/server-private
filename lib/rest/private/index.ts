import Cookie from '@fastify/cookie';

import { emptyAuth } from '@app/lib/auth';
import * as session from '@app/lib/auth/session';
import { production } from '@app/lib/config';
import * as demo from '@app/lib/rest/demo';
import * as me from '@app/lib/rest/routes/me';
import * as swagger from '@app/lib/rest/swagger';
import type { App } from '@app/lib/rest/type';

import { CookieKey } from './routes/login';
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

  void app.addHook('preHandler', async (req, res) => {
    if (!req.cookies.chiiNextSessionID) {
      req.auth = emptyAuth();
      return;
    }

    const a = await session.get(req.cookies.chiiNextSessionID);
    if (!a) {
      void res.clearCookie(CookieKey);
      req.auth = emptyAuth();
      return;
    }

    req.auth = a;
  });

  await app.register(API, { prefix: '/p1' });
  await app.register(demo.setup, { prefix: '/demo' });
}

async function API(app: App) {
  await swagger.privateAPI(app);

  await app.register(login.setup);
  await app.register(me.setup);
  await app.register(group.setup);
  await app.register(post.setup);
  await app.register(user.setup);
  await app.register(wiki.setup, { prefix: '/wiki' });
}
