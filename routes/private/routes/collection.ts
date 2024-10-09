import type { Static } from '@sinclair/typebox';
import { Type as t } from '@sinclair/typebox';

import { db, op } from '@app/drizzle/db.ts';
import type * as orm from '@app/drizzle/orm.ts';
import * as schema from '@app/drizzle/schema';
import { NotFoundError } from '@app/lib/error.ts';
import { Tag } from '@app/lib/openapi/index.ts';
import { fetchUserByUsername } from '@app/lib/orm/index.ts';
import {
  CollectionType,
  CollectionTypeProfileValues,
  PersonType,
  SubjectType,
  SubjectTypeValues,
} from '@app/lib/subject/type.ts';
import * as convert from '@app/lib/types/convert.ts';
import * as examples from '@app/lib/types/examples.ts';
import * as res from '@app/lib/types/res.ts';
import { formatErrors } from '@app/lib/types/res.ts';
import type { App } from '@app/routes/type.ts';

export type IUserSubjectCollection = Static<typeof UserSubjectCollection>;
const UserSubjectCollection = t.Object(
  {
    subject: t.Ref(res.Subject),
    rate: t.Integer(),
    type: t.Enum(CollectionType),
    comment: t.String(),
    tags: t.Array(t.String()),
    epStatus: t.Integer(),
    volStatus: t.Integer(),
    private: t.Boolean(),
    updatedAt: t.Integer(),
  },
  { $id: 'UserSubjectCollection' },
);

export type IUserCharacterCollection = Static<typeof UserCharacterCollection>;
const UserCharacterCollection = t.Object(
  {
    character: t.Ref(res.Character),
    createdAt: t.Integer(),
  },
  { $id: 'UserCharacterCollection' },
);

export type IUserPersonCollection = Static<typeof UserPersonCollection>;
const UserPersonCollection = t.Object(
  {
    person: t.Ref(res.Person),
    createdAt: t.Integer(),
  },
  { $id: 'UserPersonCollection' },
);

