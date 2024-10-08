import type { Static } from '@sinclair/typebox';
import { Type as t } from '@sinclair/typebox';

import { db, op } from '@app/drizzle/db.ts';
import {
  chiiSubjectFields,
  chiiSubjectInterests,
  chiiSubjects,
  type ISubject,
  type ISubjectFields,
  type ISubjectInterests,
} from '@app/drizzle/schema';
import { NotFoundError } from '@app/lib/error.ts';
import { Tag } from '@app/lib/openapi/index.ts';
import { fetchUserByUsername } from '@app/lib/orm/index.ts';
import { subjectCover } from '@app/lib/response';
import { CollectionType, CollectionTypeProfileValues } from '@app/lib/subject/collection';
import { SubjectType, SubjectTypeValues } from '@app/lib/subject/type.ts';
import * as res from '@app/lib/types/res.ts';
import { formatErrors } from '@app/lib/types/res.ts';
import type { App } from '@app/routes/type.ts';
import { platforms } from '@app/vendor/common-json/subject_platforms.json';

export type ISlimSubject = Static<typeof SlimSubject>;
const SlimSubject = t.Object(
  {
    airtime: t.Ref(res.SubjectAirtime),
    collection: t.Ref(res.SubjectCollection),
    eps: t.Integer(),
    id: t.Integer(),
    images: t.Optional(t.Ref(res.SubjectImages)),
    infobox: t.Ref(res.Infobox),
    meta_tags: t.Array(t.String()),
    locked: t.Boolean(),
    name: t.String(),
    name_cn: t.String(),
    nsfw: t.Boolean(),
    platform: t.Ref(res.SubjectPlatform),
    rating: t.Ref(res.SubjectRating),
    redirect: t.Integer(),
    series: t.Boolean(),
    series_entry: t.Integer(),
    summary: t.String(),
    type: t.Enum(SubjectType),
    volumes: t.Integer(),
  },
  {
    $id: 'SlimSubject',
  },
);

export type IUserSubjectCollection = Static<typeof UserSubjectCollection>;
const UserSubjectCollection = t.Object(
  {
    subject: t.Ref(SlimSubject),
    rate: t.Integer(),
    type: t.Enum(CollectionType),
    comment: t.String(),
    tags: t.Array(t.String()),
    ep_status: t.Integer(),
    vol_status: t.Integer(),
    private: t.Boolean(),
    updated_at: t.Integer(),
  },
  { $id: 'UserSubjectCollection' },
);

export type IUserCollectionsSubjectSummary = Static<typeof UserCollectionsSubjectSummary>;
const UserCollectionsSubjectSummary = t.Object(
  {
    counts: t.Record(t.String({ description: 'collection type id' }), t.Integer(), {
      examples: [{ '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }],
    }),
    details: t.Record(
      t.String({ description: 'collection type id' }),
      t.Array(t.Ref(UserSubjectCollection)),
      {
        examples: [{ '1': [], '2': [], '3': [], '4': [], '5': [] }],
      },
    ),
  },
  { $id: 'UserCollectionsSubjectSummary' },
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
              counts: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 },
              details: { '1': [], '2': [], '3': [], '4': [], '5': [] },
            },
          },
        ],
      },
    ),
    // character: t.Ref(UserCollectionsCharacterSummary),
    // person: t.Ref(UserCollectionsPersonSummary),
    // index: t.Ref(UserCollectionsIndexSummary),
  },
  { $id: 'UserCollectionsSummary' },
);

function convertSubjectAirtime(fields: ISubjectFields): res.ISubjectAirtime {
  return {
    date: fields.date,
    month: fields.month,
    weekday: fields.weekDay,
    year: fields.year,
  };
}

function convertSubjectCollection(subject: ISubject): res.ISubjectCollection {
  return {
    [CollectionType.Wish]: subject.wish,
    [CollectionType.Collect]: subject.done,
    [CollectionType.Doing]: subject.doing,
    [CollectionType.OnHold]: subject.onHold,
    [CollectionType.Dropped]: subject.dropped,
  };
}

function convertSubjectPlatform(subject: ISubject): res.ISubjectPlatform {
  const plats = platforms as Record<string, Record<string, res.ISubjectPlatform>>;
  const found = plats[subject.typeID]?.[subject.platform];
  return found || { id: 0, type: '', type_cn: '', alias: '' };
}

