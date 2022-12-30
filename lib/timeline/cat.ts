/** 在数据库中存为 timeline cat 根据 type 还分为不同的类型 */
export const enum TimelineCat {
  Unknown = 0,
  Relation = 1, // add friends, join group
  Wiki = 2,
  Subject = 3,
  Progress = 4,
  /** Type = 2 时为 [SayEditMemo] 其他类型则是 string */
  Say = 5,
  Blog = 6,
  Index = 7,
  Mono = 8,
  Doujin = 9,
}
