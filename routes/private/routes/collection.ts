import type { Wiki } from '@bgm38/wiki';
import { parse as parseWiki, WikiSyntaxError } from '@bgm38/wiki';
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
import { logger } from '@app/lib/logger';
import { Tag } from '@app/lib/openapi/index.ts';
import { fetchUserByUsername } from '@app/lib/orm/index.ts';
import { subjectCover } from '@app/lib/response';
import { CollectionType, CollectionTypeProfileValues } from '@app/lib/subject/collection';
import { platforms } from '@app/lib/subject/index.ts';
import { SubjectType, SubjectTypeValues } from '@app/lib/subject/type.ts';
import * as res from '@app/lib/types/res.ts';
import { formatErrors } from '@app/lib/types/res.ts';
import type { App } from '@app/routes/type.ts';

export type ISlimSubject = Static<typeof SlimSubject>;
const SlimSubject = t.Object(
  {
    airtime: t.Ref(res.SubjectAirtime),
    eps: t.Integer(),
    id: t.Integer(),
    images: t.Ref(res.SubjectImages),
    infobox: t.Array(t.Ref(res.Infobox)),
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
    type: t.Integer(),
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
    type: t.Integer(),
    comment: t.String(),
    tags: t.Array(t.String()),
    ep_status: t.Integer(),
    vol_status: t.Integer(),
    private: t.Boolean(),
    updated_at: t.Integer(),
  },
  { $id: 'UserSubjectCollection' },
);

const UserCollectionsSubjectCounts = t.Object(
  {
    wish: t.Integer(),
    collect: t.Integer(),
    doing: t.Integer(),
    on_hold: t.Integer(),
    dropped: t.Integer(),
  },
  { $id: 'UserCollectionsSubjectCounts' },
);

const UserCollectionsSubjectSummary = t.Object(
  {
    counts: t.Ref(UserCollectionsSubjectCounts),
    doing: t.Array(t.Ref(UserSubjectCollection)),
    collect: t.Array(t.Ref(UserSubjectCollection)),
  },
  { $id: 'UserCollectionsSubjectSummary' },
);

const UserCollectionSubjectTypes = t.Object(
  {
    book: t.Ref(UserCollectionsSubjectSummary),
    anime: t.Ref(UserCollectionsSubjectSummary),
    music: t.Ref(UserCollectionsSubjectSummary),
    game: t.Ref(UserCollectionsSubjectSummary),
    real: t.Ref(UserCollectionsSubjectSummary),
  },
  { $id: 'UserCollectionSubjectTypes' },
);