function convertSubjectRating(fields: ISubjectFields): res.ISubjectRating {
  const ratingCount = [
    fields.fieldRate1,
    fields.fieldRate2,
    fields.fieldRate3,
    fields.fieldRate4,
    fields.fieldRate5,
    fields.fieldRate6,
    fields.fieldRate7,
    fields.fieldRate8,
    fields.fieldRate9,
    fields.fieldRate10,
  ];
  const total = ratingCount.reduce((a, b) => a + b, 0);
  const totalScore = ratingCount.reduce((a, b, i) => a + b * (i + 1), 0);
  const rating = {
    rank: fields.fieldRank,
    total: total,
    score: Math.round((totalScore * 100) / total) / 100,
    count: ratingCount,
  };
  return rating;
}

function convertSubject(subject: ISubject, fields: ISubjectFields): ISlimSubject {
  return {
    airtime: convertSubjectAirtime(fields),
    collection: convertSubjectCollection(subject),
    eps: subject.eps,
    id: subject.id,
    images: subjectCover(subject.image) || undefined,
    infobox: res.toInfobox(subject.infobox),
    meta_tags: subject.metaTags
      .split(',')
      .map((x) => x.trim())
      .filter((x) => x !== ''),
    locked: subject.ban === 2,
    name: subject.name,
    name_cn: subject.nameCN,
    nsfw: subject.nsfw,
    platform: convertSubjectPlatform(subject),
    rating: convertSubjectRating(fields),
    redirect: fields.fieldRedirect,
    series: Boolean(subject.series),
    series_entry: subject.seriesEntry,
    summary: subject.summary,
    type: subject.typeID,
    volumes: subject.volumes,
  };
}

function convertUserSubjectCollection(
  interest: ISubjectInterests,
  subject: ISubject,
  fields: ISubjectFields,
): IUserSubjectCollection {
  return {
    subject: convertSubject(subject, fields),
    rate: interest.interestRate,
    type: interest.interestType,
    comment: interest.interestComment,
    tags: interest.interestTag
      .split(',')
      .map((x) => x.trim())
      .filter((x) => x !== ''),
    ep_status: interest.interestEpStatus,
    vol_status: interest.interestVolStatus,
    private: Boolean(interest.interestPrivate),
    updated_at: interest.interestUpdatedAt,
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
  app.addSchema(res.Infobox);
  app.addSchema(SlimSubject);
  app.addSchema(UserSubjectCollection);
  app.addSchema(UserCollectionsSubjectSummary);
  app.addSchema(UserCollectionsSummary);

  app.get(
    '/users/:username/collections/summary',
    {
      schema: {
        description: '获取用户收藏概览',
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
      const defaultDetails: Record<string, IUserSubjectCollection[]> = {
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
      const data = await db
        .select({
          count: op.count(),
          interest_subject_type: chiiSubjectInterests.interestSubjectType,
          interest_type: chiiSubjectInterests.interestType,
        })
        .from(chiiSubjectInterests)
        .where(op.eq(chiiSubjectInterests.interestUid, user.id))
        .groupBy(chiiSubjectInterests.interestSubjectType, chiiSubjectInterests.interestType)
        .execute();
      for (const d of data) {
        const summary = subjectSummary[d.interest_subject_type];
        if (!summary) {
          continue;
        }
        summary.counts[d.interest_type] = d.count;
      }
      const jobs = [];
      async function appendDetails(stype: number, ctype: number, userID: number) {
        const data = await db
          .select()
          .from(chiiSubjectInterests)
          .innerJoin(chiiSubjects, op.eq(chiiSubjectInterests.interestSubjectId, chiiSubjects.id))
          .innerJoin(chiiSubjectFields, op.eq(chiiSubjects.id, chiiSubjectFields.id))
          .where(
            op.and(
              op.eq(chiiSubjectInterests.interestUid, userID),
              op.eq(chiiSubjectInterests.interestSubjectType, stype),
              op.eq(chiiSubjectInterests.interestType, ctype),
              auth.userID === userID ? undefined : op.eq(chiiSubjectInterests.interestPrivate, 0),
            ),
          )
          .orderBy(op.desc(chiiSubjectInterests.interestUpdatedAt))
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
          const collection = convertUserSubjectCollection(
            d.chii_subject_interests,
            d.subject,
            d.subject_field,
          );
          details.push(collection);
        }
      }
      for (const stype of SubjectTypeValues) {
        for (const ctype of CollectionTypeProfileValues) {
          jobs.push(appendDetails(stype, ctype, user.id));
        }
      }
      await Promise.all(jobs);
      return {
        subject: subjectSummary,
      };
    },
  );
}
