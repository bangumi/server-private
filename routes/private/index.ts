import Cookie from '@fastify/cookie';
import { Type as t } from '@sinclair/typebox';

import { cookiesPluginOption } from '@app/lib/auth/session.ts';
import { production } from '@app/lib/config.ts';
import { Auth } from '@app/routes/hooks/pre-handler.ts';
import { addSchemas } from '@app/routes/schemas.ts';
import * as swagger from '@app/routes/swagger.ts';
import type { App } from '@app/routes/type.ts';

import * as auth from './routes/auth.ts';
import * as calendar from './routes/calendar.ts';
import * as character from './routes/character.ts';
import * as episode from './routes/episode.ts';
import * as misc from './routes/me.ts';
import * as person from './routes/person.ts';
import * as post from './routes/post.ts';
import * as subject from './routes/subject.ts';
import * as timeline from './routes/timeline.ts';
import * as group from './routes/topic.ts';
import * as trending from './routes/trending.ts';
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
  addSchemas(app);

  app.get(
    '/debug',
    {
      schema: {
        summary: 'debug',
        description: 'debug 路由',
        operationId: 'debug',
        response: {
          200: t.Any(),
        },
      },
    },
    async (req, res) => {
      res.send({ requestID: req.id });
    },
  );

  await app.register(auth.setup);
  await app.register(calendar.setup);
  await app.register(character.setup);
  await app.register(episode.setup);
  await app.register(group.setup);
  await app.register(misc.setup);
  await app.register(person.setup);
  await app.register(post.setup);
  await app.register(subject.setup);
  await app.register(timeline.setup);
  await app.register(trending.setup);
  await app.register(user.setup);
  await app.register(wiki.setup, { prefix: '/wiki' });
}
