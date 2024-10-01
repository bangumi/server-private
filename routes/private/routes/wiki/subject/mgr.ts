import { Type as t } from '@sinclair/typebox';
import { DateTime } from 'luxon';

import { NotAllowedError } from '@app/lib/auth/index.ts';
import { Tag } from '@app/lib/openapi/index.ts';
import * as entity from '@app/lib/orm/entity';
import { RevType } from '@app/lib/orm/entity';
import { AppDataSource } from '@app/lib/orm/index.ts';
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

      await AppDataSource.transaction(async (txn) => {
        await txn
          .getRepository(entity.Subject)
          .createQueryBuilder()
          .update({ subjectBan: 1 })
          .where('id = :id', { id: body.subjectID })
          .execute();

        await txn
          .getRepository(entity.SubjectRev)
          .createQueryBuilder()
          .insert()
          .values({
            type: RevType.subjectLock,
            subjectID: body.subjectID,
            commitMessage: body.reason,
            creatorID: auth.userID,
            createdAt: DateTime.now().toUnixInteger(),
          })
          .execute();
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

      await AppDataSource.transaction(async (txn) => {
        await txn
          .getRepository(entity.Subject)
          .createQueryBuilder()
          .update({ subjectBan: 0 })
          .where('id = :id', { id: body.subjectID })
          .execute();

        await txn
          .getRepository(entity.SubjectRev)
          .createQueryBuilder()
          .insert()
          .values({
            type: RevType.subjectUnlock,
            subjectID: body.subjectID,
            commitMessage: body.reason,
            creatorID: auth.userID,
            createdAt: DateTime.now().toUnixInteger(),
          })
          .execute();
      });

      return {};
    },
  );
}
