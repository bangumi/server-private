import { Type as t } from '@sinclair/typebox';

import { NotFoundError } from '../../errors';
import { fetchUserByUsername } from '../../orm';
import { ErrorRes, User } from '../../types';
import type { App } from '../type';

export function setup(app: App) {
  app.get(
    '/users/:username',
    {
      schema: {
        params: t.Object({
          username: t.String({ minLength: 1, maxLength: 32 }),
        }),
        operationId: 'get-user',
        response: {
          200: t.Ref(User),
          404: t.Ref(ErrorRes, { description: 'user not found' }),
        },
      },
    },
    async (req) => {
      const user = await fetchUserByUsername(req.params.username);
      if (!user) {
        throw new NotFoundError('user');
      }
      return user;
    },
  );
}
