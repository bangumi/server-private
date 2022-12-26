import dayjs from 'dayjs';

import { logger } from './logger';
import { AppDataSource } from './orm';

import * as entity from 'app/lib/orm/entity';
import type { Wiki } from 'app/lib/utils/wiki/types';

const enum SubjectType {
  Unknown = 0,
  Book = 1, // 书籍
  Anime = 2, // 动画
  Music = 3, // 音乐
  Game = 4, // 游戏
  Real = 6, // 三次元
}

const SandBox = new Set([354677, 354677, 309445, 363612]);

interface Create {
  subjectID: number;
  name: string;
  nameCN: string;
  infobox: string;
  platform: number;
  summary: string;
  commitMessage: string;
  userID: number;
}

// TODO: update subject
export async function edit({
  subjectID,
  name,
  nameCN,
  infobox,
  platform,
  summary,
  commitMessage,
  userID,
}: Create): Promise<void> {
  if (!SandBox.has(subjectID)) {
    return;
  }

  logger.info('user %d edit subject %d', userID, subjectID);
  const now = dayjs();

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