const UserCollectionsSummary = t.Object(
  {
    subject: t.Ref(UserCollectionSubjectTypes),
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

function convertInfobox(content: string): res.IInfobox[] {
  let wiki: Wiki = {
    type: '',
    data: [],
  };
  try {
    wiki = parseWiki(content);
  } catch (error) {
    if (!(error instanceof WikiSyntaxError)) {
      throw error;
    }
  }
  const infobox = wiki.data.map((item) => {
    if (item.array) {
      return {
        key: item.key,
        values:
          item.values?.map((v) => {
            return {
              k: v.k || '',
              v: v.v || '',
            };
          }) || [],
      };
    }
    return {
      key: item.key,
      values: [
        {
          k: '',
          v: item.value || '',
        },
      ],
    };
  });
  return infobox;
}

function convertSubjectPlatform(subject: ISubject): res.ISubjectPlatform {
  const found = platforms(subject.typeID).find((x) => x.id === subject.platform);
  if (found) {
    return {
      id: found.id,
      alias: found.alias || '',
      type: found.type,
      type_cn: found.type_cn,
    };
  } else {
    return {
      id: 0,
      alias: '',
      type: '',
      type_cn: '',
    };
  }
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
    eps: subject.eps,
    id: subject.id,
    images: subjectCover(subject.image),
    infobox: convertInfobox(subject.infobox),
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
    volumes: subject.fieldVolumes,
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
    updated_at: interest.interestLasttouch,
  };
}

function setCollectionCounts(
  summary: Static<typeof UserCollectionsSubjectSummary>,
  collectionType: number,
  counts: number,
) {
  switch (collectionType) {
    case CollectionType.Wish: {
      summary.counts.wish = counts;
      break;
    }
    case CollectionType.Collect: {
      summary.counts.collect = counts;
      break;
    }
    case CollectionType.Doing: {
      summary.counts.doing = counts;
      break;
    }
    case CollectionType.OnHold: {
      summary.counts.on_hold = counts;
      break;
    }
    case CollectionType.Dropped: {
      summary.counts.dropped = counts;
      break;
    }
  }
}

function appendCollection(
  summary: Static<typeof UserCollectionsSubjectSummary>,
  collectionType: number,
  collection: IUserSubjectCollection,
) {
  switch (collectionType) {
    case CollectionType.Collect: {
      summary.collect.push(collection);
      break;
    }
    case CollectionType.Doing: {
      summary.doing.push(collection);
      break;
    }
  }
}

// eslint-disable-next-line @typescript-eslint/require-await
export async function setup(app: App) {
  app.addSchema(res.Error);
  app.addSchema(res.SubjectAirtime);
  app.addSchema(res.SubjectImages);
  app.addSchema(res.SubjectPlatform);
  app.addSchema(res.SubjectRating);
  app.addSchema(res.Infobox);
  app.addSchema(SlimSubject);
  app.addSchema(UserSubjectCollection);
  app.addSchema(UserCollectionsSubjectCounts);
  app.addSchema(UserCollectionsSubjectSummary);
  app.addSchema(UserCollectionSubjectTypes);
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
    async ({ params: { username } }): Promise<Static<typeof UserCollectionsSummary>> => {
      const user = await fetchUserByUsername(username);
      if (!user) {
        throw new NotFoundError('user');
      }
      const defaultCounts = {
        wish: 0,
        collect: 0,
        doing: 0,
        on_hold: 0,
        dropped: 0,
      };
      const subjectSummary = {
        book: {
          counts: Object.assign({}, defaultCounts),
          doing: [],
          collect: [],
        },
        anime: {
          counts: Object.assign({}, defaultCounts),
          doing: [],
          collect: [],
        },
        music: {
          counts: Object.assign({}, defaultCounts),
          doing: [],
          collect: [],
        },
        game: {
          counts: Object.assign({}, defaultCounts),
          doing: [],
          collect: [],
        },
        real: {
          counts: Object.assign({}, defaultCounts),
          doing: [],
          collect: [],
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
        switch (d.interest_subject_type) {
          case SubjectType.Book: {
            setCollectionCounts(subjectSummary.book, d.interest_type, d.count);
            break;
          }
          case SubjectType.Anime: {
            setCollectionCounts(subjectSummary.anime, d.interest_type, d.count);
            break;
          }
          case SubjectType.Music: {
            setCollectionCounts(subjectSummary.music, d.interest_type, d.count);
            break;
          }
          case SubjectType.Game: {
            setCollectionCounts(subjectSummary.game, d.interest_type, d.count);
            break;
          }
          case SubjectType.Real: {
            setCollectionCounts(subjectSummary.real, d.interest_type, d.count);
            break;
          }
        }
      }
      for (const stype of SubjectTypeValues) {
        for (const ctype of CollectionTypeProfileValues) {
          const data = await db
            .select()
            .from(chiiSubjectInterests)
            .innerJoin(chiiSubjects, op.eq(chiiSubjectInterests.interestSubjectId, chiiSubjects.id))
            .innerJoin(chiiSubjectFields, op.eq(chiiSubjects.id, chiiSubjectFields.id))
            .where(
              op.and(
                op.eq(chiiSubjectInterests.interestSubjectType, stype),
                op.eq(chiiSubjectInterests.interestType, ctype),
              ),
            )
            .orderBy(op.desc(chiiSubjectInterests.interestLasttouch))
            .limit(7)
            .execute();
          for (const d of data) {
            const collection = convertUserSubjectCollection(
              d.chii_subject_interests,
              d.subject,
              d.subject_field,
            );
            switch (stype) {
              case SubjectType.Book: {
                appendCollection(subjectSummary.book, ctype, collection);
                break;
              }
              case SubjectType.Anime: {
                appendCollection(subjectSummary.anime, ctype, collection);
                break;
              }
              case SubjectType.Music: {
                appendCollection(subjectSummary.music, ctype, collection);
                break;
              }
              case SubjectType.Game: {
                appendCollection(subjectSummary.game, ctype, collection);
                break;
              }
              case SubjectType.Real: {
                appendCollection(subjectSummary.real, ctype, collection);
                break;
              }
            }
            logger.info(`collection: ${JSON.stringify(collection)}`);
          }
        }
      }
      return {
        subject: subjectSummary,
      };
    },
  );
}
