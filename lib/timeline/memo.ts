import * as php from '@trim21/php-serialize';

import { TimelineCat } from './type';

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
      return {};
    }
    case TimelineCat.Wiki: {
      return {};
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
          subjectID: Number(s.subject_id),
          subjectTypeID: Number(s.subject_type_id),
          subjectName: s.subject_name,
          subjectNameCN: s.subject_name_cn,
          subjectSeries: s.subject_series === '1',
          collectComment: s.collect_comment,
          collectRate: Number(s.collect_rate),
        })),
      };
    }
    case TimelineCat.Progress: {
      // type:
      // 0 = batch(完成)
      // 1 = 想看
      // 2 = 看过
      // 3 = 抛弃
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
      return {};
    }
    case TimelineCat.Blog: {
      return {};
    }
    case TimelineCat.Index: {
      return {};
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
