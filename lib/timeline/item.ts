import * as php from '@trim21/php-serialize';
import * as lo from 'lodash-es';

import { db, op, type orm, schema } from '@app/drizzle';
import type { IAuth } from '@app/lib/auth/index.ts';
import { fetchSubjectCollectReactions } from '@app/lib/like.ts';
import redis from '@app/lib/redis.ts';
import * as fetcher from '@app/lib/types/fetcher.ts';
import type * as res from '@app/lib/types/res.ts';

import { getItemCacheKey } from './cache.ts';
import type * as memo from './memo';
import { TimelineCat, TimelineMonoCat, TimelineStatusType } from './type';

export async function parseTimelineMemo(
  auth: Readonly<IAuth>,
  cat: TimelineCat,
  type: number,
  related: string,
  batch: boolean,
  data: string,
): Promise<res.ITimelineMemo> {
  if (data === '') {
    return {};
  }
  switch (cat) {
    case TimelineCat.Daily: {
      switch (type) {
        case 2: {
          const users = [];
          if (batch) {
            const info = php.parse(data) as memo.UserBatch;
            const us = await fetcher.fetchSlimUsersByIDs(Object.keys(info).map(Number));
            for (const id of Object.keys(info).map(Number).sort()) {
              const user = us[id];
              if (user) {
                users.push(user);
              }
            }
          } else {
            const info = php.parse(data) as memo.User;
            const user = await fetcher.fetchSlimUserByID(Number(info.uid));
            if (user) {
              users.push(user);
            }
          }
          return {
            daily: {
              users,
            },
          };
        }
        case 3:
        case 4: {
          const groups = [];
          if (batch) {
            const info = php.parse(data) as memo.GroupBatch;
            const gs = await fetcher.fetchSlimGroupsByIDs(
              Object.keys(info).map(Number),
              auth.allowNsfw,
            );
            for (const id of Object.keys(info).map(Number).sort()) {
              const group = gs[id];
              if (group) {
                groups.push(group);
              }
            }
          } else {
            const info = php.parse(data) as memo.Group;
            const group = await fetcher.fetchSlimGroupByID(Number(info.grp_id));
            if (group) {
              groups.push(group);
            }
          }
          return {
            daily: {
              groups,
            },
          };
        }
        default: {
          return {};
        }
      }
    }
    case TimelineCat.Wiki: {
      const info = php.parse(data) as memo.NewSubject;
      const subject = await fetcher.fetchSlimSubjectByID(Number(info.subject_id), auth.allowNsfw);
      return {
        wiki: {
          subject,
        },
      };
    }
    case TimelineCat.Subject: {
      const subjects = [];
      if (batch) {
        const info = php.parse(data) as memo.SubjectBatch;
        const ss = await fetcher.fetchSlimSubjectsByIDs(
          Object.keys(info).map(Number),
          auth.allowNsfw,
        );
        for (const id of Object.keys(info).map(Number).sort()) {
          const subject = ss[id];
          const v = info[id];
          if (!subject) {
            continue;
          }
          if (!v) {
            continue;
          }
          subjects.push({
            subject,
            comment: lo.unescape(v.collect_comment),
            rate: v.collect_rate,
            collectID: v.collect_id,
          });
        }
      } else {
        const info = php.parse(data) as memo.Subject;
        const subject = await fetcher.fetchSlimSubjectByID(Number(info.subject_id), auth.allowNsfw);
        if (subject) {
          subjects.push({
            subject,
            comment: lo.unescape(info.collect_comment),
            rate: info.collect_rate,
            collectID: info.collect_id,
          });
        }
      }
      return {
        subject: subjects,
      };
    }
    case TimelineCat.Progress: {
      if (type === 0) {
        const info = php.parse(data) as memo.ProgressBatch;
        let subjectID = Number(info.subject_id);
        // memo 里面的 subject_id 有时候为空，这时候 fallback 到 related
        if (!subjectID) {
          subjectID = Number(related);
        }
        if (!subjectID) {
          return {
            progress: {},
          };
        }
        const subject = await fetcher.fetchSlimSubjectByID(subjectID, auth.allowNsfw);
        if (!subject) {
          return {
            progress: {},
          };
        }
        return {
          progress: {
            batch: {
              epsTotal: info.eps_total,
              epsUpdate: info.eps_update,
              volsTotal: info.vols_total,
              volsUpdate: info.vols_update,
              subject,
            },
          },
        };
      } else {
        const info = php.parse(data) as memo.ProgressSingle;
        const subject = await fetcher.fetchSlimSubjectByID(Number(info.subject_id), auth.allowNsfw);
        const episode = await fetcher.fetchSlimEpisodeByID(Number(info.ep_id));
        if (!subject || !episode) {
          return {
            progress: {},
          };
        }
        return {
          progress: {
            single: {
              episode,
              subject,
            },
          },
        };
      }
    }
    case TimelineCat.Status: {
      switch (type) {
        case TimelineStatusType.Sign: {
          return {
            status: {
              sign: lo.unescape(data),
            },
          };
        }
        case TimelineStatusType.Tsukkomi: {
          return {
            status: {
              tsukkomi: lo.unescape(data),
            },
          };
        }
        case TimelineStatusType.Nickname: {
          const info = php.parse(data) as memo.Nickname;
          return {
            status: {
              nickname: {
                before: lo.unescape(info.before),
                after: lo.unescape(info.after),
              },
            },
          };
        }
        default: {
          return {};
        }
      }
    }
    case TimelineCat.Blog: {
      const info = php.parse(data) as memo.Blog;
      const blog = await fetcher.fetchSlimBlogEntryByID(Number(info.entry_id), auth.userID);
      return {
        blog,
      };
    }
    case TimelineCat.Index: {
      const info = php.parse(data) as memo.Index;
      const index = await fetcher.fetchSlimIndexByID(Number(info.idx_id));
      return {
        index,
      };
    }
    case TimelineCat.Mono: {
      if (batch) {
        const info = php.parse(data) as memo.MonoBatch;
        const characterIDs = [];
        const personIDs = [];
        for (const value of Object.values(info)) {
          switch (value.cat) {
            case TimelineMonoCat.Character: {
              characterIDs.push(value.id);
              break;
            }
            case TimelineMonoCat.Person: {
              personIDs.push(value.id);
              break;
            }
          }
        }
        const cs = await fetcher.fetchSlimCharactersByIDs(characterIDs, auth.allowNsfw);
        const ps = await fetcher.fetchSlimPersonsByIDs(personIDs, auth.allowNsfw);
        const characters = [];
        const persons = [];
        for (const characterID of characterIDs) {
          const character = cs[characterID];
          if (character) {
            characters.push(character);
          }
        }
        for (const personID of personIDs) {
          const person = ps[personID];
          if (person) {
            persons.push(person);
          }
        }
        return {
          mono: {
            characters,
            persons,
          },
        };
      } else {
        const info = php.parse(data) as memo.MonoSingle;
        const characters = [];
        const persons = [];
        switch (info.cat) {
          case TimelineMonoCat.Character: {
            const character = await fetcher.fetchSlimCharacterByID(Number(info.id), auth.allowNsfw);
            if (character) {
              characters.push(character);
            }
            break;
          }
          case TimelineMonoCat.Person: {
            const person = await fetcher.fetchSlimPersonByID(Number(info.id), auth.allowNsfw);
            if (person) {
              persons.push(person);
            }
            break;
          }
        }
        return {
          mono: {
            characters,
            persons,
          },
        };
      }
    }
    case TimelineCat.Doujin: {
      return {};
    }
  }
}

