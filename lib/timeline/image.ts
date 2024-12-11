import * as php from '@trim21/php-serialize';

import { avatar, groupIcon, personImages, subjectCover } from '@app/lib/response.ts';

import { TimelineCat } from './type';

interface User {
  uid: string;
  images: string;
}

type UserBatch = Record<number, User>;

interface Group {
  grp_id: string;
  grp_name: string;
  images: string;
}

type GroupBatch = Record<number, Group>;

interface Subject {
  subject_id: string;
  images: string;
}

type SubjectBatch = Record<number, Subject>;

interface Mono {
  cat: number;
  id: number;
  images: string;
}

type MonoBatch = Record<number, Mono>;

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
            user: Object.values(users).map((u) => ({
              uid: Number(u.uid),
              images: avatar(u.images),
            })),
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
            group: Object.values(groups).map((g) => ({
              id: Number(g.grp_id),
              images: groupIcon(g.images),
            })),
          };
        }
        default: {
          return {};
        }
      }
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
          id: Number(s.subject_id),
          images: subjectCover(s.images),
        })),
      };
    }
    case TimelineCat.Progress: {
      const info = php.parse(data) as Subject;
      return {
        subject: [
          {
            id: Number(info.subject_id),
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
