import * as php from '@trim21/php-serialize';

import { TimelineCat } from './type';

interface User {
  uid: string;
  username: string;
  nickname: string;
}

type UserBatch = Record<number, User>;

interface Group {
  grp_id: string;
  grp_name: string;
  grp_title: string;
  grp_desc: string;
}

type GroupBatch = Record<number, Group>;

interface NewSubject {
  subject_id: number;
  subject_name: string;
  subject_name_cn: string;
}

interface Subject {
  subject_id: string;
  subject_type_id: string;
  subject_name: string;
  subject_name_cn: string;
  subject_series: string;
  collect_comment: string;
  collect_rate: number;
}

type SubjectBatch = Record<number, Subject>;

interface ProgressBatch {
  eps_total: string;
  eps_update: number;
  vols_total: string;
  vols_update: number;
  subject_id: string;
  subject_name: string;
  subject_type_id?: number;
}

interface ProgressSingle {
  ep_id: string;
  ep_name: string;
  ep_sort: string;
  subject_id: string;
  subject_name: string;
}

interface Nickname {
  before: string;
  after: string;
}

interface Blog {
  entry_id: string;
  entry_title: string;
  entry_desc: string;
}

interface Index {
  idx_id: string;
  idx_title: string;
  idx_desc: string;
}

interface MonoSingle {
  cat: number;
  id: number;
  name: string;
}

type MonoBatch = Record<number, MonoSingle>;

export function parse(cat: TimelineCat, type: number, batch: boolean, data: string) {
  if (data === '') {
    return {};
  }
  switch (cat) {
    case TimelineCat.Daily: {
      switch (type) {
        case 2: {
          const users = [];
          if (batch) {
            const info = php.parse(data) as UserBatch;
            for (const [_, value] of Object.entries(info)) {
              users.push(value);
            }
          } else {
            const info = php.parse(data) as User;
            users.push(info);
          }
          return {
            daily: {
              user: users.map((u) => ({
                uid: Number(u.uid),
                username: u.username,
                nickname: u.nickname,
              })),
            },
          };
        }
        case 3:
        case 4: {
          const groups = [];
          if (batch) {
            const info = php.parse(data) as GroupBatch;
            for (const [_, value] of Object.entries(info)) {
              groups.push(value);
            }
          } else {
            const info = php.parse(data) as Group;
            groups.push(info);
          }
          return {
            daily: {
              group: groups.map((g) => ({
                id: Number(g.grp_id),
                name: g.grp_name,
                title: g.grp_title,
                desc: g.grp_desc,
              })),
            },
          };
        }
        default: {
          return {};
        }
      }
    }
    case TimelineCat.Wiki: {
      const info = php.parse(data) as NewSubject;
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
        const info = php.parse(data) as SubjectBatch;
        for (const [_, value] of Object.entries(info)) {
          subjects.push(value);
        }
      } else {
        const info = php.parse(data) as Subject;
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
        const info = php.parse(data) as ProgressBatch;
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
        const info = php.parse(data) as ProgressSingle;
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
          const info = php.parse(data) as Nickname;
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
      const info = php.parse(data) as Blog;
      return {
        blog: {
          id: Number(info.entry_id),
          title: info.entry_title,
          desc: info.entry_desc,
        },
      };
    }
    case TimelineCat.Index: {
      const info = php.parse(data) as Index;
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
        const info = php.parse(data) as MonoBatch;
        for (const [_, value] of Object.entries(info)) {
          monos.push(value);
        }
      } else {
        const info = php.parse(data) as MonoSingle;
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
