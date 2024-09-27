import { Type as t } from '@sinclair/typebox';
import { DateTime } from 'luxon';

import { NotAllowedError } from '@app/lib/auth/index.ts';
import { Tag } from '@app/lib/openapi/index.ts';
import * as entity from '@app/lib/orm/entity';
import { AppDataSource } from '@app/lib/orm/index.ts';
import { requireLogin } from '@app/routes/hooks/pre-handler.ts';
import type { App } from '@app/routes/type.ts';

const SubjectRevType = Object.freeze({
  lock: 103,
  unlock: 104,
});

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
        throw NotAllowedError('lock a subject');
      }

      await AppDataSource.transaction(async (txn) => {
        await txn
          .getRepository(entity.Subject)
          .createQueryBuilder()
          .update({ subjectBan: 1 })
          .where('id = :l', { l: body.subjectID })
          .execute();

        await txn
          .getRepository(entity.SubjectRev)
          .createQueryBuilder()
          .insert()
          .values({
            type: SubjectRevType.lock,
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
        throw NotAllowedError('unlock a subject');
      }

      await AppDataSource.transaction(async (txn) => {
        await txn
          .getRepository(entity.Subject)
          .createQueryBuilder()
          .update({ subjectBan: 0 })
          .where('id = :l', { l: body.subjectID })
          .execute();

        await txn
          .getRepository(entity.SubjectRev)
          .createQueryBuilder()
          .insert()
          .values({
            type: SubjectRevType.unlock,
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
