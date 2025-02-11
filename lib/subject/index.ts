import type { Wiki } from '@bgm38/wiki';
import { parse, WikiSyntaxError } from '@bgm38/wiki';
import { createError } from '@fastify/error';
import { StatusCodes } from 'http-status-codes';
import * as lo from 'lodash-es';
import { DateTime } from 'luxon';

import { db, op, type Txn } from '@app/drizzle/db.ts';
import type * as orm from '@app/drizzle/orm.ts';
import * as schema from '@app/drizzle/schema.ts';
import { chiiLikes, chiiTagIndex, chiiTagList } from '@app/drizzle/schema.ts';
import { UserGroup } from '@app/lib/auth/index.ts';
import { BadRequestError, UnexpectedNotFoundError } from '@app/lib/error.ts';
import { LikeType } from '@app/lib/like.ts';
import { logger } from '@app/lib/logger.ts';
import * as entity from '@app/lib/orm/entity/index.ts';
import { RevType } from '@app/lib/orm/entity/index.ts';
import * as ormold from '@app/lib/orm/index.ts';
import { SubjectImageRepo, SubjectRepo } from '@app/lib/orm/index.ts';
import { extractDate } from '@app/lib/subject/date.ts';
import { TagCat } from '@app/lib/tag.ts';
import * as fetcher from '@app/lib/types/fetcher.ts';
import { DATE } from '@app/lib/utils/date.ts';
import { matchExpected } from '@app/lib/wiki.ts';
import { getSubjectPlatforms } from '@app/vendor';

import { SubjectType } from './type.ts';

export const InvalidWikiSyntaxError = createError(
  'INVALID_SYNTAX_ERROR',
  '%s',
  StatusCodes.BAD_REQUEST,
);

interface Create {
  subjectID: number;
  name: string;
  infobox: string;
  platform: number;
  summary: string;
  commitMessage: string;
  userID: number;
  date?: string;
  now: DateTime;
  nsfw?: boolean;
  metaTags?: string[];
  expectedRevision?: Partial<{
    name: string;
    infobox: string;
    metaTags: string[];
    summary: string;
  }>;
}

