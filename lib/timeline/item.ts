import * as php from '@trim21/php-serialize';

import { db, op } from '@app/drizzle/db.ts';
import type * as orm from '@app/drizzle/orm.ts';
import * as schema from '@app/drizzle/schema';
import redis from '@app/lib/redis.ts';
import * as fetcher from '@app/lib/types/fetcher.ts';
import type * as res from '@app/lib/types/res.ts';

import { getItemCacheKey } from './cache.ts';
import type * as memo from './memo';
import { TimelineCat } from './type';

export async function parseTimelineMemo(
  cat: TimelineCat,
  type: number,
  related: string,
  batch: boolean,
  data: string,
  allowNsfw = false,
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
            const us = await fetcher.fetchSlimUsersByIDs(info.map(([id, _]) => id));
            for (const [id, _] of info) {
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
              info.map(([id, _]) => id),
              allowNsfw,
            );
            for (const [id, _] of info) {
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
      const subject = await fetcher.fetchSlimSubjectByID(Number(info.subject_id), allowNsfw);
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
          info.map(([id, _]) => id),
          allowNsfw,
        );
        for (const [id, v] of info) {
          const subject = ss[id];
          if (subject) {
            subjects.push({
              subject,
              comment: v.collect_comment,
              rate: v.collect_rate,
            });
          }
        }
      } else {
        const info = php.parse(data) as memo.Subject;
        const subject = await fetcher.fetchSlimSubjectByID(Number(info.subject_id), allowNsfw);
        if (subject) {
          subjects.push({
            subject,
            comment: info.collect_comment,
            rate: info.collect_rate,
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
        const subject = await fetcher.fetchSlimSubjectByID(subjectID, allowNsfw);
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
        const subject = await fetcher.fetchSlimSubjectByID(Number(info.subject_id), allowNsfw);
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
        case 0: {
          return {
            status: {
              sign: data,
            },
          };
        }
        case 1: {
          return {
            status: {
              tsukkomi: data,
            },
          };
        }
        case 2: {
          const info = php.parse(data) as memo.Nickname;
          return {
            status: {
              nickname: {
                before: info.before,
                after: info.after,
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
      const blog = await fetcher.fetchSlimBlogEntryByID(Number(info.entry_id));
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
        for (const [_, value] of info) {
          if (value.cat === 1) {
            characterIDs.push(value.id);
          } else if (value.cat === 2) {
            personIDs.push(value.id);
          }
        }
        const cs = await fetcher.fetchSlimCharactersByIDs(characterIDs, allowNsfw);
        const ps = await fetcher.fetchSlimPersonsByIDs(personIDs);
        return {
          mono: {
            characters: Object.entries(cs).map(([_, v]) => v),
            persons: Object.entries(ps).map(([_, v]) => v),
          },
        };
      } else {
        const info = php.parse(data) as memo.MonoSingle;
        const characters = [];
        const persons = [];
        if (info.cat === 1) {
          const character = await fetcher.fetchSlimCharacterByID(Number(info.id), allowNsfw);
          if (character) {
            characters.push(character);
          }
        } else if (info.cat === 2) {
          const person = await fetcher.fetchSlimPersonByID(Number(info.id));
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
      }
    }
    case TimelineCat.Doujin: {
      return {};
    }
  }
}

export async function toTimeline(tml: orm.ITimeline, allowNsfw = false): Promise<res.ITimeline> {
  return {
    id: tml.id,
    uid: tml.uid,
    cat: tml.cat,
    type: tml.type,
    memo: await parseTimelineMemo(tml.cat, tml.type, tml.related, tml.batch, tml.memo, allowNsfw),
    batch: tml.batch,
    replies: tml.replies,
    source: tml.source,
    createdAt: tml.createdAt,
  };
}

/** Cached */
export async function fetchTimelineByIDs(
  ids: number[],
  allowNsfw = false,
): Promise<Record<number, res.ITimeline>> {
  const cached = await redis.mget(ids.map((id) => getItemCacheKey(id)));
  const result: Record<number, res.ITimeline> = {};
  const missing = [];
  for (const tid of ids) {
    if (cached[tid]) {
      const item = JSON.parse(cached[tid]) as res.ITimeline;
      result[tid] = item;
    } else {
      missing.push(tid);
    }
  }
  if (missing.length > 0) {
    const data = await db
      .select()
      .from(schema.chiiTimeline)
      .where(op.inArray(schema.chiiTimeline.id, missing))
      .execute();
    for (const d of data) {
      const item = await toTimeline(d, allowNsfw);
      result[d.id] = item;
      await redis.setex(getItemCacheKey(d.id), 604800, JSON.stringify(item));
    }
  }
  return result;
}
