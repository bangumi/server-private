import type { WikiMap } from '@bgm38/wiki';
import { parseToMap as parseWiki, WikiSyntaxError } from '@bgm38/wiki';

import { type orm } from '@app/drizzle';
import { avatar, blogIcon, groupIcon, personImages, subjectCover } from '@app/lib/images';
import { getInfoboxSummary as getPersonInfoboxSummary } from '@app/lib/person/infobox.ts';
import { getInfoboxSummary as getSubjectInfoboxSummary } from '@app/lib/subject/infobox.ts';
import { CollectionPrivacy, CollectionType, SubjectType } from '@app/lib/subject/type.ts';
import type * as res from '@app/lib/types/res.ts';
import { decode } from '@app/lib/utils';
import {
  findNetworkService,
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

export function extractNameCN(infobox: res.IInfobox): string {
  return infobox.find((x) => ['中文名', '简体中文名'].includes(x.key))?.values[0]?.v ?? '';
}

export function toIndexStats(stats: string): res.IIndexStats {
  const result: res.IIndexStats = {
    subject: {},
  };
  if (!stats) {
    return result;
  }
  const statList = decode(stats) as Record<string, number>;
  for (const [key, value] of Object.entries(statList)) {
    switch (key) {
      case SubjectType.Book.toString(): {
        result.subject.book = value;
        break;
      }
      case SubjectType.Anime.toString(): {
        result.subject.anime = value;
        break;
      }
      case SubjectType.Music.toString(): {
        result.subject.music = value;
        break;
      }
      case SubjectType.Game.toString(): {
        result.subject.game = value;
        break;
      }
      case SubjectType.Real.toString(): {
        result.subject.real = value;
        break;
      }
      case 'character': {
        result.character = value;
        break;
      }
      case 'person': {
        result.person = value;
        break;
      }
      case 'ep': {
        result.episode = value;
        break;
      }
      case 'blog': {
        result.blog = value;
        break;
      }
      case 'group_topic': {
        result.groupTopic = value;
        break;
      }
      case 'subject_topic': {
        result.subjectTopic = value;
        break;
      }
    }
  }
  return result;
}

export function toSubjectTags(tags: string): res.ISubjectTag[] {
  if (!tags) {
    return [];
  }
  const tagList = decode(tags) as { tag_name: string; result: string }[];
  return tagList
    .filter((x) => x.tag_name !== undefined)
    .map((x) => ({ name: x.tag_name, count: Number.parseInt(x.result) }))
    .filter((x) => !Number.isNaN(x.count));
}

export function toUserHomepage(homepage: string): res.IUserHomepage {
  if (!homepage) {
    // 默认布局
    homepage = 'l:anime,game,book,music,real,blog;r:friend,group,index';
  }
  const layout: res.IUserHomepage = {
    left: [],
    right: [],
  };
  for (const item of homepage.split(';')) {
    const [type, list] = item.split(':');
    switch (type) {
      case 'l': {
        layout.left = list?.split(',') ?? [];
        break;
      }
      case 'r': {
        layout.right = list?.split(',') ?? [];
        break;
      }
    }
  }
  return layout;
}

export function toUser(user: orm.IUser, fields: orm.IUserFields): res.IUser {
  return {
    id: user.id,
    username: user.username,
    nickname: user.nickname,
    avatar: avatar(user.avatar),
    group: user.groupid,
    joinedAt: user.regdate,
    sign: user.sign,
    site: fields.site,
    location: fields.location,
    bio: fields.bio,
    networkServices: [],
    homepage: toUserHomepage(fields.homepage),
    stats: {
      group: 0,
      subject: {},
      mono: {
        character: 0,
        person: 0,
      },
      blog: 0,
      friend: 0,
      index: {
        create: 0,
        collect: 0,
      },
    },
  };
}

export function toSlimUser(user: orm.IUser): res.ISlimUser {
  return {
    id: user.id,
    username: user.username,
    nickname: user.nickname,
    avatar: avatar(user.avatar),
    group: user.groupid,
    sign: user.sign,
    joinedAt: user.regdate,
  };
}

export function toUserNetworkService(service: orm.IUserNetworkServices): res.IUserNetworkService {
  const svc = findNetworkService(service.serviceID);
  if (!svc) {
    return {
      title: '',
      name: '',
      url: '',
      color: '',
      account: service.account,
    };
  }
  return {
    title: svc.title,
    name: svc.name,
    url: svc.url || '',
    color: svc.bg_color,
    account: service.account,
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
  const infobox: res.IInfobox = [];
  for (const [key, item] of wiki.data) {
    switch (typeof item) {
      case 'string': {
        infobox.push({
          key: key,
          values: [{ v: item }],
        });
        break;
      }
      case 'object': {
        infobox.push({
          key: key,
          values: item.map((v) => {
            return {
              k: v.k,
              v: v.v || '',
            };
          }),
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
    weekday: fields.weekday,
    year: fields.year,
  };
}

function toSubjectCollection(subject: orm.ISubject): res.ISubjectCollection {
  return {
    [CollectionType.Wish]: subject.wish,
    [CollectionType.Collect]: subject.collect,
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
    fields.rate1,
    fields.rate2,
    fields.rate3,
    fields.rate4,
    fields.rate5,
    fields.rate6,
    fields.rate7,
    fields.rate8,
    fields.rate9,
    fields.rate10,
  ];
  const total = ratingCount.reduce((a, b) => a + b, 0);
  const totalScore = ratingCount.reduce((a, b, i) => a + b * (i + 1), 0);
  const rating = {
    rank: fields.rank,
    total: total,
    score: total === 0 ? 0 : Math.round((totalScore * 100) / total) / 100,
    count: ratingCount,
  };
  return rating;
}

export function toSlimSubject(subject: orm.ISubject, fields: orm.ISubjectFields): res.ISlimSubject {
  const infobox = toInfobox(subject.infobox);
  return {
    id: subject.id,
    name: subject.name,
    nameCN: subject.nameCN,
    type: subject.typeID,
    images: subjectCover(subject.image),
    info: getSubjectInfoboxSummary(infobox, subject.typeID, subject.eps),
    rating: toSubjectRating(fields),
    locked: subject.ban === 2,
    nsfw: subject.nsfw,
  };
}

export function toSubject(subject: orm.ISubject, fields: orm.ISubjectFields): res.ISubject {
  const infobox = toInfobox(subject.infobox);
  return {
    airtime: toSubjectAirtime(fields),
    collection: toSubjectCollection(subject),
    eps: subject.eps,
    id: subject.id,
    images: subjectCover(subject.image),
    infobox: infobox,
    info: getSubjectInfoboxSummary(infobox, subject.typeID, subject.eps),
    metaTags: splitTags(subject.metaTags),
    locked: subject.ban === 2,
    name: subject.name,
    nameCN: subject.nameCN,
    nsfw: subject.nsfw,
    platform: toSubjectPlatform(subject),
    rating: toSubjectRating(fields),
    redirect: fields.redirect,
    series: subject.series,
    seriesEntry: subject.seriesEntry,
    summary: subject.summary,
    type: subject.typeID,
    volumes: subject.volumes,
    tags: toSubjectTags(fields.tags),
  };
}

export function toSubjectInterest(interest: orm.ISubjectInterest): res.ISubjectInterest {
  return {
    id: interest.id,
    rate: interest.rate,
    type: interest.type,
    comment: interest.comment,
    tags: splitTags(interest.tag),
    epStatus: interest.epStatus,
    volStatus: interest.volStatus,
    private: interest.privacy !== CollectionPrivacy.Public,
    updatedAt: interest.updatedAt,
  };
}

export function toSlimSubjectInterest(interest: orm.ISubjectInterest): res.ISlimSubjectInterest {
  return {
    id: interest.id,
    rate: interest.rate,
    type: interest.type,
    comment: interest.comment,
    tags: splitTags(interest.tag),
    updatedAt: interest.updatedAt,
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

export function toSubjectStaffPositionType(
  subjectType: number,
  position: number,
): res.ISubjectStaffPositionType {
  const positionType = findSubjectStaffPosition(subjectType, position);
  if (!positionType) {
    return { id: position, en: '', cn: '', jp: '' };
  }
  return {
    id: position,
    en: positionType.en,
    cn: positionType.cn,
    jp: positionType.jp,
  };
}

export function toBlogEntry(entry: orm.IBlogEntry, user: orm.IUser): res.IBlogEntry {
  return {
    id: entry.id,
    type: entry.type,
    user: toSlimUser(user),
    title: entry.title,
    icon: blogIcon(entry.icon),
    content: entry.content,
    tags: splitTags(entry.tags),
    views: entry.views,
    replies: entry.replies,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    noreply: entry.noreply,
    related: entry.related,
    public: entry.public,
  };
}

export function toSlimBlogEntry(entry: orm.IBlogEntry): res.ISlimBlogEntry {
  return {
    id: entry.id,
    uid: entry.uid,
    type: entry.type,
    title: entry.title,
    icon: blogIcon(entry.icon),
    summary: entry.content.replaceAll('\r\n', ' ').trim().slice(0, 120),
    replies: entry.replies,
    public: entry.public,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

export function toBlogPhoto(photo: orm.IBlogPhoto): res.IBlogPhoto {
  return {
    id: photo.id,
    target: photo.target,
    icon: blogIcon(photo.target),
    vote: photo.vote,
    createdAt: photo.createdAt,
  };
}

export function toEpisode(episode: orm.IEpisode): res.IEpisode {
  return {
    id: episode.id,
    sort: episode.sort,
    type: episode.type,
    disc: episode.disc,
    name: episode.name,
    nameCN: episode.nameCN,
    duration: episode.duration,
    airdate: episode.airdate,
    comment: episode.comment,
    desc: episode.desc,
    subjectID: episode.subjectID,
  };
}

export function toSlimCharacter(character: orm.ICharacter): res.ISlimCharacter {
  const infobox = toInfobox(character.infobox);
  return {
    id: character.id,
    name: character.name,
    nameCN: extractNameCN(infobox),
    role: character.role,
    info: getPersonInfoboxSummary(infobox),
    images: personImages(character.img),
    comment: character.comment,
    nsfw: character.nsfw,
    lock: Boolean(character.lock),
  };
}

export function toCharacter(character: orm.ICharacter): res.ICharacter {
  const infobox = toInfobox(character.infobox);
  return {
    id: character.id,
    name: character.name,
    nameCN: extractNameCN(infobox),
    role: character.role,
    infobox: infobox,
    info: getPersonInfoboxSummary(infobox),
    summary: character.summary,
    images: personImages(character.img),
    comment: character.comment,
    collects: character.collects,
    lock: Boolean(character.lock),
    redirect: character.redirect,
    nsfw: character.nsfw,
  };
}

export function toSlimPerson(person: orm.IPerson): res.ISlimPerson {
  const infobox = toInfobox(person.infobox);
  return {
    id: person.id,
    name: person.name,
    nameCN: extractNameCN(infobox),
    type: person.type,
    info: getPersonInfoboxSummary(infobox),
    images: personImages(person.img),
    comment: person.comment,
    nsfw: person.nsfw,
    lock: Boolean(person.lock),
  };
}

export function toPerson(person: orm.IPerson): res.IPerson {
  const infobox = toInfobox(person.infobox);
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
    nameCN: extractNameCN(infobox),
    type: person.type,
    infobox: infobox,
    career,
    summary: person.summary,
    info: getPersonInfoboxSummary(infobox),
    images: personImages(person.img),
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
    uid: index.uid,
    type: index.type,
    title: index.title,
    private: index.ban === 2,
    total: index.total,
    createdAt: index.createdAt,
  };
}

export function toIndex(index: orm.IIndex): res.IIndex {
  return {
    id: index.id,
    uid: index.uid,
    type: index.type,
    title: index.title,
    desc: index.desc,
    private: index.ban === 2,
    replies: index.replies,
    total: index.total,
    collects: index.collects,
    stats: toIndexStats(index.stats),
    award: index.award,
    createdAt: index.createdAt,
    updatedAt: index.updatedAt,
  };
}

export function toIndexRelated(related: orm.IIndexRelated): res.IIndexRelated {
  return {
    id: related.id,
    cat: related.cat,
    rid: related.rid,
    type: related.type,
    sid: related.sid,
    order: related.order,
    comment: related.comment,
    award: related.award,
    createdAt: related.createdAt,
  };
}

export function toCharacterSubjectRelation(
  subject: orm.ISubject,
  fields: orm.ISubjectFields,
  relation: orm.ICharacterSubject,
): res.ICharacterSubjectRelation {
  return {
    subject: toSlimSubject(subject, fields),
    type: relation.type,
  };
}

export function toSubjectTopic(topic: orm.ISubjectTopic): res.ITopic {
  return {
    id: topic.id,
    creatorID: topic.uid,
    title: topic.title,
    parentID: topic.subjectID,
    createdAt: topic.createdAt,
    updatedAt: topic.updatedAt,
    replyCount: topic.replies,
    state: topic.state,
    display: topic.display,
  };
}

export function toSubjectTopicReply(reply: orm.ISubjectPost): res.IReplyBase {
  return {
    id: reply.id,
    content: reply.content,
    state: reply.state,
    createdAt: reply.createdAt,
    creatorID: reply.uid,
  };
}

export function toPersonCollect(user: orm.IUser, collect: orm.IPersonCollect): res.IPersonCollect {
  return {
    user: toSlimUser(user),
    createdAt: collect.createdAt,
  };
}

export function toSlimGroup(group: orm.IGroup): res.ISlimGroup {
  return {
    id: group.id,
    name: group.name,
    nsfw: group.nsfw,
    title: group.title,
    icon: groupIcon(group.icon),
    creatorID: group.creator,
    members: group.members,
    accessible: group.accessible,
    createdAt: group.createdAt,
  };
}

export function toGroup(group: orm.IGroup, user: orm.IUser): res.IGroup {
  return {
    id: group.id,
    cat: group.cat,
    name: group.name,
    nsfw: group.nsfw,
    title: group.title,
    icon: groupIcon(group.icon),
    creatorID: group.creator,
    creator: toSlimUser(user),
    topics: group.topics,
    posts: group.posts,
    members: group.members,
    description: group.desc,
    accessible: group.accessible,
    createdAt: group.createdAt,
  };
}

export function toGroupMember(member: orm.IGroupMember): res.IGroupMember {
  return {
    uid: member.uid,
    role: member.role,
    joinedAt: member.createdAt,
  };
}

export function toGroupTopic(topic: orm.IGroupTopic): res.ITopic {
  return {
    id: topic.id,
    creatorID: topic.uid,
    title: topic.title,
    parentID: topic.gid,
    createdAt: topic.createdAt,
    updatedAt: topic.updatedAt,
    replyCount: topic.replies,
    state: topic.state,
    display: topic.display,
  };
}

export function toGroupTopicReply(reply: orm.IGroupPost): res.IReplyBase {
  return {
    id: reply.id,
    content: reply.content,
    state: reply.state,
    createdAt: reply.createdAt,
    creatorID: reply.uid,
  };
}
