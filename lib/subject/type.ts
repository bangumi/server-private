export enum SubjectType {
  Book = 1, // 书籍
  Anime = 2, // 动画
  Music = 3, // 音乐
  Game = 4, // 游戏
  Real = 6, // 三次元
}

export const SubjectTypeValues = new Set([1, 2, 3, 4, 6]);

export const SubjectTypeLabels = new Map<SubjectType, string>([
  [SubjectType.Book, 'book'],
  [SubjectType.Anime, 'anime'],
  [SubjectType.Music, 'music'],
  [SubjectType.Game, 'game'],
  [SubjectType.Real, 'real'],
]);
