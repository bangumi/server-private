import t from 'typebox';

import { db, op, schema } from '@app/drizzle';
import { production } from '@app/lib/config.ts';
import * as image from '@app/lib/image/index.ts';
import * as Subject from '@app/lib/subject/index.ts';
import { redirectIfNotLogin, requirePermission } from '@app/routes/hooks/pre-handler.ts';
import type { App } from '@app/routes/type.ts';

import * as ep from './ep.ts';

export async function setup(app: App) {
  app.addHook('preHandler', redirectIfNotLogin);

  await app.register(ep.setup);

  const debugUser = new Set<number>();

  if (production) {
    debugUser.add(287622);
    debugUser.add(1);
  } else {
    debugUser.add(2);
  }

  app.get(
    '/debug/permission',
    {
      schema: {
        hide: true,
      },
      preHandler: [requirePermission('delete subject cover', (a) => debugUser.has(a.userID))],
    },
    async (req, res) => {
      await res.send({
        group: req.auth.groupID,
        permission: req.auth.permission,
      });
    },
  );

  app.get('/', (req, res) => {
    return res.view('admin/index');
  });

  app.get(
    '/subject/:subjectID/covers',
    {
      schema: {
        hide: true,
        params: t.Object({ subjectID: t.Integer({ minimum: 1 }) }),
      },
      preHandler: [
        requirePermission('delete subject cover', (a) => a.permission.subject_cover_erase),
      ],
    },
    async ({ params: { subjectID } }, res) => {
      await res.view('admin/covers', { subjectID });
    },
  );

  app.delete(
    '/subject/:subjectID/covers',
    {
      schema: {
        hide: true,
        params: t.Object({
          subjectID: t.Integer({ minimum: 1 }),
        }),
        body: t.Object({ imageID: t.Integer({ minimum: 1 }) }),
      },
      preHandler: [
        requirePermission('delete subject cover', (a) => a.permission.subject_cover_erase),
      ],
    },
    async ({ params: { subjectID }, body: { imageID } }, res) => {
      const [i] = await db
        .select()
        .from(schema.chiiSubjectImgs)
        .where(op.eq(schema.chiiSubjectImgs.imgSubjectId, subjectID))
        .limit(1);

      if (!i) {
        return res.status(404).send();
      }

      await db.transaction(async (t) => {
        await image.deleteSubjectImage(i.imgTarget);
        await t
          .update(schema.chiiSubjectImgs)
          .set({ imgBan: 1 })
          .where(op.eq(schema.chiiSubjectImgs.imgId, imageID));
      });

      await Subject.onSubjectVote(subjectID);
    },
  );
}
