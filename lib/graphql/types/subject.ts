import type { Wiki } from '@bgm38/wiki';
import { parse as parseWiki, WikiSyntaxError } from '@bgm38/wiki';
import * as php from '@trim21/php-serialize';
import { extendType, intArg, nonNull, objectType } from 'nexus';

import type { Context } from '@app/lib/graphql/context.ts';
import type * as entity from '@app/lib/orm/entity/index.ts';
import { SubjectRepo } from '@app/lib/orm/index.ts';
import { subjectCover } from '@app/lib/response.ts';
import { platforms } from '@app/lib/subject/index.ts';

const Episode = objectType({
  name: 'Episode',
  definition(t) {
    t.nonNull.int('id');
    t.nonNull.string('name');
    t.nonNull.string('name_cn');
    t.nonNull.string('description');
    t.nonNull.string('airdate');
    t.nonNull.int('dateline');
    t.nonNull.int('comment');
    t.nonNull.int('type');
    t.nonNull.int('disc');
    t.nonNull.string('duration');
    t.nonNull.float('sort');
  },
});

const SubjectTag = objectType({
  name: 'SubjectTag',
  definition(t) {
    t.nonNull.string('name');
    t.nonNull.int('count');
  },
});

const SubjectImages = objectType({
  name: 'SubjectImages',
  definition(t) {
    t.nonNull.string('large');
    t.nonNull.string('common');
    t.nonNull.string('medium');
    t.nonNull.string('small');
    t.nonNull.string('grid');
  },
});

const SubjectPlatform = objectType({
  name: 'SubjectPlatform',
  definition(t) {
    t.nonNull.int('id');
    t.nonNull.string('type');
    t.nullable.string('type_cn');
    t.nullable.string('alias');
    t.nullable.string('wiki_tpl');
    t.nullable.string('search_string');
    t.nullable.boolean('enable_header');
  },
});

const InfoboxValuesItem = objectType({
  name: 'InfoboxValue',
  definition(t) {
    t.nullable.string('k');
    t.nullable.string('v');
  },
});

const InfoboxItem = objectType({
  name: 'Infobox',
  definition(t) {
    t.nonNull.string('key');
    t.list.nonNull.field('values', { type: InfoboxValuesItem });
  },
});

const SubjectCollection = objectType({
  name: 'SubjectCollection',
  definition(t) {
    t.nonNull.int('wish');
    t.nonNull.int('collect');
    t.nonNull.int('doing');
    t.nonNull.int('on_hold');
    t.nonNull.int('dropped');
  },
});

const SubjectRating = objectType({
  name: 'SubjectRating',
  definition(t) {
    t.nonNull.int('rank');
    t.nonNull.int('total');
    t.nonNull.float('score');
    t.list.nonNull.int('count');
  },
});

const SubjectAirtime = objectType({
  name: 'SubjectAirtime',
  definition(t) {
    t.nonNull.int('year');
    t.nonNull.int('month');
    t.nonNull.int('weekday');
    t.nonNull.string('date');
  },
});

const Subject = objectType({
  name: 'Subject',
  definition(t) {
    t.nonNull.int('id');
    t.nonNull.int('type');
    t.nonNull.string('name');
    t.nonNull.string('name_cn');
    t.nonNull.field('images', { type: SubjectImages });
    t.nonNull.field('platform', { type: SubjectPlatform });
    t.list.nonNull.field('infobox', {
      type: InfoboxItem,
      args: {
        limit: intArg({ default: 0 }),
      },
      resolve({ infobox }: { infobox: unknown[] }, { limit }: { limit?: number }) {
        if (limit && limit > 0) {
          return infobox.slice(0, limit);
        }

        return infobox;
      },
    });
    t.nonNull.string('summary');
    t.nonNull.int('volumes');
    t.nonNull.int('eps');
    t.nonNull.field('collection', { type: SubjectCollection });
    t.nonNull.boolean('series');
    t.nonNull.int('series_entry');
    t.nonNull.field('airtime', { type: SubjectAirtime });
    t.nonNull.field('rating', { type: SubjectRating });
    t.nonNull.boolean('nsfw');
    t.nonNull.boolean('locked');
    t.nonNull.int('redirect');
    t.list.nonNull.field('tags', {
      type: SubjectTag,
      args: {
        limit: intArg({ default: 0 }),
      },
      resolve({ tags }: { tags: unknown[] }, { limit }: { limit?: number }) {
        if (limit && limit > 0) {
          return tags.slice(0, limit);
        }

        return tags;
      },
    });
    t.list.nonNull.field('episodes', {
      type: Episode,
      args: {
        limit: nonNull(intArg({ default: 30 })),
        offset: nonNull(
          intArg({
            default: 0,
            description:
              '超出范围时会返回空数据。可以使用负数，来获取最后几个章节。如 `-1` 会返回最后一个章节， `-2` 会返回最后两个章节',
          }),
        ),
        type: intArg(),
      },
      async resolve(
        parent: { id: number },
        { limit, offset, type }: { limit: number; offset: number; type: number | undefined },
        { repo }: Context,
      ) {
        if (offset < 0) {
          const count = await repo.Episode.count({
            where: { type: type ?? undefined, subjectID: parent.id },
          });
          offset = count + offset;
        }

        const episodes = await repo.Episode.find({
          order: { sort: 'asc' },
          where: { type: type ?? undefined, subjectID: parent.id },
          skip: offset,
          take: limit,
        });

        return episodes.map((e: entity.Episode) => {
          return {
            id: e.id,
            type: e.type,
            name: e.name,
            name_cn: e.nameCN,
            description: e.summary,
            airdate: e.airDate,
            dateline: e.epDateline,
            comment: e.epComment,
            disc: e.epDisc,
            duration: e.duration,
            sort: e.sort,
          };
        });
      },
    });
  },
});

const SubjectByIDQuery = extendType({
  type: 'Query',
  definition(t) {
    t.field('subject', {
      type: Subject,
      args: { id: nonNull(intArg()) },
      async resolve(_parent, { id }: { id: number }, { auth: { allowNsfw }, repo }: Context) {
        const subject = await SubjectRepo.findOne({
          where: {
            id,
          },
        });

        if (!subject) {
          return null;
        }

        if (subject.subjectNsfw && !allowNsfw) {
          return null;
        }

        const fields = await repo.SubjectFields.findOne({
          where: {
            subject_id: id,
          },
        });

        if (!fields) {
          return null;
        }

        const platform = platforms(subject.typeID).find((x) => x.id === subject.platform);

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
          tags: (php.parse(fields.fieldTags) as { tag_name: string | undefined; result: string }[])
            .filter((x) => x.tag_name !== undefined)
            .map((x) => ({ name: x.tag_name, count: Number.parseInt(x.result) }))
            .filter((x) => !Number.isNaN(x.count)),
        };
      },
    });
  },
});

export default [Episode, Subject, SubjectByIDQuery];
