import { db, op, schema } from '@app/drizzle';
import { NotFoundError } from '@app/lib/error.ts';
import { redirectIfNotLogin } from '@app/routes/hooks/pre-handler.ts';
import type { App } from '@app/routes/type.ts';
import { getSubjectPlatforms } from '@app/vendor';

async function fetchDemoSubject(subjectID: number) {
  const [data] = await db
    .select({
      id: schema.chiiSubjects.id,
      name: schema.chiiSubjects.name,
      typeID: schema.chiiSubjects.typeID,
      platform: schema.chiiSubjects.platform,
      infobox: schema.chiiSubjects.infobox,
      summary: schema.chiiSubjects.summary,
      date: schema.chiiSubjectFields.date,
    })
    .from(schema.chiiSubjects)
    .innerJoin(schema.chiiSubjectFields, op.eq(schema.chiiSubjects.id, schema.chiiSubjectFields.id))
    .where(op.eq(schema.chiiSubjects.id, subjectID))
    .limit(1);
  return data;
}

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
      const s = await fetchDemoSubject(subjectID);
      if (!s) {
        throw new NotFoundError(`subject ${subjectID}`);
      }

      await res.view('editor', {
        subjectID,
        name: s.name,
        platformID: s.platform,
        platforms: getSubjectPlatforms(s.typeID),
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
      const s = await fetchDemoSubject(subjectID);
      if (!s) {
        throw new NotFoundError(`subject ${subjectID}`);
      }

      await res.view('upload-cover', {
        subjectID,
      });
    },
  );
}