export type IUserCollectionsSubjectSummary = Static<typeof UserCollectionsSubjectSummary>;
const UserCollectionsSubjectSummary = t.Object(
  {
    counts: t.Record(t.String({ description: 'collection type id' }), t.Integer(), {
      examples: [{ '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }],
    }),
    details: t.Record(
      t.String({ description: 'collection type id' }),
      t.Array(t.Ref(res.SlimSubject)),
      {
        examples: [{ '1': [], '2': [examples.slimSubject], '3': [], '4': [], '5': [] }],
      },
    ),
  },
  { $id: 'UserCollectionsSubjectSummary' },
);

export type IUserCollectionsCharacterSummary = Static<typeof UserCollectionsCharacterSummary>;
const UserCollectionsCharacterSummary = t.Object(
  {
    count: t.Integer(),
    detail: t.Array(t.Ref(res.SlimCharacter)),
  },
  { $id: 'UserCollectionsCharacterSummary' },
);

export type IUserCollectionsPersonSummary = Static<typeof UserCollectionsPersonSummary>;
const UserCollectionsPersonSummary = t.Object(
  {
    count: t.Integer(),
    detail: t.Array(t.Ref(res.SlimPerson)),
  },
  { $id: 'UserCollectionsPersonSummary' },
);

export type IUserCollectionsSummary = Static<typeof UserCollectionsSummary>;
const UserCollectionsSummary = t.Object(
  {
    subject: t.Record(
      t.String({ description: 'subject type id' }),
      t.Ref(UserCollectionsSubjectSummary),
      {
        examples: [
          {
            '1': {
              counts: { '1': 0, '2': 1, '3': 0, '4': 0, '5': 0 },
              details: { '1': [], '2': [examples.slimSubject], '3': [], '4': [], '5': [] },
            },
          },
        ],
      },
    ),
    character: t.Ref(UserCollectionsCharacterSummary),
    person: t.Ref(UserCollectionsPersonSummary),
    // index: t.Ref(UserCollectionsIndexSummary),
  },
  { $id: 'UserCollectionsSummary' },
);

function toUserSubjectCollection(
  interest: orm.ISubjectInterests,
  subject: orm.ISubject,
  fields: orm.ISubjectFields,
): IUserSubjectCollection {
  return {
    subject: convert.toSubject(subject, fields),
    rate: interest.interestRate,
    type: interest.interestType,
    comment: interest.interestComment,
    tags: interest.interestTag
      .split(',')
      .map((x) => x.trim())
      .filter((x) => x !== ''),
    epStatus: interest.interestEpStatus,
    volStatus: interest.interestVolStatus,
    private: Boolean(interest.interestPrivate),
    updatedAt: interest.updatedAt,
  };
}

function toUserCharacterCollection(
  collect: orm.IPersonCollect,
  character: orm.ICharacter,
): IUserCharacterCollection {
  return {
    character: convert.toCharacter(character),
    createdAt: collect.createdAt,
  };
}

function toUserPersonCollection(
  collect: orm.IPersonCollect,
  person: orm.IPerson,
): IUserPersonCollection {
  return {
    person: convert.toPerson(person),
    createdAt: collect.createdAt,
  };
}

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  app.addSchema(res.Error);
  app.addSchema(res.SubjectAirtime);
  app.addSchema(res.SubjectCollection);
  app.addSchema(res.SubjectImages);
  app.addSchema(res.SubjectPlatform);
  app.addSchema(res.SubjectRating);
  app.addSchema(res.PersonImages);
  app.addSchema(res.Infobox);
  app.addSchema(res.Subject);
  app.addSchema(res.SlimSubject);
  app.addSchema(UserSubjectCollection);
  app.addSchema(res.SlimCharacter);
  app.addSchema(res.SlimPerson);
  app.addSchema(UserCollectionsSubjectSummary);
  app.addSchema(UserCollectionsCharacterSummary);
  app.addSchema(UserCollectionsPersonSummary);
  app.addSchema(UserCollectionsSummary);

  app.get(
    '/users/:username/collections/summary',
    {
      schema: {
        summary: '获取用户收藏概览',
        operationId: 'getUserCollectionsSummary',
        tags: [Tag.Collection],
        params: t.Object({
          username: t.String({ minLength: 1 }),
        }),
        response: {
          200: t.Ref(UserCollectionsSummary),
          404: t.Ref(res.Error, {
            'x-examples': formatErrors(new NotFoundError('user')),
          }),
        },
      },
    },
    async ({ auth, params: { username } }): Promise<Static<typeof UserCollectionsSummary>> => {
      const user = await fetchUserByUsername(username);
      if (!user) {
        throw new NotFoundError('user');
      }
      const defaultCounts: Record<string, number> = {
        [CollectionType.Wish]: 0,
        [CollectionType.Collect]: 0,
        [CollectionType.Doing]: 0,
        [CollectionType.OnHold]: 0,
        [CollectionType.Dropped]: 0,
      };
      const defaultDetails: Record<string, res.ISlimSubject[]> = {
        [CollectionType.Wish]: [],
        [CollectionType.Collect]: [],
      };
      const subjectSummary: Record<string, IUserCollectionsSubjectSummary> = {
        [SubjectType.Book]: {
          counts: structuredClone(defaultCounts),
          details: structuredClone(defaultDetails),
        },
        [SubjectType.Anime]: {
          counts: structuredClone(defaultCounts),
          details: structuredClone(defaultDetails),
        },
        [SubjectType.Music]: {
          counts: structuredClone(defaultCounts),
          details: structuredClone(defaultDetails),
        },
        [SubjectType.Game]: {
          counts: structuredClone(defaultCounts),
          details: structuredClone(defaultDetails),
        },
        [SubjectType.Real]: {
          counts: structuredClone(defaultCounts),
          details: structuredClone(defaultDetails),
        },
      };
      const characterSummary: IUserCollectionsCharacterSummary = {
        count: 0,
        detail: [],
      };
      const personSummary: IUserCollectionsPersonSummary = {
        count: 0,
        detail: [],
      };

      async function fillSubjectCounts(userID: number) {
        const data = await db
          .select({
            count: op.count(),
            interest_subject_type: schema.chiiSubjectInterests.interestSubjectType,
            interest_type: schema.chiiSubjectInterests.interestType,
          })
          .from(schema.chiiSubjectInterests)
          .where(op.eq(schema.chiiSubjectInterests.interestUid, userID))
          .groupBy(
            schema.chiiSubjectInterests.interestSubjectType,
            schema.chiiSubjectInterests.interestType,
          )
          .execute();
        for (const d of data) {
          const summary = subjectSummary[d.interest_subject_type];
          if (!summary) {
            continue;
          }
          summary.counts[d.interest_type] = d.count;
        }
      }

      async function fillCharacterCount(userID: number) {
        const [{ count = 0 } = {}] = await db
          .select({
            count: op.count(),
          })
          .from(schema.chiiPersonCollects)
          .where(
            op.and(
              op.eq(schema.chiiPersonCollects.uid, userID),
              op.eq(schema.chiiPersonCollects.cat, PersonType.Character),
            ),
          )
          .execute();
        characterSummary.count = count;
      }

      async function fillPersonCount(userID: number) {
        const [{ count = 0 } = {}] = await db
          .select({
            count: op.count(),
          })
          .from(schema.chiiPersonCollects)
          .where(
            op.and(
              op.eq(schema.chiiPersonCollects.uid, userID),
              op.eq(schema.chiiPersonCollects.cat, PersonType.Person),
            ),
          )
          .execute();
        personSummary.count = count;
      }

      const countJobs = [
        fillSubjectCounts(user.id),
        fillCharacterCount(user.id),
        fillPersonCount(user.id),
      ];
      await Promise.all(countJobs);

      async function appendSubjectDetails(stype: number, ctype: number, userID: number) {
        const data = await db
          .select()
          .from(schema.chiiSubjectInterests)
          .innerJoin(
            schema.chiiSubjects,
            op.eq(schema.chiiSubjectInterests.interestSubjectId, schema.chiiSubjects.id),
          )
          .innerJoin(
            schema.chiiSubjectFields,
            op.eq(schema.chiiSubjects.id, schema.chiiSubjectFields.id),
          )
          .where(
            op.and(
              op.eq(schema.chiiSubjectInterests.interestUid, userID),
              op.eq(schema.chiiSubjectInterests.interestSubjectType, stype),
              op.eq(schema.chiiSubjectInterests.interestType, ctype),
              op.eq(schema.chiiSubjects.ban, 0),
              op.eq(schema.chiiSubjectFields.fieldRedirect, 0),
              auth.userID === userID
                ? undefined
                : op.eq(schema.chiiSubjectInterests.interestPrivate, 0),
              auth.allowNsfw ? undefined : op.eq(schema.chiiSubjects.nsfw, false),
            ),
          )
          .orderBy(op.desc(schema.chiiSubjectInterests.updatedAt))
          .limit(7)
          .execute();
        for (const d of data) {
          const summary = subjectSummary[stype];
          if (!summary) {
            continue;
          }
          const details = summary.details[ctype];
          if (!details) {
            continue;
          }
          const slim = convert.toSlimSubject(d.subject);
          details.push(slim);
        }
      }

      async function appendCharacterDetail(userID: number) {
        const data = await db
          .select()
          .from(schema.chiiPersonCollects)
          .innerJoin(
            schema.chiiCharacters,
            op.eq(schema.chiiPersonCollects.mid, schema.chiiCharacters.id),
          )
          .where(
            op.and(
              op.eq(schema.chiiPersonCollects.uid, userID),
              op.eq(schema.chiiPersonCollects.cat, PersonType.Character),
              op.eq(schema.chiiCharacters.ban, 0),
              op.eq(schema.chiiCharacters.lock, 0),
              auth.allowNsfw ? undefined : op.eq(schema.chiiCharacters.nsfw, 0),
            ),
          )
          .orderBy(op.desc(schema.chiiPersonCollects.createdAt))
          .limit(7)
          .execute();
        for (const d of data) {
          const summary = characterSummary.detail;
          if (!summary) {
            continue;
          }
          const slim = convert.toSlimCharacter(d.chii_characters);
          summary.push(slim);
        }
      }

      async function appendPersonDetail(userID: number) {
        const data = await db
          .select()
          .from(schema.chiiPersonCollects)
          .innerJoin(
            schema.chiiPersons,
            op.eq(schema.chiiPersonCollects.mid, schema.chiiPersons.id),
          )
          .where(
            op.and(
              op.eq(schema.chiiPersonCollects.uid, userID),
              op.eq(schema.chiiPersonCollects.cat, PersonType.Person),
              op.eq(schema.chiiPersons.ban, 0),
              op.eq(schema.chiiPersons.lock, 0),
              auth.allowNsfw ? undefined : op.eq(schema.chiiPersons.nsfw, 0),
            ),
          )
          .orderBy(op.desc(schema.chiiPersonCollects.createdAt))
          .limit(7)
          .execute();
        for (const d of data) {
          const summary = personSummary.detail;
          if (!summary) {
            continue;
          }
          const slim = convert.toSlimPerson(d.chii_persons);
          summary.push(slim);
        }
      }

      const detailJobs = [appendCharacterDetail(user.id), appendPersonDetail(user.id)];
      for (const stype of SubjectTypeValues) {
        for (const ctype of CollectionTypeProfileValues) {
          detailJobs.push(appendSubjectDetails(stype, ctype, user.id));
        }
      }
      await Promise.all(detailJobs);

      return {
        subject: subjectSummary,
        character: characterSummary,
        person: personSummary,
      };
    },
  );

  app.get(
    '/users/:username/collections/subjects',
    {
      schema: {
        summary: '获取用户条目收藏',
        operationId: 'getUserSubjectCollections',
        tags: [Tag.Collection],
        params: t.Object({
          username: t.String({ minLength: 1 }),
        }),
        querystring: t.Object({
          subjectType: t.Optional(t.Enum(SubjectType, { description: '条目类型' })),
          type: t.Optional(t.Enum(CollectionType, { description: '收藏类型' })),
          limit: t.Optional(t.Integer({ default: 20, maximum: 100, description: 'max 100' })),
          offset: t.Optional(t.Integer({ default: 0 })),
        }),
        response: {
          200: res.Paged(t.Ref(UserSubjectCollection)),
          404: t.Ref(res.Error, {
            'x-examples': formatErrors(new NotFoundError('user')),
          }),
        },
      },
    },
    async ({
      auth,
      params: { username },
      query: { subjectType, type, limit = 20, offset = 0 },
    }) => {
      const user = await fetchUserByUsername(username);
      if (!user) {
        throw new NotFoundError('user');
      }

      const conditions = op.and(
        op.eq(schema.chiiSubjectInterests.interestUid, user.id),
        subjectType
          ? op.eq(schema.chiiSubjectInterests.interestSubjectType, subjectType)
          : undefined,
        type ? op.eq(schema.chiiSubjectInterests.interestType, type) : undefined,
        op.eq(schema.chiiSubjects.ban, 0),
        op.eq(schema.chiiSubjectFields.fieldRedirect, 0),
        auth.userID === user.id ? undefined : op.eq(schema.chiiSubjectInterests.interestPrivate, 0),
        auth.allowNsfw ? undefined : op.eq(schema.chiiSubjects.nsfw, false),
      );

      const [{ count = 0 } = {}] = await db
        .select({ count: op.count() })
        .from(schema.chiiSubjectInterests)
        .innerJoin(
          schema.chiiSubjects,
          op.eq(schema.chiiSubjectInterests.interestSubjectId, schema.chiiSubjects.id),
        )
        .innerJoin(
          schema.chiiSubjectFields,
          op.eq(schema.chiiSubjects.id, schema.chiiSubjectFields.id),
        )
        .where(conditions)
        .execute();

      const data = await db
        .select()
        .from(schema.chiiSubjectInterests)
        .innerJoin(
          schema.chiiSubjects,
          op.eq(schema.chiiSubjectInterests.interestSubjectId, schema.chiiSubjects.id),
        )
        .innerJoin(
          schema.chiiSubjectFields,
          op.eq(schema.chiiSubjects.id, schema.chiiSubjectFields.id),
        )
        .where(conditions)
        .orderBy(op.desc(schema.chiiSubjectInterests.updatedAt))
        .limit(limit)
        .offset(offset)
        .execute();

      const collections = data.map((d) =>
        toUserSubjectCollection(d.chii_subject_interests, d.subject, d.subject_field),
      );

      return {
        data: collections,
        total: count,
      };
    },
  );

  app.get(
    '/users/:username/collections/characters',
    {
      schema: {
        summary: '获取用户角色收藏',
        operationId: 'getUserCharacterCollections',
        tags: [Tag.Collection],
        params: t.Object({
          username: t.String({ minLength: 1 }),
        }),
        querystring: t.Object({
          limit: t.Optional(t.Integer({ default: 20, maximum: 100, description: 'max 100' })),
          offset: t.Optional(t.Integer({ default: 0 })),
        }),
        responses: {
          200: res.Paged(t.Ref(UserCharacterCollection)),
          404: t.Ref(res.Error, {
            'x-examples': formatErrors(new NotFoundError('user')),
          }),
        },
      },
    },
    async ({ auth, params: { username }, query: { limit = 20, offset = 0 } }) => {
      const user = await fetchUserByUsername(username);
      if (!user) {
        throw new NotFoundError('user');
      }

      const conditions = op.and(
        op.eq(schema.chiiPersonCollects.uid, user.id),
        op.eq(schema.chiiCharacters.ban, 0),
        op.eq(schema.chiiCharacters.redirect, 0),
        auth.allowNsfw ? undefined : op.eq(schema.chiiCharacters.nsfw, 0),
      );

      const [{ count = 0 } = {}] = await db
        .select({ count: op.count() })
        .from(schema.chiiPersonCollects)
        .innerJoin(
          schema.chiiCharacters,
          op.eq(schema.chiiPersonCollects.mid, schema.chiiCharacters.id),
        )
        .where(conditions)
        .execute();

      const data = await db
        .select()
        .from(schema.chiiPersonCollects)
        .innerJoin(
          schema.chiiCharacters,
          op.eq(schema.chiiPersonCollects.mid, schema.chiiCharacters.id),
        )
        .where(conditions)
        .orderBy(op.desc(schema.chiiPersonCollects.createdAt))
        .limit(limit)
        .offset(offset)
        .execute();
      const collection = data.map((d) =>
        toUserCharacterCollection(d.chii_person_collects, d.chii_characters),
      );

      return {
        data: collection,
        total: count,
      };
    },
  );

  app.get(
    '/users/:username/collections/persons',
    {
      schema: {
        summary: '获取用户人物收藏',
        operationId: 'getUserPersonCollections',
        tags: [Tag.Collection],
        params: t.Object({
          username: t.String({ minLength: 1 }),
        }),
        querystring: t.Object({
          limit: t.Optional(t.Integer({ default: 20, maximum: 100, description: 'max 100' })),
          offset: t.Optional(t.Integer({ default: 0 })),
        }),
        responses: {
          200: res.Paged(t.Ref(UserPersonCollection)),
          404: t.Ref(res.Error, {
            'x-examples': formatErrors(new NotFoundError('user')),
          }),
        },
      },
    },
    async ({ auth, params: { username }, query: { limit = 20, offset = 0 } }) => {
      const user = await fetchUserByUsername(username);
      if (!user) {
        throw new NotFoundError('user');
      }

      const conditions = op.and(
        op.eq(schema.chiiPersonCollects.uid, user.id),
        op.eq(schema.chiiPersons.ban, 0),
        op.eq(schema.chiiPersons.redirect, 0),
        auth.allowNsfw ? undefined : op.eq(schema.chiiPersons.nsfw, 0),
      );

      const [{ count = 0 } = {}] = await db
        .select({ count: op.count() })
        .from(schema.chiiPersonCollects)
        .innerJoin(schema.chiiPersons, op.eq(schema.chiiPersonCollects.mid, schema.chiiPersons.id))
        .where(conditions)
        .execute();

      const data = await db
        .select()
        .from(schema.chiiPersonCollects)
        .innerJoin(schema.chiiPersons, op.eq(schema.chiiPersonCollects.mid, schema.chiiPersons.id))
        .where(conditions)
        .orderBy(op.desc(schema.chiiPersonCollects.createdAt))
        .limit(limit)
        .offset(offset)
        .execute();
      const collection = data.map((d) =>
        toUserPersonCollection(d.chii_person_collects, d.chii_persons),
      );

      return {
        data: collection,
        total: count,
      };
    },
  );
}
