import type { Static } from '@sinclair/typebox';
import { Type as t } from '@sinclair/typebox';

import { Security, Tag } from '@app/lib/openapi/index.ts';
import * as fetcher from '@app/lib/types/fetcher.ts';
import * as res from '@app/lib/types/res.ts';
import type { App } from '@app/routes/type.ts';

export type ICalendarItem = Static<typeof CalendarItem>;
export const CalendarItem = t.Object(
  {
    subject: t.Ref(res.SlimSubject),
    watchers: t.Integer(),
  },
  { $id: 'CalendarItem' },
);

export const Calendar = t.Record(t.Integer(), t.Array(CalendarItem), { $id: 'Calendar' });

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  app.addSchema(Calendar);

  app.get(
    '/calendar',
    {
      schema: {
        summary: '获取每日放送',
        operationId: 'getCalendar',
        tags: [Tag.Calendar],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        response: {
          200: t.Ref(Calendar),
        },
      },
    },
    async ({ auth }) => {
      const items = await fetcher.fetchSubjectOnAirItems();
      const subjectIDs = items.map((i) => i.id);
      const subjects = await fetcher.fetchSlimSubjectsByIDs(subjectIDs, auth.allowNsfw);
      const result: Record<number, ICalendarItem[]> = {};
      for (const item of items) {
        const subject = subjects[item.id];
        if (!subject) {
          continue;
        }
        const weekday = result[item.weekday] || [];
        weekday.push({
          subject,
          watchers: item.watchers,
        });
        result[item.weekday] = weekday;
      }
      return result;
    },
  );
}
