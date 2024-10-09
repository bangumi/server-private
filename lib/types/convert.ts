import type { WikiMap } from '@bgm38/wiki';
import { parseToMap as parseWiki, WikiSyntaxError } from '@bgm38/wiki';

import type * as orm from '@app/drizzle/orm.ts';
import type * as ormold from '@app/lib/orm/index.ts';
import { avatar, subjectCover } from '@app/lib/response.ts';
import { CollectionType } from '@app/lib/subject/collection';
import { type Platform } from '@app/lib/subject/platform.ts';
import type * as res from '@app/lib/types/res.ts';
import { platforms } from '@app/vendor/common-json/subject_platforms.json';

export function toUser(user: ormold.IUser): res.IUser {
  return {
    avatar: avatar(user.img),
    username: user.username,
    nickname: user.nickname,
    id: user.id,
    sign: user.sign,
    user_group: user.groupID,
  };
}

export function toInfobox(content: string): res.IInfobox {
  let wiki: WikiMap = {
    type: '',
    data: new Map(),
  };
  try {
    wiki = parseWiki(content);
  } catch (error) {
    if (!(error instanceof WikiSyntaxError)) {
      throw error;
    }
  }
  const infobox: res.IInfobox = {};
  for (const [key, item] of wiki.data) {
    switch (typeof item) {
      case 'string': {
        infobox[key] = [
          {
            v: item,
          },
        ];
        break;
      }
      case 'object': {
        infobox[key] = item.map((v) => {
          return {
            k: v.k,
            v: v.v || '',
          };
        });
        break;
      }
    }
  }
  return infobox;
}

function toSubjectAirtime(fields: orm.ISubjectFields): res.ISubjectAirtime {
  return {
    date: fields.date,
    month: fields.month,
    weekday: fields.weekDay,
    year: fields.year,
  };
}

function toSubjectCollection(subject: orm.ISubject): res.ISubjectCollection {
  return {
    [CollectionType.Wish]: subject.wish,
    [CollectionType.Collect]: subject.done,
    [CollectionType.Doing]: subject.doing,
    [CollectionType.OnHold]: subject.onHold,
    [CollectionType.Dropped]: subject.dropped,
  };
}

function toSubjectPlatform(subject: orm.ISubject): res.ISubjectPlatform {
  const plats = platforms as Record<string, Record<string, Platform>>;
  const found = plats[subject.typeID]?.[subject.platform];
  if (found) {
    return {
      id: found.id,
      type: found.type,
      typeCN: found.type_cn,
      alias: found.alias || '',
      order: found.order,
      wikiTpl: found.wiki_tpl,
      searchString: found.search_string,
      enableHeader: found.enable_header,
    };
  } else {
    return { id: 0, type: '', typeCN: '', alias: '' };
  }
}

function toSubjectRating(fields: orm.ISubjectFields): res.ISubjectRating {
  const ratingCount = [
    fields.fieldRate1,
    fields.fieldRate2,
    fields.fieldRate3,
    fields.fieldRate4,
    fields.fieldRate5,
    fields.fieldRate6,
    fields.fieldRate7,
    fields.fieldRate8,
    fields.fieldRate9,
    fields.fieldRate10,
  ];
  const total = ratingCount.reduce((a, b) => a + b, 0);
  const totalScore = ratingCount.reduce((a, b, i) => a + b * (i + 1), 0);
  const rating = {
    total: total,
    score: total === 0 ? 0 : Math.round((totalScore * 100) / total) / 100,
    count: ratingCount,
  };
  return rating;
}

export function toSlimSubject(subject: orm.ISubject): res.ISlimSubject {
  return {
    id: subject.id,
    name: subject.name,
    nameCN: subject.nameCN,
    type: subject.typeID,
    images: subjectCover(subject.image) || undefined,
    locked: subject.ban === 2,
    nsfw: subject.nsfw,
  };
}

export function toSubject(subject: orm.ISubject, fields: orm.ISubjectFields): res.ISubject {
  return {
    airtime: toSubjectAirtime(fields),
    collection: toSubjectCollection(subject),
    eps: subject.eps,
    id: subject.id,
    images: subjectCover(subject.image) || undefined,
    infobox: toInfobox(subject.infobox),
    metaTags: subject.metaTags
      .split(',')
      .map((x) => x.trim())
      .filter((x) => x !== ''),
    locked: subject.ban === 2,
    name: subject.name,
    nameCN: subject.nameCN,
    nsfw: subject.nsfw,
    platform: toSubjectPlatform(subject),
    rating: toSubjectRating(fields),
    redirect: fields.fieldRedirect,
    series: Boolean(subject.series),
    seriesEntry: subject.seriesEntry,
    summary: subject.summary,
    type: subject.typeID,
    volumes: subject.volumes,
  };
}
