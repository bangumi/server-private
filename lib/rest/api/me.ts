import { Type as t } from '@sinclair/typebox';

import { Security, Tag } from '../../openapi';
import { ErrorRes, User } from '../../types/user';
import type { App } from '../type';
import { NeedLoginError } from '../../auth';

export function setup(app: App) {
  app.get(
    '/me',
    {
      schema: {
        operationId: 'get-current-user',
        tags: [Tag.Auth],
        response: {
          200: t.Object({
            data: t.Ref(User),
          }),
          401: t.Ref(ErrorRes),
        },
        security: [{ [Security.HTTPBearer]: [] }],
      },
    },
    (req) => {
      if (!req.user) {
        throw new NeedLoginError('getting current user');
      }
      return { data: req.user };
    },
  );
}
