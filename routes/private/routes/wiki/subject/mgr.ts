import { DateTime } from 'luxon';
import t from 'typebox';

import { db, op, schema } from '@app/drizzle';
import { NotAllowedError } from '@app/lib/auth/index.ts';
import { Tag } from '@app/lib/openapi/index.ts';
import { RevType } from '@app/lib/rev/type.ts';
import { requireLogin } from '@app/routes/hooks/pre-handler.ts';
import type { App } from '@app/routes/type.ts';

export function setup(app: App) {
  app.post(
    '/lock/subjects',
    {
      schema: {
        operationId: 'lockSubject',
        tags: [Tag.Wiki],
        body: t.Object({
          subjectID: t.Integer({ examples: [184017] }),
          reason: t.String(),
        }),
        response: {
          200: t.Object({}),
        },
      },
      preHandler: [requireLogin('list subject covers')],
    },
    async ({ body, auth }) => {
      if (!auth.permission.subject_lock) {
        throw new NotAllowedError('lock a subject');
      }

      await db.transaction(async (t) => {
        await t
          .update(schema.chiiSubjects)
          .set({ ban: 1 })
          .where(op.eq(schema.chiiSubjects.id, body.subjectID));

        await t.insert(schema.chiiSubjectRev).values({
          type: RevType.subjectLock,
          subjectID: body.subjectID,
          typeID: 0,
          name: '',
          nameCN: '',
          infobox: '',
          metaTags: '',
          summary: '',
          commitMessage: body.reason,
          creatorID: auth.userID,
          createdAt: DateTime.now().toUnixInteger(),
          eps: 0,
          platform: 0,
        });
      });

      return {};
    },
  );

  app.post(
    '/unlock/subjects',
    {
      schema: {
        operationId: 'unlockSubject',
        tags: [Tag.Wiki],
        body: t.Object({
          subjectID: t.Integer({ examples: [184017] }),
          reason: t.String(),
        }),
        response: {
          200: t.Object({}),
        },
      },
      preHandler: [requireLogin('list subject covers')],
    },
    async ({ body, auth }) => {
      if (!auth.permission.subject_lock) {
        throw new NotAllowedError('unlock a subject');
      }

      await db.transaction(async (t) => {
        await t
          .update(schema.chiiSubjects)
          .set({ ban: 0 })
          .where(op.eq(schema.chiiSubjects.id, body.subjectID));

        await t.insert(schema.chiiSubjectRev).values({
          type: RevType.subjectUnlock,
          subjectID: body.subjectID,
          typeID: 0,
          name: '',
          nameCN: '',
          infobox: '',
          metaTags: '',
          summary: '',
          commitMessage: body.reason,
          creatorID: auth.userID,
          createdAt: DateTime.now().toUnixInteger(),
          eps: 0,
          platform: 0,
        });
      });

      return {};
    },
  );
}
