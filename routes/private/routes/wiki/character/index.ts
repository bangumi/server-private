import type { Static } from 'typebox';
import t from 'typebox';

import { db, op, schema } from '@app/drizzle';
import { NotAllowedError } from '@app/lib/auth/index.ts';
import { NotFoundError } from '@app/lib/error.ts';
import { Security, Tag } from '@app/lib/openapi/index.ts';
import type { CharacterRev } from '@app/lib/orm/entity/index.ts';
import { RevType } from '@app/lib/orm/entity/index.ts';
import * as entity from '@app/lib/orm/entity/index.ts';
import { InvalidWikiSyntaxError } from '@app/lib/subject/index.ts';
import * as fetcher from '@app/lib/types/fetcher.ts';
import * as res from '@app/lib/types/res.ts';
import { formatErrors } from '@app/lib/types/res.ts';
import { ghostUser } from '@app/lib/user/utils';
import type { App } from '@app/routes/type.ts';

export const CharacterWikiInfo = t.Object(
  {
    id: t.Integer(),
    name: t.String(),
    infobox: t.String(),
    summary: t.String(),
  },
  { $id: 'CharacterWikiInfo' },
);

export const CharacterEdit = t.Object(
  {
    name: t.String({ minLength: 1 }),
    infobox: t.String({ minLength: 1 }),
    summary: t.String(),
  },
  {
    $id: 'CharacterEdit',
    additionalProperties: false,
  },
);

type ICharacterRevisionWikiInfo = Static<typeof CharacterRevisionWikiInfo>;
export const CharacterRevisionWikiInfo = t.Object(
  {
    name: t.String(),
    infobox: t.String(),
    summary: t.String(),
    extra: t.Object({
      img: t.Optional(t.String()),
    }),
  },
  {
    $id: 'CharacterRevisionWikiInfo',
  },
);

