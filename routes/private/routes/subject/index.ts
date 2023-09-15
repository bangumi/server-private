import { Type as t } from '@sinclair/typebox';

import { NeedLoginError } from '@app/lib/auth/index.ts';
import { Security } from '@app/lib/openapi/index.ts';
import * as res from '@app/lib/types/res.ts';
import type { App } from '@app/routes/type.ts';

const SubjectRes = t.Object(
  {
    id: t.Integer(),
  },
  { $id: 'Subject' },
);

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  app.addSchema(res.Error);
  app.addSchema(SubjectRes);

  app.get(
    '/subjects/:subjectID',
    {
      schema: {
        summary: '获取未读通知',
        operationId: 'listNotice',
        // tags: [Tag.Wiki],
        params: t.Object({
          subjectID: t.Integer(),
        }),
        security: [{ [Security.CookiesSession]: [] }],
        response: {
          200: t.Ref(SubjectRes),
          401: t.Ref(res.Error, {
            description: '未登录',
            'x-examples': {
              NeedLoginError: {
                value: res.formatError(NeedLoginError('getting notifications')),
              },
            },
          }),
        },
      },
    },
    ({ auth: { login }, params: { subjectID } }) => {
      if (!login) {
        return { id: subjectID };
      }
      return { id: subjectID };
    },
  );
}
