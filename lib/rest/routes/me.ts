import { Type as t } from '@sinclair/typebox';

import { NeedLoginError } from '../../auth';
import { UnexpectedNotFoundError } from '../../errors';
import { Tag } from '../../openapi';
import { fetchUser } from '../../orm';
import * as res from '../../types/res';
import { userToResCreator } from '../private/routes/topics';
import type { Option, App } from '../type';

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
          401: t.Ref(res.Error, { examples: [res.formatError(NeedLoginError())] }),
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
