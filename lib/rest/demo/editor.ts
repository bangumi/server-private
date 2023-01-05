import { NotFoundError } from '@app/lib/error';
import { fetchUserX } from '@app/lib/orm';
import * as orm from '@app/lib/orm';
import { requireLogin } from '@app/lib/rest/hooks/pre-handler';
import type { App } from '@app/lib/rest/type';
import { platforms } from '@app/lib/subject';
import { userToResCreator } from '@app/lib/types/res';

export function setup(app: App) {
  app.get(
    '/subject/184017/edit',
    {
      schema: {
        hide: true,
      },
      preHandler: [requireLogin('edit a subject')],
    },
    async ({ auth }, res) => {
      const subjectID = 184017;
      const s = await orm.fetchSubject(subjectID);
      if (!s) {
        throw new NotFoundError(`subject ${subjectID}`);
      }

      let user;
      if (auth.login) {
        user = userToResCreator(await fetchUserX(auth.userID));
      }

      await res.view('editor', {
        user,
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
