import { Type as t } from '@sinclair/typebox';

import { Tag } from '../../openapi/tag';
import { User } from '../../types/user';
import type { App } from '../type';

export function setup(app: App) {
  app.get(
    '/me',
    {
      schema: {
        operationId: 'get-current-user',
        tags: [Tag.Auth],
        response: {
          200: t.Object({
            data: t.Optional(User),
          }),
        },
      },
    },
    async (req) => {
      return { data: req.user ?? undefined };
    },
  );
}
