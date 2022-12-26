import { createError } from '@fastify/error';
import dayjs from 'dayjs';
import { StatusCodes } from 'http-status-codes';

import { logger } from './logger';
import { AppDataSource } from './orm';

import * as entity from 'app/lib/orm/entity';
import wiki from 'app/lib/utils/wiki';
import { WikiSyntaxError } from 'app/lib/utils/wiki/error';
import type { Wiki } from 'app/lib/utils/wiki/types';

const enum SubjectType {
  Unknown = 0,
  Book = 1, // 书籍
  Anime = 2, // 动画
  Music = 3, // 音乐
  Game = 4, // 游戏
  Real = 6, // 三次元
}

export const InvalidWikiSyntaxError = createError(
  'INVALID_ERROR_SYNTAX',
  '%s',
  StatusCodes.BAD_REQUEST,
);

export const SandBox = new Set([354677, 354667, 309445, 363612]);

interface Create {
  subjectID: number;
  name: string;
  infobox: string;
  platform: number;
  summary: string;
  commitMessage: string;
  userID: number;
  now?: dayjs.Dayjs;
}

export async function edit({
  subjectID,
  name,
  infobox,
  platform,
  summary,
  commitMessage,
  userID,
  now = dayjs(),
}: Create): Promise<void> {
  if (!SandBox.has(subjectID)) {
    return;
  }

  logger.info('user %d edit subject %d', userID, subjectID);

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

  const nameCN: string = extractNameCN(w);
  const episodes: number = extractEpisode(w);

  await AppDataSource.transaction(async (t) => {
    const SubjectRevRepo = t.getRepository(entity.SubjectRev);
    const SubjectRepo = t.getRepository(entity.Subject);

    await SubjectRevRepo.insert({
      subjectID,
      summary,
      infobox,
      creatorID: userID,
      typeID: SubjectType.Unknown,
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
