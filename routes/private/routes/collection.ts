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
import { type Platform } from '@app/lib/subject/platform.ts';
import { SubjectType, SubjectTypeValues } from '@app/lib/subject/type.ts';
import * as res from '@app/lib/types/res.ts';
import { formatErrors } from '@app/lib/types/res.ts';
import type { App } from '@app/routes/type.ts';
import { platforms } from '@app/vendor/common-json/subject_platforms.json';

const exampleSlimSubject = {
  airtime: {
    date: '2008-04-06',
    month: 4,
    weekday: 7,
    year: 2008,
  },
  collection: {
    '1': 622,
    '2': 13216,
    '3': 147,
    '4': 224,
    '5': 115,
  },
  eps: 25,
  id: 8,
  images: {
    common: 'https://lain.bgm.tv/pic/cover/c/c9/f0/8_wK0z3.jpg',
    grid: 'https://lain.bgm.tv/pic/cover/g/c9/f0/8_wK0z3.jpg',
    large: 'https://lain.bgm.tv/pic/cover/l/c9/f0/8_wK0z3.jpg',
    medium: 'https://lain.bgm.tv/pic/cover/m/c9/f0/8_wK0z3.jpg',
    small: 'https://lain.bgm.tv/pic/cover/s/c9/f0/8_wK0z3.jpg',
  },
  infobox: {
    Copyright: [
      {
        v: '（C）2006 SUNRISE inc./MBS',
      },
    ],
    中文名: [
      {
        v: 'Code Geass 反叛的鲁路修R2',
      },
    ],
    人物原案: [
      {
        v: 'CLAMP',
      },
    ],
    人物设定: [
      {
        v: '木村貴宏',
      },
    ],
    其他: [
      {
        v: '',
      },
    ],
    其他电视台: [
      {
        v: '',
      },
    ],
    别名: [
      {
        v: '叛逆的鲁路修R2',
      },
      {
        v: 'Code Geass: Hangyaku no Lelouch R2',
      },
      {
        v: '叛逆的勒鲁什R2',
      },
      {
        v: '叛逆的鲁鲁修R2',
      },
      {
        v: 'コードギアス 反逆のルルーシュR2',
      },
      {
        v: 'Code Geass: Lelouch of the Rebellion R2',
      },
      {
        v: '叛逆的勒路什R2',
      },
    ],
    动画制作: [
      {
        v: 'サンライズ',
      },
    ],
    官方网站: [
      {
        v: 'http://www.geass.jp/r2/',
      },
    ],
    导演: [
      {
        v: '谷口悟朗',
      },
    ],
    摄影监督: [
      {
        v: '大矢創太',
      },
    ],
    播放电视台: [
      {
        v: '每日放送',
      },
    ],
    播放结束: [
      {
        v: '2008年9月28日',
      },
    ],
    放送开始: [
      {
        v: '2008年4月6日',
      },
    ],
    放送星期: [
      {
        v: '',
      },
    ],
    系列构成: [
      {
        v: '大河内一楼',
      },
    ],
    美术监督: [
      {
        v: '菱沼由典',
      },
    ],
    色彩设计: [
      {
        v: '岩沢れい子',
      },
    ],
    话数: [
      {
        v: '25',
      },
    ],
    音乐: [
      {
        v: '中川幸太郎、黒石ひとみ',
      },
    ],
    音乐制作: [
      {
        v: 'AUDIO PLANNING U',
      },
    ],
    音响监督: [
      {
        v: '浦上靖夫、井澤基',
      },
    ],
  },
  locked: false,
  metaTags: [],
  name: 'コードギアス 反逆のルルーシュR2',
  nameCN: 'Code Geass 反叛的鲁路修R2',
  nsfw: false,
  platform: {
    alias: 'tv',
    enableHeader: true,
    id: 1,
    order: 0,
    type: 'TV',
    typeCN: 'TV',
    wikiTpl: 'TVAnime',
  },
  rating: {
    count: [44, 15, 32, 66, 145, 457, 1472, 3190, 2640, 1377],
    score: 8.19,
    total: 9438,
  },
  redirect: 0,
  series: false,
  seriesEntry: 0,
  summary:
    '　　“东京决战”一年后，布里塔尼亚少年鲁路修在11区（原日本国）过着平凡的学生生活。但是，鲁路修与弟弟罗洛的一次出行，遇到了黑色骑士团的余党。在与少女C.C再次结成契约之后，尘封的记忆摆在了鲁路修的面前。',
  type: 2,
  volumes: 0,
};

export type ISlimSubject = Static<typeof SlimSubject>;
const SlimSubject = t.Object(
  {
    airtime: t.Ref(res.SubjectAirtime),
    collection: t.Ref(res.SubjectCollection),
    eps: t.Integer(),
    id: t.Integer(),
    images: t.Optional(t.Ref(res.SubjectImages)),
    infobox: t.Ref(res.Infobox),
    metaTags: t.Array(t.String()),
    locked: t.Boolean(),
    name: t.String(),
    nameCN: t.String(),
    nsfw: t.Boolean(),
    platform: t.Ref(res.SubjectPlatform),
    rating: t.Ref(res.SubjectRating),
    redirect: t.Integer(),
    series: t.Boolean(),
    seriesEntry: t.Integer(),
    summary: t.String(),
    type: t.Enum(SubjectType),
    volumes: t.Integer(),
  },
  {
    $id: 'SlimSubject',
    examples: [exampleSlimSubject],
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
    epStatus: t.Integer(),
    volStatus: t.Integer(),
    private: t.Boolean(),
    updatedAt: t.Integer(),
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
        examples: [{ '1': [], '2': [exampleSlimSubject], '3': [], '4': [], '5': [] }],
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
              counts: { '1': 0, '2': 1, '3': 0, '4': 0, '5': 0 },
              details: { '1': [], '2': [exampleSlimSubject], '3': [], '4': [], '5': [] },
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
  const plats = platforms as Record<string, Record<string, Platform>>;
  const found = plats[subject.typeID]?.[subject.platform];
  if (found) {
    return {
      id: found.id,
      type: found.type,
      typeCN: found.type_cn,
      alias: found.alias || '',
      order: found.order,
      wikiTpl: found.wiki_tpl,
      searchString: found.search_string,
      enableHeader: found.enable_header,
    };
  } else {
    return { id: 0, type: '', typeCN: '', alias: '' };
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
    total: total,
    score: total === 0 ? 0 : Math.round((totalScore * 100) / total) / 100,
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
    metaTags: subject.metaTags
      .split(',')
      .map((x) => x.trim())
      .filter((x) => x !== ''),
    locked: subject.ban === 2,
    name: subject.name,
    nameCN: subject.nameCN,
    nsfw: subject.nsfw,
    platform: convertSubjectPlatform(subject),
    rating: convertSubjectRating(fields),
    redirect: fields.fieldRedirect,
    series: Boolean(subject.series),
    seriesEntry: subject.seriesEntry,
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
    epStatus: interest.interestEpStatus,
    volStatus: interest.interestVolStatus,
    private: Boolean(interest.interestPrivate),
    updatedAt: interest.updatedAt,
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
              op.eq(chiiSubjects.ban, 0),
              op.eq(chiiSubjectFields.fieldRedirect, 0),
              auth.userID === userID ? undefined : op.eq(chiiSubjectInterests.interestPrivate, 0),
              auth.allowNsfw ? undefined : op.eq(chiiSubjects.nsfw, false),
            ),
          )
          .orderBy(op.desc(chiiSubjectInterests.updatedAt))
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
