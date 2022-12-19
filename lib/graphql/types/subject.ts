import { nonNull, objectType, extendType, intArg } from 'nexus';
import * as php from 'php-serialize';

import { SubjectRepo } from '../../orm';
import type * as entity from '../../orm/entity';
import type { Context } from '../context';

const Episode = objectType({
  name: 'Episode',
  definition(t) {
    t.nonNull.int('id');
    t.nonNull.string('name');
    t.nonNull.string('name_cn');
    t.nonNull.string('description');
    t.nonNull.int('type');
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

const Subject = objectType({
  name: 'Subject',
  definition(t) {
    t.nonNull.int('id');
    t.nonNull.string('name');
    t.nonNull.string('name_cn');
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
            where: { epType: type ?? undefined, epSubjectId: parent.id },
          });
          offset = count + offset;
        }

        const episodes = await repo.Episode.find({
          order: { epSort: 'asc' },
          where: { epType: type ?? undefined, epSubjectId: parent.id },
          skip: offset,
          take: limit,
        });

        return episodes.map((e: entity.Episode) => {
          return {
            id: e.id,
            name: e.epName,
            name_cn: e.epNameCn,
            description: e.epDesc,
            type: e.epType,
            duration: e.epDuration,
            sort: e.epSort,
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

        return {
          id: subject.id,
          name: subject.subjectName,
          name_cn: subject.subjectNameCn,
          tags: (
            php.unserialize(fields.fieldTags) as { tag_name: string | undefined; result: string }[]
          )
            .filter((x) => x.tag_name !== undefined)
            .map((x) => ({ name: x.tag_name, count: Number.parseInt(x.result) }))
            .filter((x) => !Number.isNaN(x.count)),
        };
      },
    });
  },
});

export default [Episode, Subject, SubjectByIDQuery];
