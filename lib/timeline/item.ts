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
  batch: boolean,
  data: string,
) {
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
            const us = await fetcher.fetchSlimUsersByIDs(
              Object.entries(info).map(([_, v]) => Number(v.uid)),
            );
            for (const [_, user] of Object.entries(us)) {
              users.push(user);
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
              Object.entries(info).map(([_, v]) => Number(v.grp_id)),
            );
            for (const [_, group] of Object.entries(gs)) {
              groups.push(group);
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
      return {
        wiki: {
          subject: {
            id: info.subject_id,
            name: info.subject_name,
            nameCN: info.subject_name_cn,
          },
        },
      };
    }
    case TimelineCat.Subject: {
      const subjects = [];
      if (batch) {
        const info = php.parse(data) as memo.SubjectBatch;
        for (const [_, value] of Object.entries(info)) {
          subjects.push(value);
        }
      } else {
        const info = php.parse(data) as memo.Subject;
        subjects.push(info);
      }
      return {
        subject: subjects.map((s) => ({
          id: Number(s.subject_id),
          type: Number(s.subject_type_id),
          name: s.subject_name,
          nameCN: s.subject_name_cn,
          series: s.subject_series === '1',
          comment: s.collect_comment,
          rate: Number(s.collect_rate),
        })),
      };
    }
    case TimelineCat.Progress: {
      if (type === 0) {
        const info = php.parse(data) as memo.ProgressBatch;
        return {
          progress: {
            batch: {
              epsTotal: info.eps_total,
              epsUpdate: info.eps_update,
              volsTotal: info.vols_total,
              volsUpdate: info.vols_update,
              subjectID: Number(info.subject_id),
              subjectName: info.subject_name,
            },
          },
        };
      } else {
        const info = php.parse(data) as memo.ProgressSingle;
        return {
          progress: {
            single: {
              epID: Number(info.ep_id),
              epName: info.ep_name,
              epSort: Number(info.ep_sort),
              subjectID: Number(info.subject_id),
              subjectName: info.subject_name,
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
      return {
        blog: {
          id: Number(info.entry_id),
          title: info.entry_title,
          desc: info.entry_desc,
        },
      };
    }
    case TimelineCat.Index: {
      const info = php.parse(data) as memo.Index;
      return {
        index: {
          id: Number(info.idx_id),
          title: info.idx_title,
          desc: info.idx_desc,
        },
      };
    }
    case TimelineCat.Mono: {
      const monos = [];
      if (batch) {
        const info = php.parse(data) as memo.MonoBatch;
        for (const [_, value] of Object.entries(info)) {
          monos.push(value);
        }
      } else {
        const info = php.parse(data) as memo.MonoSingle;
        monos.push(info);
      }
      return {
        mono: monos.map((m) => ({
          cat: m.cat,
          id: m.id,
          name: m.name,
        })),
      };
    }
    case TimelineCat.Doujin: {
      return {};
    }
  }
}

export async function toTimeline(tml: orm.ITimeline): Promise<res.ITimeline> {
  return {
    id: tml.id,
    uid: tml.uid,
    cat: tml.cat,
    type: tml.type,
    memo: await parseTimelineMemo(tml.cat, tml.type, tml.batch, tml.memo),
    batch: tml.batch,
    replies: tml.replies,
    source: tml.source,
    createdAt: tml.createdAt,
  };
}
/** 优先从缓存中获取时间线数据，如果缓存中没有则从数据库中获取， 并将获取到的数据缓存到 Redis 中。 */
export async function fetchTimelineByIDs(ids: number[]): Promise<Record<number, res.ITimeline>> {
  const cached = await redis.mget(ids.map((id) => getItemCacheKey(id)));
  const result: Record<number, res.ITimeline> = {};
  const uids = new Set<number>();
  const missing = [];
  for (const tid of ids) {
    if (cached[tid]) {
      const item = JSON.parse(cached[tid]) as res.ITimeline;
      uids.add(item.uid);
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
      const item = await toTimeline(d);
      uids.add(item.uid);
      result[d.id] = item;
      await redis.setex(getItemCacheKey(d.id), 604800, JSON.stringify(item));
    }
  }
  return result;
}
