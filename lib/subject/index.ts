import type { Wiki } from '@bgm38/wiki';
import { parse, WikiSyntaxError } from '@bgm38/wiki';
import { createError } from '@fastify/error';
import { StatusCodes } from 'http-status-codes';
import { DateTime } from 'luxon';

import { BadRequestError } from '@app/lib/error';
import { logger } from '@app/lib/logger';
import { AppDataSource, SubjectRepo } from '@app/lib/orm';
import * as orm from '@app/lib/orm';
import * as entity from '@app/lib/orm/entity';
import { extractDate } from '@app/lib/subject/date';
import { DATE } from '@app/lib/utils/date';

import type { Platform } from './platform';
import platform from './platform';
import type { SubjectType } from './type';

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
      return;
    }

    const subject = await Subject.findOneByOrFail({ id: subjectID });

    await Image.insert({
      ban: 0,
      nsfw: 0,
      subjectID,
      createdAt: DateTime.now().toUnixInteger(),
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

export { SubjectType } from './type';
