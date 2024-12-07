import * as php from '@trim21/php-serialize';

import { personImages, subjectCover } from '@app/lib/response.ts';

import { TimelineCat } from './type';

export interface Subject {
  subject_id: string;
  images: string;
}

export type SubjectBatch = Record<number, Subject>;

export interface Mono {
  cat: number;
  id: number;
  images: string;
}

export type MonoBatch = Record<number, Mono>;

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
      const images = [];
      if (batch) {
        const info = php.parse(data) as SubjectBatch;
        for (const [_, value] of Object.entries(info)) {
          images.push(value);
        }
      } else {
        const info = php.parse(data) as Subject;
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
      const info = php.parse(data) as Subject;
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
        const info = php.parse(data) as MonoBatch;
        for (const [_, value] of Object.entries(info)) {
          images.push(value);
        }
      } else {
        const info = php.parse(data) as Mono;
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
