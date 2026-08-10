import { DateTime } from 'luxon';
import type { Static } from 'typebox';
import t from 'typebox';

import { db, op, type orm, schema } from '@app/drizzle';
import { decodeSubjectEpStatus } from '@app/lib/subject/ep';
import {
  CollectionType,
  EpisodeCollectionStatus,
  EpisodeType,
  SubjectType,
  type UserEpisodeStatusItem,
} from '@app/lib/subject/type';
import * as convert from '@app/lib/types/convert.ts';
import * as res from '@app/lib/types/res.ts';

const PRG_LIMIT = 100;
const MAX_EPS = 72;
/** 进度管理器支持的条目类型：动画/书籍/三次元 */
const MANAGE_TYPES = [SubjectType.Anime, SubjectType.Book, SubjectType.Real];

export type IProgressSubject = Static<typeof ProgressSubject>;
export const ProgressSubject = t.Intersect(
  [
    res.Ref(res.SlimSubject),
    t.Object({
      eps: t.Integer(),
      volumes: t.Integer(),
      series: t.Boolean(),
      doing: t.Integer(),
      airDate: t.String(),
      weekday: t.Integer(),
    }),
  ],
  { $id: 'ProgressSubject' },
);

export type IProgressItem = Static<typeof ProgressItem>;
export const ProgressItem = t.Object(
  {
    subject: res.Ref(ProgressSubject),
    interest: res.Ref(res.SubjectInterest),
    percent: t.Number(),
    todayOnAir: t.Boolean(),
    lastUnwatchedEp: t.Union([
      t.Null(),
      t.Object({
        id: t.Integer(),
        sort: t.Number(),
      }),
    ]),
    eps: t.Array(res.Ref(res.Episode)),
  },
  { $id: 'ProgressItem' },
);

/** 进度百分比，对齐 PHP SubjectCore::GetProgress */
export function getProgressPercent(total: number, recent: number): number {
  if (recent > total) {
    return 50;
  }
  const progress = total === 0 ? 0 : Math.round((recent * 100 * 100) / total) / 100;
  return progress === 0 ? 1 : progress;
}

/** 章节展示截断，对齐 PHP CacheCore::DynamicEpList */
function dynamicEpList(eps: orm.IEpisode[], epStatus: number): orm.IEpisode[] {
  if (eps.length <= MAX_EPS) {
    return eps;
  }
  const minSort = eps[0]?.sort ?? 0;
  let start = epStatus;
  if (minSort > 1) {
    // 多季条目：从当前进度所在季的起点附近开始
    start = minSort + epStatus - 1;
  }
  const end = start + MAX_EPS;
  return eps.filter((ep) => ep.sort >= start && ep.sort <= end);
}

/** 个人进度聚合，对齐 PHP fetchUserWatchingList + DynamicEpList + getBgmPrgsInfo */
export async function fetchProgress(userID: number, allowNsfw: boolean): Promise<IProgressItem[]> {
  const interests = await db
    .select()
    .from(schema.chiiSubjectInterests)
    .where(
      op.and(
        op.eq(schema.chiiSubjectInterests.uid, userID),
        op.eq(schema.chiiSubjectInterests.type, CollectionType.Doing),
        op.inArray(schema.chiiSubjectInterests.subjectType, MANAGE_TYPES),
      ),
    )
    .orderBy(op.desc(schema.chiiSubjectInterests.updatedAt))
    .limit(PRG_LIMIT);
  if (interests.length === 0) {
    return [];
  }

  const subjectIDs = interests.map((x) => x.subjectID);
  const subjectConditions = [
    op.inArray(schema.chiiSubjects.id, subjectIDs),
    op.ne(schema.chiiSubjects.ban, 1),
  ];
  if (!allowNsfw) {
    subjectConditions.push(op.eq(schema.chiiSubjects.nsfw, false));
  }
  const subjects = await db
    .select()
    .from(schema.chiiSubjects)
    .innerJoin(schema.chiiSubjectFields, op.eq(schema.chiiSubjects.id, schema.chiiSubjectFields.id))
    .where(op.and(...subjectConditions));
  const subjectMap = new Map(
    subjects.map(({ chii_subjects: s, chii_subject_fields: f }) => [
      s.id,
      { subject: s, fields: f },
    ]),
  );
  if (subjectMap.size === 0) {
    return [];
  }

  const validSubjectIDs = [...subjectMap.keys()];
  const [episodes, epStatusRows] = await Promise.all([
    db
      .select()
      .from(schema.chiiEpisodes)
      .where(
        op.and(
          op.inArray(schema.chiiEpisodes.subjectID, validSubjectIDs),
          op.ne(schema.chiiEpisodes.ban, 1),
          op.inArray(schema.chiiEpisodes.type, [EpisodeType.Normal, EpisodeType.Special]),
        ),
      )
      .orderBy(op.asc(schema.chiiEpisodes.sort), op.asc(schema.chiiEpisodes.id)),
    db
      .select()
      .from(schema.chiiEpStatus)
      .where(
        op.and(
          op.eq(schema.chiiEpStatus.uid, userID),
          op.inArray(schema.chiiEpStatus.sid, validSubjectIDs),
        ),
      ),
  ]);

  const epGroup = new Map<number, orm.IEpisode[]>();
  for (const ep of episodes) {
    const list = epGroup.get(ep.subjectID);
    if (list) {
      list.push(ep);
    } else {
      epGroup.set(ep.subjectID, [ep]);
    }
  }
  const statusMap = new Map<number, Map<number, UserEpisodeStatusItem>>();
  for (const row of epStatusRows) {
    statusMap.set(row.sid, decodeSubjectEpStatus(row.status));
  }

  const today = DateTime.now().toFormat('yyyy-MM-dd');
  const result: IProgressItem[] = [];
  for (const interest of interests) {
    const entry = subjectMap.get(interest.subjectID);
    if (!entry) {
      continue;
    }
    const { subject, fields } = entry;
    const eps = epGroup.get(interest.subjectID) ?? [];
    const epStatus = statusMap.get(interest.subjectID) ?? new Map<number, UserEpisodeStatusItem>();

    const percent = getProgressPercent(subject.eps, interest.epStatus);

    // 首个 type=EP 且未看过的集
    let lastUnwatchedEp: { id: number; sort: number } | null = null;
    for (const ep of eps) {
      if (ep.type !== EpisodeType.Normal) {
        continue;
      }
      const status = epStatus.get(ep.id)?.type ?? EpisodeCollectionStatus.None;
      if (status !== EpisodeCollectionStatus.Done) {
        lastUnwatchedEp = { id: ep.id, sort: ep.sort };
        break;
      }
    }

    const todayOnAir = eps.some((ep) => ep.airdate === today);

    const visibleEps = dynamicEpList(eps, interest.epStatus);
    const epsWithStatus = visibleEps.map((ep) => {
      const item = convert.toEpisode(ep);
      const status = epStatus.get(ep.id);
      if (status?.type) {
        item.collection = {
          status: status.type,
          updatedAt: status.updated_at?.[status.type],
        };
      }
      return item;
    });

    result.push({
      subject: {
        ...convert.toSlimSubject(subject, fields),
        eps: subject.eps,
        volumes: subject.volumes,
        series: subject.series,
        doing: subject.doing,
        airDate: fields.date,
        weekday: fields.weekday,
      },
      interest: convert.toSubjectInterest(interest),
      percent,
      todayOnAir,
      lastUnwatchedEp,
      eps: epsWithStatus,
    });
  }
  return result;
}
