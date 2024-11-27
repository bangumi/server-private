import type { WikiMap } from '@bgm38/wiki';
import { parseToMap as parseWiki, WikiSyntaxError } from '@bgm38/wiki';
import * as php from '@trim21/php-serialize';

import type * as orm from '@app/drizzle/orm.ts';
import type * as ormold from '@app/lib/orm/index.ts';
import { avatar, personImages, subjectCover } from '@app/lib/response.ts';
import { CollectionType } from '@app/lib/subject/type';
import type * as res from '@app/lib/types/res.ts';
import {
  findSubjectPlatform,
  findSubjectRelationType,
  findSubjectStaffPosition,
} from '@app/vendor';

export function splitTags(tags: string): string[] {
  return tags
    .split(' ')
    .map((x) => x.trim())
    .filter((x) => x !== '');
}

export function toSubjectTags(tags: string): res.ISubjectTag[] {
  if (!tags) {
    return [];
  }
  const tagList = php.parse(tags) as { tag_name: string; result: string }[];
  return tagList
    .filter((x) => x.tag_name !== undefined)
    .map((x) => ({ name: x.tag_name, count: Number.parseInt(x.result) }))
    .filter((x) => !Number.isNaN(x.count));
}

// for backward compatibility
export function oldToUser(user: ormold.IUser): res.ISlimUser {
  return {
    avatar: avatar(user.img),
    username: user.username,
    nickname: user.nickname,
    id: user.id,
    sign: user.sign,
    joinedAt: 0,
  };
}

export function toUser(user: orm.IUser, fields: orm.IUserFields): res.IUser {
  return {
    id: user.id,
    username: user.username,
    nickname: user.nickname,
    avatar: avatar(user.avatar),
    group: user.groupid,
    user_group: user.groupid,
    joinedAt: user.regdate,
    sign: user.sign,
    site: fields.site,
    location: fields.location,
    bio: fields.bio,
  };
}

export function toSlimUser(user: orm.IUser): res.ISlimUser {
  return {
    id: user.id,
    username: user.username,
    nickname: user.nickname,
    avatar: avatar(user.avatar),
    sign: user.sign,
    joinedAt: user.regdate,
  };
}

export function toFriend(user: orm.IUser, friend: orm.IFriend): res.IFriend {
  return {
    user: toSlimUser(user),
    grade: friend.grade,
    createdAt: friend.createdAt,
    description: friend.description,
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
  const plat = findSubjectPlatform(subject.typeID, subject.platform);
  if (!plat) {
    return { id: subject.platform, type: '', typeCN: '', alias: '' };
  }
  return {
    id: plat.id,
    type: plat.type,
    typeCN: plat.type_cn,
    alias: plat.alias || '',
    order: plat.order,
    wikiTpl: plat.wiki_tpl,
    searchString: plat.search_string,
    enableHeader: plat.enable_header,
  };
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
      .split(' ')
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
    tags: toSubjectTags(fields.fieldTags),
  };
}

export function toSubjectRelationType(relation: orm.ISubjectRelation): res.ISubjectRelationType {
  const rtype = findSubjectRelationType(relation.relatedType, relation.relation);
  if (!rtype) {
    return { id: relation.relation, en: '', cn: '', jp: '', desc: '' };
  }
  return {
    id: relation.relation,
    en: rtype.en,
    cn: rtype.cn,
    jp: rtype.jp,
    desc: rtype.desc,
  };
}

export function toSubjectStaffPosition(relation: orm.IPersonSubject): res.ISubjectStaffPosition {
  const position = findSubjectStaffPosition(relation.subjectType, relation.position);
  if (!position) {
    return { id: relation.position, en: '', cn: '', jp: '' };
  }
  return {
    id: relation.position,
    en: position.en,
    cn: position.cn,
    jp: position.jp,
  };
}

export function toEpisode(episode: orm.IEpisode): res.IEpisode {
  return {
    id: episode.id,
    subjectID: episode.subjectID,
    sort: episode.sort,
    type: episode.type,
    disc: episode.disc,
    name: episode.name,
    nameCN: episode.nameCN,
    duration: episode.duration,
    airdate: episode.airdate,
    comment: episode.comment,
    desc: episode.desc,
    lock: Boolean(episode.lock),
  };
}

export function toSlimCharacter(character: orm.ICharacter): res.ISlimCharacter {
  return {
    id: character.id,
    name: character.name,
    role: character.role,
    images: personImages(character.img) || undefined,
    nsfw: character.nsfw,
    lock: Boolean(character.lock),
  };
}

export function toCharacter(character: orm.ICharacter): res.ICharacter {
  return {
    id: character.id,
    name: character.name,
    role: character.role,
    infobox: toInfobox(character.infobox),
    summary: character.summary,
    images: personImages(character.img) || undefined,
    comment: character.comment,
    collects: character.collects,
    lock: Boolean(character.lock),
    redirect: character.redirect,
    nsfw: character.nsfw,
  };
}

export function toSlimPerson(person: orm.IPerson): res.ISlimPerson {
  return {
    id: person.id,
    name: person.name,
    type: person.type,
    images: personImages(person.img) || undefined,
    nsfw: person.nsfw,
    lock: Boolean(person.lock),
  };
}

export function toPerson(person: orm.IPerson): res.IPerson {
  const career = [];
  if (person.producer) {
    career.push('producer');
  }
  if (person.mangaka) {
    career.push('mangaka');
  }
  if (person.mangaka) {
    career.push('mangaka');
  }
  if (person.artist) {
    career.push('artist');
  }
  if (person.seiyu) {
    career.push('seiyu');
  }
  if (person.writer) {
    career.push('writer');
  }
  if (person.illustrator) {
    career.push('illustrator');
  }
  if (person.actor) {
    career.push('actor');
  }
  return {
    id: person.id,
    name: person.name,
    type: person.type,
    infobox: toInfobox(person.infobox),
    career,
    summary: person.summary,
    images: personImages(person.img) || undefined,
    comment: person.comment,
    collects: person.collects,
    lock: Boolean(person.lock),
    redirect: person.redirect,
    nsfw: person.nsfw,
  };
}

export function toSlimIndex(index: orm.IIndex): res.ISlimIndex {
  return {
    id: index.id,
    type: index.type,
    title: index.title,
    total: index.total,
    createdAt: index.createdAt,
  };
}

export function toIndex(index: orm.IIndex, user: orm.IUser): res.IIndex {
  return {
    id: index.id,
    type: index.type,
    title: index.title,
    desc: index.desc,
    replies: index.replies,
    total: index.total,
    collects: index.collects,
    createdAt: index.createdAt,
    updatedAt: index.updatedAt,
    creator: toSlimUser(user),
  };
}

export function toCharacterSubjectRelation(
  subject: orm.ISubject,
  relation: orm.ICharacterSubject,
): res.ICharacterSubjectRelation {
  return {
    subject: toSlimSubject(subject),
    type: relation.type,
  };
}

export function toPersonCollect(user: orm.IUser, collect: orm.IPersonCollect): res.IPersonCollect {
  return {
    user: toSlimUser(user),
    createdAt: collect.createdAt,
  };
}
