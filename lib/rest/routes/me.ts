import { Type as t } from '@sinclair/typebox';

import { NeedLoginError } from '../../auth';
import { Tag } from '../../openapi';
import { ErrorRes, formatError, User } from '../../types';
import type { Option, App } from '../type';

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App, { tags = [] }: Option) {
  app.addSchema(User);
  app.addSchema(ErrorRes);

  app.get(
    '/me',
    {
      schema: {
        operationId: 'get-current-user',
        tags: [Tag.Auth, ...tags],
        response: {
          200: t.Ref(User),
          401: t.Ref(ErrorRes, { examples: [formatError(NeedLoginError())] }),
        },
      },
    },
    (req) => {
      if (!req.user) {
        throw new NeedLoginError('getting current user');
      }
      return req.user;
    },
  );
}
