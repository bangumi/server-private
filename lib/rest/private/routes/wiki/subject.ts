import { Type as t } from '@sinclair/typebox';

import { NotAllowedError } from 'app/lib/auth';
import { NotFoundError } from 'app/lib/error';
import { Security, Tag } from 'app/lib/openapi';
import * as orm from 'app/lib/orm';
import { requireLogin } from 'app/lib/pre-handler';
import type { App } from 'app/lib/rest/type';
import * as Subject from 'app/lib/subject';
import * as res from 'app/lib/types/res';
import { formatErrors } from 'app/lib/types/res';

const SubjectEdit = t.Object(
  {
    name: t.String({ minLength: 1 }),
    infobox: t.String({ minLength: 1 }),
    summary: t.String(),
    commitMessage: t.String({ minLength: 1 }),
  },
  { $id: 'SubjectEdit' },
);

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  app.addSchema(res.Error);
  app.addSchema(SubjectEdit);

  app.post(
    '/subjects/:subjectID',
    {
      schema: {
        tags: [Tag.Wiki],
        operationId: 'updateSubject',
        params: t.Object({
          subjectID: t.Integer({ examples: [363612], minimum: 0 }),
        }),
        security: [{ [Security.CookiesSession]: [] }],
        body: t.Ref(SubjectEdit),
        response: {
          200: t.String(),
          401: t.Ref(res.Error, {
            'x-examples': formatErrors(NotAllowedError()),
          }),
        },
      },
      preHandler: [requireLogin('creating a reply')],
    },
    async ({ auth, body, params: { subjectID } }): Promise<string> => {
      if (!auth.permission.subject_edit) {
        throw new NotAllowedError('edit subject');
      }

      const s = await orm.fetchSubject(subjectID);
      if (!s) {
        throw new NotFoundError(`subject ${subjectID}`);
      }

      if (s.locked) {
        throw new NotAllowedError('edit a locked subject');
      }

      await Subject.edit({
        subjectID: subjectID,
        name: body.name,
        infobox: body.infobox,
        commitMessage: body.commitMessage,
        platform: s.platform, // TODO
        summary: body.summary,
        userID: auth.userID,
      });

      return JSON.stringify({ subjectID, body });
    },
  );
}
