import type { Wiki } from '@bgm38/wiki';
import { parse, WikiSyntaxError } from '@bgm38/wiki';
import { createError } from '@fastify/error';
import { StatusCodes } from 'http-status-codes';
import * as lo from 'lodash-es';
import { DateTime } from 'luxon';

import { UserGroup } from '@app/lib/auth/index.ts';
import { BadRequestError } from '@app/lib/error.ts';
import { logger } from '@app/lib/logger.ts';
import * as entity from '@app/lib/orm/entity/index.ts';
import { Like } from '@app/lib/orm/entity/index.ts';
import * as orm from '@app/lib/orm/index.ts';
import {
  AppDataSource,
  fetchUsers,
  LikeRepo,
  SubjectImageRepo,
  SubjectRepo,
} from '@app/lib/orm/index.ts';
import { extractDate } from '@app/lib/subject/date.ts';
import { DATE } from '@app/lib/utils/date.ts';

import type { Platform } from './platform.ts';
import platform from './platform.ts';
import type { SubjectType } from './type.ts';

export const InvalidWikiSyntaxError = createError(
  'INVALID_SYNTAX_ERROR',
  '%s',
  StatusCodes.BAD_REQUEST,
);

export const SandBox = new Set([184017, 354677, 354667, 309445, 363612]);

interface Create {
  subjectID: number;
  name: string;
  infobox: string;
  platform: number;
  summary: string;
  commitMessage: string;
  userID: number;
  date?: string;
  now?: DateTime;
  nsfw?: boolean;
}

export async function edit({
  subjectID,
  name,
  infobox,
  platform,
  summary,
  commitMessage,
  date,
  nsfw,
  userID,
  now = DateTime.now(),
}: Create): Promise<void> {
  if (!SandBox.has(subjectID)) {
    return;
  }

  let w: Wiki;
  try {
    w = parse(infobox);
  } catch (error) {
    if (error instanceof WikiSyntaxError) {
      let l = '';
      if (error.line) {
        l = `line: ${error.line}`;
        if (error.lino) {
          l += `:${error.lino}`;
        }
      }

      if (l) {
        l = ' (' + l + ')';
      }

      throw new InvalidWikiSyntaxError(`${error.message}${l}`);
    }

    throw error;
  }

  const s = await SubjectRepo.findOneByOrFail({ id: subjectID });

  const availablePlatforms = platforms(s.typeID);

  if (!availablePlatforms.map((x) => x.id).includes(platform)) {
    throw new BadRequestError('platform not available');
  }

  const nameCN: string = extractNameCN(w);
  const episodes: number = extractEpisode(w);

  logger.info('user %d edit subject %d', userID, subjectID);

  await AppDataSource.transaction(async (t) => {
    const SubjectRevRepo = t.getRepository(entity.SubjectRev);
    const SubjectFieldRepo = t.getRepository(entity.SubjectFields);
    const SubjectRepo = t.getRepository(entity.Subject);

    await SubjectRevRepo.insert({
      subjectID,
      summary,
      infobox,
      creatorID: userID,
      typeID: s.typeID,
      name,
      platform,
      nameCN,
      createdAt: now.toUnixInteger(),
      commitMessage,
    });

    await SubjectRepo.update(
      {
        id: subjectID,
      },
      {
        platform,
        name: name,
        fieldEps: episodes,
        nameCN: nameCN,
        fieldSummary: summary,
        subjectNsfw: nsfw,
        fieldInfobox: infobox,
        updatedAt: now.toUnixInteger(),
      },
    );

    const d = DATE.parse(date ?? extractDate(w));

    await SubjectFieldRepo.update(
      {
        subjectID: subjectID,
      },
      {
        date: d.toString(),
        year: d.year,
        month: d.month,
      },
    );
  });
}

export function extractNameCN(w: Wiki): string {
  return (
    w.data.find((v) => {
      return v.key === '中文名';
    })?.value ?? ''
  );
}

export function extractEpisode(w: Wiki): number {
  const v = w.data.find((v) => {
    return ['话数', '集数'].includes(v.key);
  })?.value;

  if (!v) {
    return 0;
  }

  return Number.parseInt(v) || 0;
}

export function platforms(typeID: SubjectType): Platform[] {
  const s = platform[typeID];
  return Object.values(s).sort((a, b) => a.id - b.id);
}

export function platformString(typeID: SubjectType, platformID: number): Platform | undefined {
  return platform[typeID][platformID];
}

export async function uploadCover({
  subjectID,
  uid,
  filename,
}: {
  subjectID: number;
  uid: number;
  filename: string;
}): Promise<void> {
  await orm.AppDataSource.transaction(async (t) => {
    const Image = t.getRepository(entity.SubjectImage);
    const Subject = t.getRepository(entity.Subject);

    const image = await Image.findOneBy({
      subjectID,
      target: filename,
    });

    if (image) {
      if (image.ban !== 0) {
        image.ban = 0;
        await Image.save(image);
      }
      return;
    }

    const subject = await Subject.findOneByOrFail({ id: subjectID });

    await Image.insert({
      ban: 0,
      nsfw: 0,
      subjectID,
      createdAt: new Date(),
      target: filename,
      uid,
      vote: 0,
    });

    if (subject.subjectImage === '') {
      subject.subjectImage = filename;
      await Subject.save(subject);
    }
  });
}

export { SubjectType } from './type.ts';

export async function onSubjectVote(subjectID: number): Promise<void> {
  const images = await SubjectImageRepo.findBy({ subjectID, ban: 0 });

  const likes = await LikeRepo.findBy({
    type: Like.TYPE_SUBJECT_COVER,
    relatedID: orm.In(images.map((x) => x.id)),
    ban: 0,
  });

  const users = await fetchUsers(likes.map((x) => x.uid));

  /*
   * 按照投票数量多少进行排序，高权限用户会覆盖低权限用户的投票。
   * 如，bangumi admin 投了 封面1，无论多少个用户投封面2都不会有效。
   *
   */

  const votes = lo.groupBy(
    likes.map((like) => {
      return {
        like,
        user: users[like.uid] ?? {
          groupID: 0,
        },
      };
    }),
    (x) => x.like.relatedID,
  );

  const rankedVotes = images
    .map((image) => {
      return {
        image,
        rank: toRank((votes[image.id] ?? []).map((x) => x.user)),
      };
    })
    .sort((a, b) => {
      for (let i = 0; i < subjectImageVoteOrder.length + 1; i++) {
        const va = a.rank[i] ?? 0;
        const vb = b.rank[i] ?? 0;

        if (va === vb) {
          continue;
        }

        return vb - va;
      }

      return 0;
    });

  const should = rankedVotes.shift();

  if (should) {
    await SubjectRepo.update({ id: subjectID }, { subjectImage: should.image.target });
  }
}

function toRank(users: { groupID: number }[]): number[] {
  return [
    ...subjectImageVoteOrder.map((x) => {
      return users.filter((u) => u.groupID === x).length;
    }),
    users.filter((x) => !subjectImageVoteOrder.includes(x.groupID)).length,
  ];
}

const subjectImageVoteOrder = [
  UserGroup.Admin,
  UserGroup.BangumiAdmin,
  UserGroup.WikiAdmin,
  UserGroup.WikiEditor,
] as const;