export async function edit({
  subjectID,
  name,
  infobox,
  platform,
  summary,
  commitMessage,
  metaTags,
  date,
  nsfw,
  userID,
  now = DateTime.now(),
  expectedRevision,
}: Create): Promise<void> {
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

  metaTags?.sort();

  await db.transaction(async (t: Txn) => {
    const [s]: orm.ISubject[] = await db
      .select()
      .from(schema.chiiSubjects)
      .where(op.eq(schema.chiiSubjects.id, subjectID))
      .limit(1);

    if (!s) {
      throw UnexpectedNotFoundError(`subject ${subjectID}`);
    }

    // only validate platform when it changed.
    // sometimes main website will add new platform, and our config maybe out-dated.
    if (platform !== s.platform) {
      const availablePlatforms = getSubjectPlatforms(s.typeID);

      if (!availablePlatforms.map((x) => x.id).includes(platform)) {
        throw new BadRequestError(`platform ${platform} is not a valid platform for subject`);
      }
    }

    if (expectedRevision) {
      expectedRevision.metaTags?.sort();

      matchExpected(s, {
        ...expectedRevision,
        metaTags: expectedRevision.metaTags?.join(' '),
      });
    }

    const nameCN: string = extractNameCN(w);

    logger.info('user %d edit subject %d', userID, subjectID);

    let vol, episodes;
    if (s.typeID === SubjectType.Book) {
      [episodes, vol] = extractBookProgress(w);
    } else {
      episodes = extractEpisode(w);
    }

    if (metaTags) {
      const allowedTags = await getAllowedTagList(t, s.typeID);

      const newTags: number[] = [];
      for (const tag of metaTags) {
        const id = allowedTags.get(tag);
        if (!id) {
          throw BadRequestError(`${JSON.stringify(tag)} is not allowed meta tags`);
        }

        newTags.push(id);
      }

      await t
        .delete(schema.chiiTagList)
        .where(
          op.and(
            op.eq(schema.chiiTagList.cat, TagCat.Meta),
            op.eq(schema.chiiTagList.type, s.typeID),
            op.eq(schema.chiiTagList.mainID, subjectID),
          ),
        );

      if (newTags.length > 0) {
        await t.insert(schema.chiiTagList).values(
          newTags.map((tag) => {
            return {
              tagID: tag,
              mainID: subjectID,
              cat: TagCat.Meta,
              userID: 0,
              type: s.typeID,
              createdAt: now.toUnixInteger(),
            } satisfies typeof schema.chiiTagList.$inferInsert;
          }),
        );
      }
    }

    const newMetaTags = metaTags ? metaTags.join(' ') : s.metaTags;

    await t.insert(schema.chiiSubjectRev).values({
      subjectID,
      summary,
      infobox,
      creatorID: userID,
      type: RevType.subjectEdit,
      typeID: s.typeID,
      name,
      platform,
      nameCN,
      metaTags: newMetaTags,
      createdAt: now.toUnixInteger(),
      commitMessage,
    } satisfies typeof schema.chiiSubjectRev.$inferInsert);

    await t
      .update(schema.chiiSubjects)
      .set({
        platform,
        name: name,
        eps: episodes,
        nameCN: nameCN,
        metaTags: newMetaTags,
        volumes: vol,
        summary,
        nsfw,
        infobox,
      })
      .where(op.eq(schema.chiiSubjects.id, subjectID));

    const d: DATE = date ? DATE.parse(date) : extractDate(w, s.typeID, platform);

    await t
      .update(schema.chiiSubjectFields)
      .set({
        date: d.toString(),
        year: d.year,
        month: d.month,
      })
      .where(op.eq(schema.chiiSubjectFields.id, subjectID));
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

export function extractBookProgress(w: Wiki): [number, number] {
  const chap = w.data.find((v) => {
    return v.key === '话数';
  })?.value;

  const vol = w.data.find((v) => {
    return v.key === '册数';
  })?.value;

  return [chap ? Number.parseInt(chap) || 0 : 0, vol ? Number.parseInt(vol) || 0 : 0];
}

async function getAllowedTagList(t: Txn, typeID: number): Promise<Map<string, number>> {
  const metaRows = await t
    .select({ id: chiiTagIndex.id })
    .from(schema.chiiTagIndex)
    .innerJoin(schema.chiiTagFields, op.eq(schema.chiiTagFields.tagID, schema.chiiTagIndex.id))
    .where(
      op.and(
        op.eq(schema.chiiTagIndex.cat, TagCat.Meta),
        op.eq(schema.chiiTagIndex.type, typeID),
        // 1 for public meta tags
        op.eq(schema.chiiTagFields.lock, 1),
      ),
    );

  const rows = await db
    .select({
      name: chiiTagIndex.name,
      id: chiiTagIndex.id,
    })
    .from(chiiTagIndex)
    .innerJoin(chiiTagList, op.eq(chiiTagList.tagID, chiiTagIndex.id))
    .where(
      op.and(
        op.eq(chiiTagList.userID, 0),
        op.eq(chiiTagList.cat, TagCat.Meta),
        op.inArray(
          chiiTagList.mainID,
          metaRows.map((item) => item.id),
        ),
      ),
    );

  return new Map<string, number>(rows.map((item) => [item.name, item.id]));
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
  await ormold.AppDataSource.transaction(async (t) => {
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

  const likes = await db
    .select()
    .from(chiiLikes)
    .where(
      op.and(
        op.eq(chiiLikes.type, LikeType.SubjectCover),
        op.inArray(
          chiiLikes.relatedID,
          images.map((x) => x.id),
        ),
        op.eq(chiiLikes.deleted, 0),
      ),
    );

  const users = await fetcher.fetchSlimUsersByIDs(likes.map((x) => x.uid));

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
          group: 0,
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

function toRank(users: { group: number }[]): number[] {
  return [
    ...subjectImageVoteOrder.map((x) => {
      return users.filter((u) => u.group === x).length;
    }),
    users.filter((x) => !subjectImageVoteOrder.includes(x.group)).length,
  ];
}

const subjectImageVoteOrder = [
  UserGroup.Admin,
  UserGroup.BangumiAdmin,
  UserGroup.WikiAdmin,
  UserGroup.WikiEditor,
] as const;