export async function toTimeline(
  auth: Readonly<IAuth>,
  tml: orm.ITimeline,
): Promise<res.ITimeline> {
  return {
    id: tml.id,
    uid: tml.uid,
    cat: tml.cat,
    type: tml.type,
    memo: await parseTimelineMemo(auth, tml.cat, tml.type, tml.related, tml.batch, tml.memo),
    batch: tml.batch,
    replies: tml.replies,
    source: tml.source,
    createdAt: tml.createdAt,
  };
}

/** Cached */
export async function fetchTimelineByID(
  auth: Readonly<IAuth>,
  id: number,
): Promise<res.ITimeline | undefined> {
  const cached = await redis.get(getItemCacheKey(id));
  if (cached) {
    return JSON.parse(cached) as res.ITimeline;
  }
  const [data] = await db
    .select()
    .from(schema.chiiTimeline)
    .where(op.eq(schema.chiiTimeline.id, id))
    .limit(1);
  if (!data) {
    return;
  }
  const item = await toTimeline(auth, data);
  await redis.setex(getItemCacheKey(id), 604800, JSON.stringify(item));
  return item;
}

/** Cached */
export async function fetchTimelineByIDs(
  auth: Readonly<IAuth>,
  ids: number[],
): Promise<Record<number, res.ITimeline>> {
  if (ids.length === 0) {
    return {};
  }
  const cached = await redis.mget(ids.map((id) => getItemCacheKey(id)));
  const result: Record<number, res.ITimeline> = {};
  const missing = [];
  for (const [idx, tid] of ids.entries()) {
    if (cached[idx]) {
      const item = JSON.parse(cached[idx]) as res.ITimeline;
      result[tid] = item;
    } else {
      missing.push(tid);
    }
  }
  if (missing.length > 0) {
    const data = await db
      .select()
      .from(schema.chiiTimeline)
      .where(op.inArray(schema.chiiTimeline.id, missing));
    for (const d of data) {
      const item = await toTimeline(auth, d);
      result[d.id] = item;
      await redis.setex(getItemCacheKey(d.id), 604800, JSON.stringify(item));
    }
  }

  const collectIDs: Record<number, number> = {};
  for (const [tid, item] of Object.entries(result)) {
    if (item.cat !== TimelineCat.Subject) {
      continue;
    }
    if (item.batch) {
      continue;
    }
    const subject = item.memo.subject?.[0];
    if (!subject) {
      continue;
    }
    if (subject.comment && subject.collectID) {
      collectIDs[Number(tid)] = subject.collectID;
    }
  }
  const collectReactions = await fetchSubjectCollectReactions(Object.values(collectIDs));
  for (const [tid, collectID] of Object.entries(collectIDs)) {
    const reactions = collectReactions[collectID];
    if (!reactions) {
      continue;
    }
    const item = result[Number(tid)];
    if (!item) {
      continue;
    }
    const subject = item.memo.subject?.[0];
    if (!subject) {
      continue;
    }
    subject.reactions = reactions;
  }
  return result;
}
