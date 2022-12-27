import { NotFoundError } from 'app/lib/error';
import * as orm from 'app/lib/orm';
import type { App } from 'app/lib/rest/type';

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

      await res.view('editor', { subjectID, infobox: JSON.stringify(s.infobox) });
    },
  );
}
