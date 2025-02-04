export enum SubjectType {
  Book = 1, // 书籍
  Anime = 2, // 动画
  Music = 3, // 音乐
  Game = 4, // 游戏
  Real = 6, // 三次元
}
export const SubjectTypeValues = new Set([1, 2, 3, 4, 6]);

export enum EpisodeType {
  /** 本篇 */
  Normal = 0,
  /** 特别篇 */
  Special = 1,
  OP = 2,
  ED = 3,
  /** 预告/宣传/广告 */
  Pre = 4,
  MAD = 5,
  Other = 6,
}

export enum CollectionType {
  Wish = 1,
  Collect = 2,
  Doing = 3,
  OnHold = 4,
  Dropped = 5,
}
export const CollectionTypeValues = new Set([1, 2, 3, 4, 5]);
export const CollectionTypeProfileValues = new Set([1, 2]);

export function getCollectionTypeField(type: CollectionType) {
  switch (type) {
    case CollectionType.Wish: {
      return 'wish';
    }
    case CollectionType.Collect: {
      return 'collect';
    }
    case CollectionType.Doing: {
      return 'doing';
    }
    case CollectionType.OnHold: {
      return 'onHold';
    }
    case CollectionType.Dropped: {
      return 'dropped';
    }
  }
}

export enum CollectionPrivacy {
  Public = 0,
  Private = 1,
  Ban = 2,
}
export const SubjectInterestPrivacyValues = new Set([0, 1, 2]);

export enum EpisodeCollectionStatus {
  None = 0, // 撤消/删除
  Wish = 1, // 想看
  Done = 2, // 看过
  Dropped = 3, // 抛弃
}

export interface UserEpisodeCollection {
  id: number;
  type: EpisodeCollectionStatus;
}

export enum PersonType {
  Character = 'crt',
  Person = 'prsn',
}

export enum TagCat {
  Subject = 0,
  Meta = 3,
}

export enum SubjectSort {
  Rank = 'rank',
  Trends = 'trends',
  Collects = 'collects',
  Date = 'date',
  Title = 'title',
}

export interface SubjectFilter {
  type: SubjectType;
  nsfw: boolean;
  cat?: number;
  series?: boolean;
  year?: number;
  month?: number;
  tags?: string[];
  ids?: number[];
}

export interface CalendarItem {
  id: number;
  weekday: number;
  watchers: number;
}
