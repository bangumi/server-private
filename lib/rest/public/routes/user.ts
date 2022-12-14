import { Type as t } from '@sinclair/typebox';

import { NotFoundError } from '../../../errors';
import { fetchUserByUsername } from '../../../orm';
import * as res from '../../../types/res';
import { userToResCreator } from '../../private/routes/topics';
import type { Option, App } from '../../type';

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App, { tags = [] }: Option) {
  app.addSchema(res.User);
  app.addSchema(res.Error);

  app.get(
    '/users/:username',
    {
      schema: {
        params: t.Object({
          username: t.String({ minLength: 1, maxLength: 32 }),
        }),
        operationId: 'getUser',
        tags,
        response: {
          200: t.Ref(res.User),
          404: t.Ref(res.Error, { description: 'user not found' }),
        },
      },
    },
    async (req) => {
      const user = await fetchUserByUsername(req.params.username);
      if (!user) {
        throw new NotFoundError('user');
      }

      return userToResCreator(user);
    },
  );
}
