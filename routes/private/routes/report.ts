import { DateTime } from 'luxon';
import t from 'typebox';

import { db, op, schema } from '@app/drizzle';
import { ConflictError } from '@app/lib/error.ts';
import { Security, Tag } from '@app/lib/openapi/index.ts';
import { Ref } from '@app/lib/types/common.ts';
import * as req from '@app/lib/types/req.ts';
import { requireLogin } from '@app/routes/hooks/pre-handler';
import type { App } from '@app/routes/type.ts';

const ISSUE_STATUS = {
  OPEN: 0,
  CLOSED: 1,
} as const;

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  app.post(
    '/report',
    {
      schema: {
        summary: '报告疑虑',
        operationId: 'createReport',
        tags: [Tag.User],
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        body: Ref(req.CreateReport),
        response: {
          200: t.Object({
            message: t.String(),
          }),
        },
      },
      preHandler: [requireLogin('logout')],
    },
    async ({ auth, body }) => {
      const [existingReport] = await db
        .select()
        .from(schema.chiiIssues)
        .where(
          op.and(
            op.eq(schema.chiiIssues.type, body.type),
            op.eq(schema.chiiIssues.mid, body.id),
            op.eq(schema.chiiIssues.operator, auth.userID),
          ),
        )
        .limit(1);

      if (existingReport) {
        throw new ConflictError('already reported');
      }

      const now = DateTime.now().toUnixInteger();
      await db.insert(schema.chiiIssues).values({
        type: body.type,
        mid: body.id,
        value: body.value,
        operator: auth.userID,
        status: ISSUE_STATUS.OPEN,
        reason: body.comment ?? '',
        creator: 0,
        related: 0,
        createdAt: now,
      });

      return {
        message: '感谢报告，我们会尽快处理',
      };
    },
  );
}
