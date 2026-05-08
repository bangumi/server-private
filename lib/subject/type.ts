// eslint-disable-next-line erasable-syntax-only/enums
export enum SubjectType {
  Book = 1, // 书籍
  Anime = 2, // 动画
  Music = 3, // 音乐
  Game = 4, // 游戏
  Real = 6, // 三次元
}
export const SubjectTypeValues = new Set([1, 2, 3, 4, 6]);

export function SubjectTypeCN(typeID: SubjectType) {
  return {
    1: '书籍',
    2: '动画',
    3: '音乐',
    4: '游戏',
    6: '三次元',
  }[typeID];
}

export const EpisodeType = Object.freeze({
  /** 本篇 */
  Normal: 0,
  /** 特别篇 */
  Special: 1,
  OP: 2,
  ED: 3,
  /** 预告/宣传/广告 */
  Pre: 4,
  MAD: 5,
  Other: 6,
});
export type EpisodeType = (typeof EpisodeType)[keyof typeof EpisodeType];

// eslint-disable-next-line erasable-syntax-only/enums
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

export const CollectionPrivacy = Object.freeze({
  Public: 0, // 公共
  Private: 1, // 私密
  Ban: 2, // 禁止
});
export const SubjectInterestPrivacyValues = new Set(Object.values(CollectionPrivacy));

export const EpisodeCollectionStatus = Object.freeze({
  None: 0, // 撤消/删除
  Wish: 1, // 想看
  Done: 2, // 看过
  Dropped: 3, // 抛弃
});

export interface UserEpisodeStatusItem {
  eid: string;
  type: number;
  updated_at?: Record<number, number>;
}

export const SubjectSort = Object.freeze({
  Rank: 'rank',
  Trends: 'trends',
  Collects: 'collects',
  Date: 'date',
  Title: 'title',
});
export type SubjectSort = (typeof SubjectSort)[keyof typeof SubjectSort];

export type SubjectTagsCategory = 'meta' | 'subject';

export interface SubjectFilter {
  type: SubjectType;
  nsfw: boolean;
  cat?: number;
  series?: boolean;
  year?: number;
  month?: number;
  tags?: string[];
  tagsCat?: SubjectTagsCategory;
  ids?: number[];
}

export interface CalendarItem {
  id: number;
  weekday: number;
  watchers: number;
}

// eslint-disable-next-line erasable-syntax-only/enums
export enum SubjectRelationId {
  // 通用关系
  ADAPTATION = 1,

  // 动画关系
  ANIME_PREQUEL = 2,
  ANIME_SEQUEL = 3,
  ANIME_SUMMARY = 4,
  ANIME_FULL_STORY = 5,
  ANIME_SIDE_STORY = 6,
  ANIME_CHARACTER = 7,
  ANIME_SAME_SETTING = 8,
  ANIME_ALTERNATIVE_SETTING = 9,
  ANIME_ALTERNATIVE_VERSION = 10,
  ANIME_SPIN_OFF = 11,
  ANIME_PARENT_STORY = 12,
  ANIME_COLLABORATION = 14,
  ANIME_OTHER = 99,

  // 书籍关系
  BOOK_SERIES = 1002,
  BOOK_OFFPRINT = 1003,
  BOOK_ALBUM = 1004,
  BOOK_PREQUEL = 1005,
  BOOK_SEQUEL = 1006,
  BOOK_SIDE_STORY = 1007,
  BOOK_PARENT_STORY = 1008,
  BOOK_VERSION = 1010,
  BOOK_CHARACTER = 1011,
  BOOK_SAME_SETTING = 1012,
  BOOK_ALTERNATIVE_SETTING = 1013,
  BOOK_COLLABORATION = 1014,
  BOOK_ALTERNATIVE_VERSION = 1015,
  BOOK_OTHER = 1099,

  // 音乐关系
  MUSIC_OST = 3001,
  MUSIC_CHARACTER_SONG = 3002,
  MUSIC_OPENING_SONG = 3003,
  MUSIC_ENDING_SONG = 3004,
  MUSIC_INSERT_SONG = 3005,
  MUSIC_IMAGE_SONG = 3006,
  MUSIC_DRAMA = 3007,
  MUSIC_OTHER = 3099,

  // 游戏关系
  GAME_PREQUEL = 4002,
  GAME_SEQUEL = 4003,
  GAME_SIDE_STORY = 4006,
  GAME_CHARACTER = 4007,
  GAME_SAME_SETTING = 4008,
  GAME_ALTERNATIVE_SETTING = 4009,
  GAME_ALTERNATIVE_VERSION = 4010,
  GAME_PARENT_STORY = 4012,
  GAME_COLLABORATION = 4014,
  GAME_DLC = 4015,
  GAME_VERSION = 4016,
  GAME_MAIN_VERSION = 4017,
  GAME_COLLECTION = 4018,
  GAME_IN_COLLECTION = 4019,
  GAME_OTHER = 4099,
}
