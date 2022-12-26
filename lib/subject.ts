import dayjs from 'dayjs';

import { logger } from './logger';
import { SubjectRevRepo } from './orm';

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
  infobox: string;
  platform: number;
  summary: string;
  commitMessage: string;
  userID: number;
}

export async function edit({
  subjectID,
  name,
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

  await SubjectRevRepo.insert({
    subjectID,
    summary,
    infobox,
    creatorID: userID,
    typeID: SubjectType.Unknown,
    name,
    platform,
    nameCN: extractNameCN(infobox),
    createdAt: dayjs().unix(),
    commitMessage,
  });
}

function extractNameCN(infobox: string): string {
  return infobox;
}
