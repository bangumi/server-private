import type { Wiki } from '@bgm38/wiki';
import wiki, { WikiSyntaxError } from '@bgm38/wiki';
import { createError } from '@fastify/error';
import dayjs from 'dayjs';
import { StatusCodes } from 'http-status-codes';

import { BadRequestError } from '@app/lib/error';
import { logger } from '@app/lib/logger';
import { AppDataSource, SubjectRepo } from '@app/lib/orm';
import * as entity from '@app/lib/orm/entity';
import { extractDate } from '@app/lib/subject/date';
import { DATE } from '@app/lib/utils/date';

import type { Platform } from './platform';
import platform from './platform';

export const enum SubjectType {
  Unknown = 0,
  Book = 1, // 书籍
  Anime = 2, // 动画
  Music = 3, // 音乐
  Game = 4, // 游戏
  Real = 6, // 三次元
}

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
  now?: dayjs.Dayjs;
}

export async function edit({
  subjectID,
  name,
  infobox,
  platform,
  summary,
  commitMessage,
  date,
  userID,
  now = dayjs(),
}: Create): Promise<void> {
  if (!SandBox.has(subjectID)) {
    return;
  }

  let w: Wiki;
  try {
    w = wiki(infobox);
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
      createdAt: now.unix(),
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
        fieldInfobox: infobox,
        updatedAt: now.unix(),
      },
    );

    const d = DATE.parse(date ?? extractDate(w));

    await SubjectFieldRepo.update(
      {
        subject_id: subjectID,
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
  if (s) {
    return Object.values(s).sort((a, b) => a.id - b.id);
  }

  return [];
}

export function platformString(typeID: SubjectType, platformID: number): Platform | undefined {
  return platform[typeID]?.[platformID];
}
