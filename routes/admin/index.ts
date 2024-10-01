import { Type as t } from '@sinclair/typebox';

import { production } from '@app/lib/config.ts';
import * as image from '@app/lib/image/index.ts';
import { SubjectImage } from '@app/lib/orm/entity/index.ts';
import { AppDataSource, SubjectImageRepo } from '@app/lib/orm/index.ts';
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
        params: t.Object({ subjectID: t.Integer({ exclusiveMinimum: 0 }) }),
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
          subjectID: t.Integer({ exclusiveMinimum: 0 }),
        }),
        body: t.Object({ imageID: t.Integer({ exclusiveMinimum: 0 }) }),
      },
      preHandler: [
        requirePermission('delete subject cover', (a) => a.permission.subject_cover_erase),
      ],
    },
    async ({ params: { subjectID }, body: { imageID } }, res) => {
      const i = await SubjectImageRepo.findOneBy({ subjectID });

      if (!i) {
        return res.status(404).send();
      }

      await AppDataSource.transaction(async (t) => {
        const SubjectImageRepo = t.getRepository(SubjectImage);
        await image.deleteSubjectImage(i.target);
        await SubjectImageRepo.update({ id: imageID }, { ban: 1 });
      });

      await Subject.onSubjectVote(subjectID);
    },
  );
}
