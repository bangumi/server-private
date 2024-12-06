import * as php from '@trim21/php-serialize';

import { personImages, subjectCover } from '@app/lib/response.ts';

import type * as image from './image';
import type * as memo from './memo';
import { TimelineCat } from './type';

export function parseTimelineMemo(cat: TimelineCat, type: number, batch: boolean, data: string) {
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

export function parseTimelineImage(cat: TimelineCat, type: number, batch: boolean, data: string) {
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
      const images = [];
      if (batch) {
        const info = php.parse(data) as image.SubjectBatch;
        for (const [_, value] of Object.entries(info)) {
          images.push(value);
        }
      } else {
        const info = php.parse(data) as image.Subject;
        images.push(info);
      }
      return {
        subject: images.map((s) => ({
          subjectID: Number(s.subject_id),
          images: subjectCover(s.images),
        })),
      };
    }
    case TimelineCat.Progress: {
      const info = php.parse(data) as image.Subject;
      return {
        subject: [
          {
            subjectID: Number(info.subject_id),
            images: subjectCover(info.images),
          },
        ],
      };
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
      const images = [];
      if (batch) {
        const info = php.parse(data) as image.MonoBatch;
        for (const [_, value] of Object.entries(info)) {
          images.push(value);
        }
      } else {
        const info = php.parse(data) as image.Mono;
        images.push(info);
      }
      return {
        mono: images.map((m) => ({
          cat: m.cat,
          id: m.id,
          images: personImages(m.images),
        })),
      };
    }
    case TimelineCat.Doujin: {
      return {};
    }
  }
}