type IUserCharacterContribution = Static<typeof UserCharacterContribution>;
const UserCharacterContribution = t.Object(
  {
    id: t.Integer(),
    type: t.Integer({
      description: '2 = 角色编辑',
    }),
    characterID: t.Integer(),
    name: t.String(),
    commitMessage: t.String(),
    createdAt: t.Integer({ description: 'unix timestamp seconds' }),
  },
  { $id: 'UserCharacterContribution' },
);

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  app.addSchema(CharacterWikiInfo);
  app.addSchema(CharacterRevisionWikiInfo);
  app.addSchema(UserCharacterContribution);

  app.get(
    '/characters/:characterID',
    {
      schema: {
        tags: [Tag.Wiki],
        operationId: 'getCharacterWikiInfo',
        summary: '获取角色当前的 wiki 信息',
        params: t.Object({
          characterID: t.Integer({ minimum: 1 }),
        }),
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        response: {
          200: res.Ref(CharacterWikiInfo),
          401: res.Ref(res.Error, {
            'x-examples': formatErrors(new InvalidWikiSyntaxError()),
          }),
          404: res.Ref(res.Error, {
            'x-examples': formatErrors(new NotFoundError('character')),
          }),
        },
      },
    },
    async ({ params: { characterID } }): Promise<Static<typeof CharacterWikiInfo>> => {
      const [c] = await db
        .select()
        .from(schema.chiiCharacters)
        .where(op.eq(schema.chiiCharacters.id, characterID))
        .limit(1);
      if (!c) {
        throw new NotFoundError(`character ${characterID}`);
      }

      if (c.lock) {
        throw new NotAllowedError('edit a locked character');
      }

      return {
        id: c.id,
        name: c.name,
        infobox: c.infobox,
        summary: c.summary,
      };
    },
  );

  app.get(
    '/characters/:characterID/history-summary',
    {
      schema: {
        tags: [Tag.Wiki],
        operationId: 'characterEditHistorySummary',
        summary: '获取角色 wiki 历史编辑摘要',
        params: t.Object({
          characterID: t.Integer({ minimum: 1 }),
        }),
        querystring: t.Object({
          limit: t.Optional(
            t.Integer({ default: 20, minimum: 1, maximum: 100, description: 'max 100' }),
          ),
          offset: t.Optional(t.Integer({ default: 0, minimum: 0, description: 'min 0' })),
        }),
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        response: {
          200: res.PagedRevisionHistory,
        },
      },
    },
    async ({ params: { characterID }, query: { limit = 20, offset = 0 } }) => {
      const [{ count = 0 } = {}] = await db
        .select({ count: op.countDistinct(schema.chiiRevHistory.revId) })
        .from(schema.chiiRevHistory)
        .where(
          op.and(
            op.eq(schema.chiiRevHistory.revMid, characterID),
            op.inArray(schema.chiiRevHistory.revType, [RevType.characterEdit]),
          ),
        );

      const history = await db
        .select()
        .from(schema.chiiRevHistory)
        .where(
          op.and(
            op.eq(schema.chiiRevHistory.revMid, characterID),
            op.inArray(schema.chiiRevHistory.revType, [RevType.characterEdit]),
          ),
        )
        .orderBy(op.desc(schema.chiiRevHistory.revId))
        .offset(offset)
        .limit(limit);

      const users = await fetcher.fetchSlimUsersByIDs(history.map((x) => x.revCreator));
      const revisions = history.map((x) => {
        return {
          id: x.revId,
          creator: {
            username: users[x.revCreator]?.username ?? ghostUser(x.revCreator).username,
          },
          type: x.revType,
          createdAt: x.createdAt,
          commitMessage: x.revEditSummary,
        } satisfies res.IRevisionHistory;
      });

      return {
        total: count,
        data: revisions,
      };
    },
  );

  app.get(
    '/characters/-/revisions/:revisionID',
    {
      schema: {
        tags: [Tag.Wiki],
        operationId: 'getCharacterRevisionInfo',
        summary: '获取角色历史版本 wiki 信息',
        params: t.Object({
          revisionID: t.Integer({ minimum: 1 }),
        }),
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        response: {
          200: res.Ref(CharacterRevisionWikiInfo),
          404: res.Ref(res.Error, {
            'x-examples': formatErrors(new NotFoundError('revision')),
          }),
        },
      },
    },
    async ({ params: { revisionID } }): Promise<ICharacterRevisionWikiInfo> => {
      const [r] = await db
        .select()
        .from(schema.chiiRevHistory)
        .where(op.eq(schema.chiiRevHistory.revId, revisionID))
        .limit(1);
      if (!r) {
        throw new NotFoundError(`revision ${revisionID}`);
      }

      const [revText] = await db
        .select()
        .from(schema.chiiRevText)
        .where(op.eq(schema.chiiRevText.revTextId, r.revTextId));
      if (!revText) {
        throw new NotFoundError(`RevText ${r.revTextId}`);
      }

      const revRecord = await entity.RevText.deserialize(revText.revText);
      const revContent = revRecord[revisionID] as CharacterRev;

      return {
        name: revContent.crt_name,
        infobox: revContent.crt_infobox,
        summary: revContent.crt_summary,
        extra: revContent.extra,
      };
    },
  );

  app.get(
    '/users/:username/contributions/characters',
    {
      schema: {
        tags: [Tag.Wiki],
        operationId: 'getUserContributedCharacters',
        summary: '获取用户 wiki 角色编辑记录',
        params: t.Object({
          username: t.String(),
        }),
        querystring: t.Object({
          limit: t.Optional(
            t.Integer({ default: 20, minimum: 1, maximum: 100, description: 'max 100' }),
          ),
          offset: t.Optional(t.Integer({ default: 0, minimum: 0, description: 'min 0' })),
        }),
        security: [{ [Security.CookiesSession]: [], [Security.HTTPBearer]: [] }],
        response: {
          200: res.Paged(res.Ref(UserCharacterContribution)),
          404: res.Ref(res.Error, {
            'x-examples': formatErrors(new NotFoundError('user')),
          }),
        },
      },
    },
    async ({ params: { username }, query: { limit = 20, offset = 0 } }) => {
      const user = await fetcher.fetchSlimUserByUsername(username);
      if (!user) {
        throw new NotFoundError('user');
      }

      const [{ count = 0 } = {}] = await db
        .select({ count: op.count(schema.chiiRevHistory.revId) })
        .from(schema.chiiRevHistory)
        .where(
          op.and(
            op.eq(schema.chiiRevHistory.revCreator, user.id),
            op.inArray(schema.chiiRevHistory.revType, [RevType.characterEdit]),
          ),
        );

      const history = await db
        .select()
        .from(schema.chiiRevHistory)
        .where(
          op.and(
            op.eq(schema.chiiRevHistory.revCreator, user.id),
            op.inArray(schema.chiiRevHistory.revType, [RevType.characterEdit]),
          ),
        )
        .orderBy(op.desc(schema.chiiRevHistory.revId))
        .offset(offset)
        .limit(limit);

      const characters = await fetcher.fetchSlimCharactersByIDs(history.map((r) => r.revMid));

      const revisions = history.map((r) => {
        return {
          id: r.revId,
          type: r.revType,
          characterID: r.revMid,
          name: characters[r.revMid]?.name || String(r.revMid),
          commitMessage: r.revEditSummary,
          createdAt: r.createdAt,
        } satisfies IUserCharacterContribution;
      });

      return {
        total: count,
        data: revisions,
      };
    },
  );
}
