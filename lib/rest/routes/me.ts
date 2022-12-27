import { Type as t } from '@sinclair/typebox';

import { NeedLoginError } from 'app/lib/auth';
import { UnexpectedNotFoundError } from 'app/lib/error';
import { Tag } from 'app/lib/openapi';
import { fetchUser } from 'app/lib/orm';
import { userToResCreator } from 'app/lib/rest/private/routes/topic';
import type { Option, App } from 'app/lib/rest/type';
import * as res from 'app/lib/types/res';

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App, { tags = [] }: Option) {
  app.addSchema(res.User);
  app.addSchema(res.Error);

  app.get(
    '/me',
    {
      schema: {
        operationId: 'getCurrentUser',
        tags: [Tag.Auth, ...tags],
        response: {
          200: t.Ref(res.User),
          401: t.Ref(res.Error, {
            examples: [res.formatError(NeedLoginError('get current user'))],
          }),
        },
      },
    },
    async (req) => {
      if (!req.auth.login) {
        throw new NeedLoginError('getting current user');
      }

      const u = await fetchUser(req.auth.userID);

      if (!u) {
        throw new UnexpectedNotFoundError(`user ${req.auth.userID}`);
      }

      return userToResCreator(u);
    },
  );
}
