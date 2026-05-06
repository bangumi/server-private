import type { Wiki } from '@bgm38/wiki';
import { parse as parseWiki, WikiSyntaxError } from '@bgm38/wiki';

import { db, op, type orm, schema } from '@app/drizzle';
import type * as types from '@app/lib/graphql/__generated__/resolvers.ts';
import { subjectCover } from '@app/lib/images';
import * as convert from '@app/lib/types/convert.ts';
import { findSubjectPlatform } from '@app/vendor';

export function convertSubject(subject: orm.ISubject, fields: orm.ISubjectFields) {
  const platform = findSubjectPlatform(subject.typeID, subject.platform) ?? {
    id: 0,
    type: '',
    type_cn: '',
  };
  let wiki: Wiki = {
    type: '',
    data: [],
  };
  try {
    wiki = parseWiki(subject.infobox);
  } catch (error) {
    if (!(error instanceof WikiSyntaxError)) {
      throw error;
    }
  }
  const infobox = wiki.data.map((item) => {
    if (item.array) {
      return item;
    }
    return {
      key: item.key,
      values: [
        {
          v: item.value,
        },
      ],
    };
  });
  const collection = {
    wish: subject.wish,
    collect: subject.collect,
    doing: subject.doing,
    on_hold: subject.onHold,
    dropped: subject.dropped,
  };
  const airtime = {
    year: fields.year,
    month: fields.month,
    weekday: fields.weekday,
    date: fields.date,
  };
  const ratingCount = [
    fields.rate1,
    fields.rate2,
    fields.rate3,
    fields.rate4,
    fields.rate5,
    fields.rate6,
    fields.rate7,
    fields.rate8,
    fields.rate9,
    fields.rate10,
  ];
  const total = ratingCount.reduce((a, b) => a + b, 0);
  const totalScore = ratingCount.reduce((a, b, i) => a + b * (i + 1), 0);
  const rating = {
    rank: fields.rank,
    total: total,
    score: total === 0 ? 0 : Math.round((totalScore * 100) / total) / 100,
    count: ratingCount,
  };
  return {
    id: subject.id,
    type: subject.typeID,
    name: subject.name,
    name_cn: subject.nameCN,
    images: subjectCover(subject.image),
    platform: platform,
    infobox: infobox,
    summary: subject.summary,
    volumes: subject.volumes,
    eps: subject.eps,
    collection: collection,
    series: Boolean(subject.series),
    series_entry: subject.seriesEntry,
    airtime: airtime,
    rating: rating,
    nsfw: subject.nsfw,
    locked: subject.ban === 2,
    redirect: fields.redirect,
    tags: convert.toSubjectTags(fields.tags),
  };
}

export function convertTopic(topic: orm.ISubjectTopic, user: orm.IUser) {
  return {
    id: topic.id,
    creator: convert.toSlimUser(user),
    title: topic.title,
    created_at: topic.createdAt,
    updated_at: topic.updatedAt,
    replies: topic.replies,
    state: topic.state,
    display: topic.display,
  };
}

export const subjectResolver: types.QueryResolvers['subject'] = async (
  _parent,
  { id },
  { auth: { allowNsfw } },
): Promise<types.Subject | null> => {
  const conditions = [op.eq(schema.chiiSubjects.id, id)];
  if (!allowNsfw) {
    conditions.push(op.eq(schema.chiiSubjects.nsfw, false));
  }
  const [data] = await db
    .select()
    .from(schema.chiiSubjects)
    .innerJoin(schema.chiiSubjectFields, op.eq(schema.chiiSubjects.id, schema.chiiSubjectFields.id))
    .where(op.and(...conditions));
  if (!data) {
    return null;
  }

  return convertSubject(data.chii_subjects, data.chii_subject_fields);
};
