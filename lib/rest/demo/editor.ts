import { NotFoundError } from '@app/lib/error';
import * as orm from '@app/lib/orm';
import { redirectIfNotLogin } from '@app/lib/rest/demo/hooks';
import type { App } from '@app/lib/rest/type';
import { platforms } from '@app/lib/subject';

export function setup(app: App) {
  app.get(
    '/subject/184017/edit',
    {
      schema: {
        hide: true,
      },
      preHandler: [redirectIfNotLogin],
    },
    async (req, res) => {
      const subjectID = 184017;
      const s = await orm.fetchSubject(subjectID);
      if (!s) {
        throw new NotFoundError(`subject ${subjectID}`);
      }

      await res.view('editor', {
        subjectID,
        name: s.name,
        platformID: s.platform,
        platforms: platforms(s.typeID),
        infobox: s.infobox,
        summary: s.summary,
        date: s.date,
      });
    },
  );

  app.get(
    '/subject/184017/upload-cover',
    {
      schema: {
        hide: true,
      },
      preHandler: [redirectIfNotLogin],
    },
    async (req, res) => {
      const subjectID = 184017;
      const s = await orm.fetchSubject(subjectID);
      if (!s) {
        throw new NotFoundError(`subject ${subjectID}`);
      }

      await res.view('upload-cover', {
        subjectID,
      });
    },
  );
}
