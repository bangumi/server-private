import { NotFoundError } from '@app/lib/error';
import { fetchSubject } from '@app/lib/orm';
import * as orm from '@app/lib/orm';
import type { App } from '@app/lib/rest/type';
import { platforms } from '@app/lib/subject';

export function setup(app: App) {
  app.get(
    '/subject/184017/edit',
    {
      websocket: false,
      schema: {
        hide: true,
        // params: t.Object({
        //   subjectID: t.Integer({ exclusiveMinimum: 0 }),
        // }),
      },
    },
    async (_, res) => {
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
}
