import { createError } from '@fastify/error';
import type { Static } from '@sinclair/typebox';
import { Type as t } from '@sinclair/typebox';
import { StatusCodes } from 'http-status-codes/build/es';

import { NotAllowedError } from 'app/lib/auth';
import { NotFoundError } from 'app/lib/error';
import { Security, Tag } from 'app/lib/openapi';
import * as orm from 'app/lib/orm';
import { requireLogin } from 'app/lib/pre-handler';
import type { App } from 'app/lib/rest/type';
import * as Subject from 'app/lib/subject';
import * as res from 'app/lib/types/res';
import { formatErrors } from 'app/lib/types/res';
import wiki from 'app/lib/utils/wiki';
import { WikiSyntaxError } from 'app/lib/utils/wiki/error';

const SubjectEdit = t.Object(
  {
    name: t.String({ minLength: 1 }),
    infobox: t.String({ minLength: 1 }),
    platform: t.Integer(),
    summary: t.String(),
    commitMessage: t.String({ minLength: 1 }),
  },
  { $id: 'SubjectEdit' },
);

const InvalidWikiSyntaxError = createError('INVALID_ERROR_SYNTAX', '%s', StatusCodes.BAD_REQUEST);

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  app.addSchema(res.Error);
  app.addSchema(SubjectEdit);

  app.put(
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
            'x-examples': formatErrors(InvalidWikiSyntaxError()),
          }),
        },
      },
      preHandler: [requireLogin('creating a reply')],
    },
    async ({ auth, body: input, params: { subjectID } }): Promise<string> => {
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

      const body: Static<typeof SubjectEdit> = input;

      try {
        wiki(body.infobox);
      } catch (error) {
        if (error instanceof WikiSyntaxError) {
          throw new InvalidWikiSyntaxError(error.toString());
        }

        throw error;
      }

      await Subject.edit({
        subjectID: subjectID,
        name: body.name,
        infobox: body.infobox,
        commitMessage: body.commitMessage,
        platform: body.platform,
        summary: body.summary,
        userID: auth.userID,
      });

      return JSON.stringify({ subjectID, body });
    },
  );
}
