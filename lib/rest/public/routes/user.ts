import { Type as t } from '@sinclair/typebox';

import { NotFoundError } from '@app/lib/error';
import { fetchUserByUsername } from '@app/lib/orm';
import { userToResCreator } from '@app/lib/rest/private/routes/topic';
import type { Option, App } from '@app/lib/rest/type';
import * as res from '@app/lib/types/res';

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
