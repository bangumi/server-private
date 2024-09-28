import * as fsp from 'node:fs/promises';
import * as path from 'node:path';

import { projectRoot } from '@app/lib/config.ts';
import type { Context } from '@app/lib/graphql/context.ts';
import { convertSubject } from '@app/lib/graphql/types/subject.ts';
import * as entity from '@app/lib/orm/entity/index.ts';
import { fetchUser, SubjectRepo } from '@app/lib/orm/index.ts';
import { avatar } from '@app/lib/response.ts';

import type * as types from './__generated__/resolvers.ts';

const subjectResolver: types.QueryResolvers['subject'] = async (
  _parent,
  {
    id,
  }: {
    id: number;
  },
  { auth: { allowNsfw } }: Context,
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

export const resolvers = {
  Query: {
    async me(_parent, _args, { auth }: Context) {
      if (!auth.userID) {
        return null;
      }

      const user = await fetchUser(auth.userID);
      if (!user) {
        return null;
      }

      return {
        id: user.id,
        avatar: avatar(user.img),
        nickname: user.nickname,
        username: user.username,
      };
    },

    subject: subjectResolver,
  },

  Subject: {
    tags(parent, { limit }): types.SubjectTag[] {
      if (limit && limit > 0) {
        return parent.tags.slice(0, limit);
      }

      return parent.tags;
    },
    async episodes(
      parent: { id: number },
      { limit, offset, type },
      { repo }: Context,
    ): Promise<types.Episode[]> {
      if (!parent.id) {
        return [];
      }

      if (offset < 0) {
        const count = await repo.Episode.createQueryBuilder('t')
          .where('t.subjectID = :s', { s: parent.id })
          .getCount();

        offset = count + offset;
      }

      let s = repo.Episode.createQueryBuilder('t')
        .select()
        .where('t.subjectID = :s', { s: parent.id });
      if (type) {
        s = s.andWhere('t.type = :t', { t: type });
      }
      const episodes = await s.orderBy('t.sort', 'ASC').limit(limit).offset(offset).getMany();

      return episodes.map((e: entity.Episode) => {
        return {
          id: e.id,
          type: e.type,
          name: e.name,
          name_cn: e.nameCN,
          description: e.summary,
          airdate: e.airDate,
          comment: e.epComment,
          last_post: e.epLastPost,
          disc: e.epDisc,
          duration: e.duration,
          sort: e.sort,
        };
      });
    },
  },
} satisfies types.Resolvers;

export const schema = await fsp.readFile(
  path.join(projectRoot, 'lib', 'graphql', 'schema.graphql'),
  'utf8',
);
