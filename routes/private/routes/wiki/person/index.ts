import type { Static } from '@sinclair/typebox';
import { Type as t } from '@sinclair/typebox';

import { NotAllowedError } from '@app/lib/auth/index.ts';
import { BadRequestError, NotFoundError } from '@app/lib/error.ts';
import { Security, Tag } from '@app/lib/openapi/index.ts';
import type { PersonRev } from '@app/lib/orm/entity/index.ts';
import { createRevision, RevType } from '@app/lib/orm/entity/index.ts';
import * as entity from '@app/lib/orm/entity/index.ts';
import { AppDataSource, PersonRepo } from '@app/lib/orm/index.ts';
import { InvalidWikiSyntaxError } from '@app/lib/subject/index.ts';
import * as res from '@app/lib/types/res.ts';
import { formatErrors } from '@app/lib/types/res.ts';
import { matchExpected, WikiChangedError } from '@app/lib/wiki.ts';
import { requireLogin } from '@app/routes/hooks/pre-handler.ts';
import type { App } from '@app/routes/type.ts';

export const PersonWikiInfo = t.Object(
  {
    id: t.Integer(),
    name: t.String(),
    typeID: res.Ref(res.SubjectType),
    infobox: t.String(),
    summary: t.String(),
  },
  { $id: 'PersonWikiInfo' },
);

export const PersonEdit = t.Object(
  {
    name: t.String({ minLength: 1 }),
    infobox: t.String({ minLength: 1 }),
    summary: t.String(),
  },
  {
    $id: 'PersonEdit',
    additionalProperties: false,
  },
);

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  app.addSchema(PersonWikiInfo);

  app.get(
    '/persons/:personID',
    {
      schema: {
        tags: [Tag.Wiki],
        operationId: 'getPersonWikiInfo',
        description: '获取当前的 wiki 信息',
        params: t.Object({
          personID: t.Integer({ minimum: 1 }),
        }),
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        response: {
          200: res.Ref(PersonWikiInfo),
          401: res.Ref(res.Error, {
            'x-examples': formatErrors(new InvalidWikiSyntaxError()),
          }),
          404: res.Ref(res.Error, {
            description: '角色不存在',
          }),
        },
      },
    },
    async ({ params: { personID } }): Promise<Static<typeof PersonWikiInfo>> => {
      const p = await PersonRepo.findOneBy({ id: personID, redirect: 0 });
      if (!p) {
        throw new NotFoundError(`person ${personID}`);
      }

      if (p.lock) {
        throw new NotAllowedError('edit a locked person');
      }

      return {
        id: p.id,
        name: p.name,
        infobox: p.infobox,
        summary: p.summary,
        typeID: p.type,
      };
    },
  );

  app.patch(
    '/persons/:personID',
    {
      schema: {
        tags: [Tag.Wiki],
        operationId: 'patchPersonInfo',
        params: t.Object({
          personID: t.Integer({ minimum: 1 }),
        }),
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        body: t.Object(
          {
            commitMessage: t.String({ minLength: 1 }),
            expectedRevision: t.Partial(PersonEdit, { default: {}, additionalProperties: false }),
            person: t.Partial(PersonEdit, { additionalProperties: false }),
          },
          { additionalProperties: false },
        ),
        response: {
          200: t.Object({}),
          400: res.Ref(res.Error, {
            'x-examples': formatErrors(
              new WikiChangedError(`Index: name
===================================================================
--- name	expected
+++ name	current
@@ -1,1 +1,1 @@
-1234
+水樹奈々
`),
            ),
          }),
          401: res.Ref(res.Error, {
            'x-examples': formatErrors(new InvalidWikiSyntaxError()),
          }),
        },
      },
      preHandler: [requireLogin('editing a subject info')],
    },
    async ({
      auth,
      body: { commitMessage, person: input, expectedRevision },
      params: { personID },
    }) => {
      if (!auth.permission.mono_edit) {
        throw new NotAllowedError('edit person');
      }

      await AppDataSource.transaction(async (t) => {
        const PersonRepo = t.getRepository(entity.Person);
        const p = await PersonRepo.findOneBy({ id: personID });
        if (!p) {
          throw new NotFoundError(`person ${personID}`);
        }
        if (p.lock || p.redirect) {
          throw new BadRequestError('locked person');
        }

        matchExpected(expectedRevision, { name: p.name, infobox: p.infobox, summary: p.summary });

        p.infobox = input.infobox ?? p.infobox;
        p.name = input.name ?? p.name;
        p.summary = input.summary ?? p.summary;

        await PersonRepo.save(p);

        await createRevision(t, {
          mid: personID,
          type: RevType.personEdit,
          rev: {
            crt_name: p.name,
            crt_infobox: p.infobox,
            crt_summary: p.summary,
            extra: {
              img: p.img,
            },
          } satisfies PersonRev,
          creator: auth.userID,
          comment: commitMessage,
        });
      });

      return {};
    },
  );
}
