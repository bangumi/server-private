export enum SubjectType {
  Book = 1, // 书籍
  Anime = 2, // 动画
  Music = 3, // 音乐
  Game = 4, // 游戏
  Real = 6, // 三次元
}

export const SubjectTypeValues = new Set([1, 2, 3, 4, 6]);

export enum CollectionType {
  Wish = 1,
  Collect = 2,
  Doing = 3,
  OnHold = 4,
  Dropped = 5,
}

export const CollectionTypeValues = new Set([1, 2, 3, 4, 5]);
export const CollectionTypeProfileValues = new Set([1, 2]);

export enum PersonType {
  Character = 'crt',
  Person = 'prsn',
}

export enum EpisodeType {
  /** 本篇 */
  Normal = 0,
  /** 特别篇 */
  Special = 1,
  Op = 2,
  ED = 3,
  /** 预告/宣传/广告 */
  Pre = 4,
  MAD = 5,
  Other = 6,
}
