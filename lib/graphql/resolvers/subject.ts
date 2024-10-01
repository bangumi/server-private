import type { Wiki } from '@bgm38/wiki';
import { parse as parseWiki, WikiSyntaxError } from '@bgm38/wiki';
import * as php from '@trim21/php-serialize';

import type * as types from '@app/lib/graphql/__generated__/resolvers.ts';
import { convertUser } from '@app/lib/graphql/schema.ts';
import * as entity from '@app/lib/orm/entity/index.ts';
import { SubjectRepo } from '@app/lib/orm/index.ts';
import { subjectCover } from '@app/lib/response.ts';
import { platforms } from '@app/lib/subject/index.ts';

export function convertSubject(subject: entity.Subject) {
  const fields = subject.fields;
  const platform = platforms(subject.typeID).find((x) => x.id === subject.platform) ?? {
    id: 0,
    type: '',
    type_cn: '',
  };
  let wiki: Wiki = {
    type: '',
    data: [],
  };
  try {
    wiki = parseWiki(subject.fieldInfobox);
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
    wish: subject.subjectWish,
    collect: subject.subjectCollect,
    doing: subject.subjectDoing,
    on_hold: subject.subjectOnHold,
    dropped: subject.subjectDropped,
  };
  const airtime = {
    year: fields.year,
    month: fields.month,
    weekday: fields.fieldWeekDay,
    date: fields.date,
  };
  const ratingCount = [
    fields.fieldRate_1,
    fields.fieldRate_2,
    fields.fieldRate_3,
    fields.fieldRate_4,
    fields.fieldRate_5,
    fields.fieldRate_6,
    fields.fieldRate_7,
    fields.fieldRate_8,
    fields.fieldRate_9,
    fields.fieldRate_10,
  ];
  const total = ratingCount.reduce((a, b) => a + b, 0);
  const totalScore = ratingCount.reduce((a, b, i) => a + b * (i + 1), 0);
  const rating = {
    rank: fields.fieldRank,
    total: total,
    score: Math.round((totalScore * 100) / total) / 100,
    count: ratingCount,
  };
  return {
    id: subject.id,
    type: subject.typeID,
    name: subject.name,
    name_cn: subject.nameCN,
    images: subjectCover(subject.subjectImage),
    platform: platform,
    infobox: infobox,
    summary: subject.fieldSummary,
    volumes: subject.fieldVolumes,
    eps: subject.fieldEps,
    collection: collection,
    series: Boolean(subject.subjectSeries),
    series_entry: subject.subjectSeriesEntry,
    airtime: airtime,
    rating: rating,
    nsfw: subject.subjectNsfw,
    locked: subject.locked(),
    redirect: fields.fieldRedirect,
    tags: (php.parse(fields.fieldTags) as { tag_name: string; result: string }[])
      .filter((x) => x.tag_name !== undefined)
      .map((x) => ({ name: x.tag_name, count: Number.parseInt(x.result) }))
      .filter((x) => !Number.isNaN(x.count)),
  };
}

export function convertTopic(topic: entity.SubjectTopic) {
  return {
    id: topic.id,
    creator: convertUser(topic.creator),
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
  let query = SubjectRepo.createQueryBuilder('s')
    .innerJoinAndMapOne('s.fields', entity.SubjectFields, 'f', 'f.subjectID = s.id')
    .where('s.id = :id', { id });
  if (!allowNsfw) {
    query = query.andWhere('s.subjectNsfw = :allowNsfw', { allowNsfw });
  }
  const subject = await query.getOne();
  if (!subject) {
    return null;
  }

  return convertSubject(subject);
};
