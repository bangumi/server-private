import { setInterval, clearInterval } from 'node:timers';

import fastifyWebsocket from '@fastify/websocket';
import { Type as t } from '@sinclair/typebox';

import { NeedLoginError } from '../../../auth';
import * as Notify from '../../../notify';
import { Tag } from '../../../openapi';
import { requireLogin } from '../../../pre-handler';
import * as res from '../../../types/res';
import type { App } from '../../type';

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  await app.register(fastifyWebsocket);
  app.addSchema(res.Error);
  app.addSchema(res.ValidationError);

  app.get(
    '/sub/notify',
    {
      websocket: true,
      schema: {
        description: [
          '使用 websocket 订阅通知',
          'openapi不能很好的描述websocket api，但是这个api只会返回一种数据',
          'swagger 的 `Try it out` 不支持 websocket，所以会直接显示为 404 响应',
        ].join('\n\n'),
        operationId: 'subscribeNotify',
        tags: [Tag.User],
        response: {
          200: t.Object({
            count: t.Integer(),
          }),
          401: t.Ref(res.Error, {
            description: '未登录',
            'x-examples': {
              NeedLoginError: { value: res.formatError(NeedLoginError('logout')) },
            },
          }),
        },
      },
      preHandler: [requireLogin('subscribing notify')],
    },
    (conn, req) => {
      const userID = req.auth.userID;
      const exec = async () => {
        const count = await Notify.count(userID);
        conn.socket.send(JSON.stringify({ count }));
      };

      void exec();
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      const interval = setInterval(exec, 5000);
      conn.socket.on('close', () => {
        clearInterval(interval);
      });
    },
  );
}
