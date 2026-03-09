import { createError } from '@fastify/error';
import * as diff from 'diff';
import { StatusCodes } from 'http-status-codes';
import * as lo from 'lodash-es';

import { SubjectType } from '@app/lib/subject/type.ts';
import { findSubjectRelationType } from '@app/vendor';

export const WikiChangedError = createError<[string]>(
  'WIKI_CHANGED',
  "expected data doesn't match\n%s",
  StatusCodes.BAD_REQUEST,
);

export function matchExpected<
  E extends Record<string, string | string[] | null>,
  C extends Record<keyof E, string | string[]>,
>(expectedObject: E, currentObject: C) {
  for (const [key, expected] of Object.entries(expectedObject)) {
    if (expected === undefined || expected === null) {
      continue;
    }

    const current = currentObject[key as keyof E];

    if (!lo.isEqual(expected, current)) {
      throw new WikiChangedError(readableDiff(key, expected, current));
    }
  }
}

function readableDiff<T extends string | string[]>(name: string, expected: T, current: T): string {
  if (Array.isArray(expected)) {
    return diff.createPatch(
      name,
      expected.join('\n') + '\n',
      (current as string[]).join('\n') + '\n',
      'expected',
      'current',
    );
  }

  return diff.createPatch(name, `${expected}\n`, `${current}\n`, 'expected', 'current');
}

export const RelationTypes = {
  // 通用关系
  ADAPTATION: 1,

  // 动画关系
  ANIME_PREQUEL: 2,
  ANIME_SEQUEL: 3,
  ANIME_SUMMARY: 4,
  ANIME_FULL_STORY: 5,
  ANIME_SIDE_STORY: 6,
  ANIME_CHARACTER: 7,
  ANIME_SAME_SETTING: 8,
  ANIME_ALTERNATIVE_SETTING: 9,
  ANIME_ALTERNATIVE_VERSION: 10,
  ANIME_SPIN_OFF: 11,
  ANIME_PARENT_STORY: 12,
  ANIME_COLLABORATION: 14,
  ANIME_OTHER: 99,

  // 书籍关系
  BOOK_SERIES: 1002,
  BOOK_OFFPRINT: 1003,
  BOOK_ALBUM: 1004,
  BOOK_PREQUEL: 1005,
  BOOK_SEQUEL: 1006,
  BOOK_SIDE_STORY: 1007,
  BOOK_PARENT_STORY: 1008,
  BOOK_VERSION: 1010,
  BOOK_CHARACTER: 1011,
  BOOK_SAME_SETTING: 1012,
  BOOK_ALTERNATIVE_SETTING: 1013,
  BOOK_COLLABORATION: 1014,
  BOOK_ALTERNATIVE_VERSION: 1015,
  BOOK_OTHER: 1099,

  // 音乐关系
  MUSIC_OST: 3001,
  MUSIC_CHARACTER_SONG: 3002,
  MUSIC_OPENING_SONG: 3003,
  MUSIC_ENDING_SONG: 3004,
  MUSIC_INSERT_SONG: 3005,
  MUSIC_IMAGE_SONG: 3006,
  MUSIC_DRAMA: 3007,
  MUSIC_OTHER: 3099,

  // 游戏关系
  GAME_PREQUEL: 4002,
  GAME_SEQUEL: 4003,
  GAME_SIDE_STORY: 4006,
  GAME_CHARACTER: 4007,
  GAME_SAME_SETTING: 4008,
  GAME_ALTERNATIVE_SETTING: 4009,
  GAME_ALTERNATIVE_VERSION: 4010,
  GAME_PARENT_STORY: 4012,
  GAME_COLLABORATION: 4014,
  GAME_DLC: 4015,
  GAME_VERSION: 4016,
  GAME_MAIN_VERSION: 4017,
  GAME_COLLECTION: 4018,
  GAME_IN_COLLECTION: 4019,
  GAME_OTHER: 4099,
} as const;

export const relationMappings = {
  [`${SubjectType.Anime}-${SubjectType.Anime}`]: {
    [RelationTypes.ANIME_PREQUEL]: RelationTypes.ANIME_SEQUEL, // 前传 -> 续集
    [RelationTypes.ANIME_SEQUEL]: RelationTypes.ANIME_PREQUEL, // 续集 -> 前传
    [RelationTypes.ANIME_SUMMARY]: RelationTypes.ANIME_FULL_STORY, // 总集篇 -> 全集
    [RelationTypes.ANIME_FULL_STORY]: RelationTypes.ANIME_SUMMARY, // 全集 -> 总集篇
    [RelationTypes.ANIME_SIDE_STORY]: RelationTypes.ANIME_PARENT_STORY, // 番外篇 -> 主线故事
    [RelationTypes.ANIME_SPIN_OFF]: RelationTypes.ANIME_PARENT_STORY, // 衍生 -> 主线故事
    [RelationTypes.ANIME_PARENT_STORY]: RelationTypes.ANIME_SIDE_STORY, // 主线故事 -> 番外篇
    [RelationTypes.ANIME_CHARACTER]: RelationTypes.ANIME_CHARACTER, // 角色出演 -> 角色出演
    [RelationTypes.ANIME_SAME_SETTING]: RelationTypes.ANIME_SAME_SETTING, // 相同世界观 -> 相同世界观
    [RelationTypes.ANIME_ALTERNATIVE_SETTING]: RelationTypes.ANIME_ALTERNATIVE_SETTING, // 不同世界观 -> 不同世界观
  },
  [`${SubjectType.Anime}-${SubjectType.Book}`]: {
    [RelationTypes.ANIME_PREQUEL]: RelationTypes.BOOK_SEQUEL, // 前传 -> 续集
    [RelationTypes.ANIME_SEQUEL]: RelationTypes.BOOK_PREQUEL, // 续集 -> 前传
    [RelationTypes.ANIME_SIDE_STORY]: RelationTypes.BOOK_PARENT_STORY, // 番外篇 -> 主线故事
    [RelationTypes.ANIME_SPIN_OFF]: RelationTypes.BOOK_PARENT_STORY, // 衍生 -> 主线故事
    [RelationTypes.ANIME_PARENT_STORY]: RelationTypes.BOOK_SIDE_STORY, // 主线故事 -> 番外篇
    [RelationTypes.ANIME_CHARACTER]: RelationTypes.BOOK_CHARACTER, // 角色出演 -> 角色出演
    [RelationTypes.ANIME_SAME_SETTING]: RelationTypes.BOOK_SAME_SETTING, // 相同世界观 -> 相同世界观
    [RelationTypes.ANIME_ALTERNATIVE_SETTING]: RelationTypes.BOOK_ALTERNATIVE_SETTING, // 不同世界观 -> 不同世界观
  },
  [`${SubjectType.Anime}-${SubjectType.Game}`]: {
    [RelationTypes.ANIME_PREQUEL]: RelationTypes.GAME_SEQUEL, // 前传 -> 续集
    [RelationTypes.ANIME_SEQUEL]: RelationTypes.GAME_PREQUEL, // 续集 -> 前传
    [RelationTypes.ANIME_SIDE_STORY]: RelationTypes.GAME_PARENT_STORY, // 番外篇 -> 主线故事
    [RelationTypes.ANIME_SPIN_OFF]: RelationTypes.GAME_PARENT_STORY, // 衍生 -> 主线故事
    [RelationTypes.ANIME_PARENT_STORY]: RelationTypes.GAME_SIDE_STORY, // 主线故事 -> 外传
    [RelationTypes.ANIME_CHARACTER]: RelationTypes.GAME_CHARACTER, // 角色出演 -> 角色出演
    [RelationTypes.ANIME_SAME_SETTING]: RelationTypes.GAME_SAME_SETTING, // 相同世界观 -> 相同世界观
    [RelationTypes.ANIME_ALTERNATIVE_SETTING]: RelationTypes.GAME_ALTERNATIVE_SETTING, // 不同世界观 -> 不同世界观
  },

  [`${SubjectType.Book}-${SubjectType.Book}`]: {
    [RelationTypes.BOOK_SERIES]: RelationTypes.BOOK_OFFPRINT, // 系列 -> 单行本
    [RelationTypes.BOOK_OFFPRINT]: RelationTypes.BOOK_SERIES, // 单行本 -> 系列
    [RelationTypes.BOOK_PREQUEL]: RelationTypes.BOOK_SEQUEL, // 前传 -> 续集
    [RelationTypes.BOOK_SEQUEL]: RelationTypes.BOOK_PREQUEL, // 续集 -> 前传
    [RelationTypes.BOOK_SIDE_STORY]: RelationTypes.BOOK_PARENT_STORY, // 番外篇 -> 主线故事
    [RelationTypes.BOOK_PARENT_STORY]: RelationTypes.BOOK_SIDE_STORY, // 主线故事 -> 番外篇
    [RelationTypes.BOOK_CHARACTER]: RelationTypes.BOOK_CHARACTER, // 角色出演 -> 角色出演
    [RelationTypes.BOOK_SAME_SETTING]: RelationTypes.BOOK_SAME_SETTING, // 相同世界观 -> 相同世界观
    [RelationTypes.BOOK_ALTERNATIVE_SETTING]: RelationTypes.BOOK_ALTERNATIVE_SETTING, // 不同世界观 -> 不同世界观
    [RelationTypes.BOOK_ALTERNATIVE_VERSION]: RelationTypes.BOOK_ALTERNATIVE_VERSION, // 不同演绎 -> 不同演绎
    [RelationTypes.BOOK_VERSION]: RelationTypes.BOOK_VERSION, // 不同版本 -> 不同版本
  },
  [`${SubjectType.Book}-${SubjectType.Anime}`]: {
    [RelationTypes.BOOK_PREQUEL]: RelationTypes.ANIME_SEQUEL, // 前传 -> 续集
    [RelationTypes.BOOK_SEQUEL]: RelationTypes.ANIME_PREQUEL, // 续集 -> 前传
    [RelationTypes.BOOK_SIDE_STORY]: RelationTypes.ANIME_PARENT_STORY, // 番外篇 -> 主线故事
    [RelationTypes.BOOK_PARENT_STORY]: RelationTypes.ANIME_SIDE_STORY, // 主线故事 -> 番外篇
    [RelationTypes.BOOK_CHARACTER]: RelationTypes.ANIME_CHARACTER, // 角色出演 -> 角色出演
    [RelationTypes.BOOK_SAME_SETTING]: RelationTypes.ANIME_SAME_SETTING, // 相同世界观 -> 相同世界观
    [RelationTypes.BOOK_ALTERNATIVE_SETTING]: RelationTypes.ANIME_ALTERNATIVE_SETTING, // 不同世界观 -> 不同世界观
  },
  [`${SubjectType.Book}-${SubjectType.Game}`]: {
    [RelationTypes.BOOK_PREQUEL]: RelationTypes.GAME_SEQUEL, // 前传 -> 续集
    [RelationTypes.BOOK_SEQUEL]: RelationTypes.GAME_PREQUEL, // 续集 -> 前传
    [RelationTypes.BOOK_SIDE_STORY]: RelationTypes.GAME_PARENT_STORY, // 番外篇 -> 主线故事
    [RelationTypes.BOOK_PARENT_STORY]: RelationTypes.GAME_SIDE_STORY, // 主线故事 -> 外传
    [RelationTypes.BOOK_CHARACTER]: RelationTypes.GAME_CHARACTER, // 角色出演 -> 角色出演
    [RelationTypes.BOOK_SAME_SETTING]: RelationTypes.GAME_SAME_SETTING, // 相同世界观 -> 相同世界观
    [RelationTypes.BOOK_ALTERNATIVE_SETTING]: RelationTypes.GAME_ALTERNATIVE_SETTING, // 不同世界观 -> 不同世界观
  },

  [`${SubjectType.Game}-${SubjectType.Game}`]: {
    [RelationTypes.GAME_PREQUEL]: RelationTypes.GAME_SEQUEL, // 前传 -> 续集
    [RelationTypes.GAME_SEQUEL]: RelationTypes.GAME_PREQUEL, // 续集 -> 前传
    [RelationTypes.GAME_SIDE_STORY]: RelationTypes.GAME_PARENT_STORY, // 外传 -> 主线故事
    [RelationTypes.GAME_PARENT_STORY]: RelationTypes.GAME_SIDE_STORY, // 主线故事 -> 外传
    [RelationTypes.GAME_CHARACTER]: RelationTypes.GAME_CHARACTER, // 角色出演 -> 角色出演
    [RelationTypes.GAME_SAME_SETTING]: RelationTypes.GAME_SAME_SETTING, // 相同世界观 -> 相同世界观
    [RelationTypes.GAME_ALTERNATIVE_SETTING]: RelationTypes.GAME_ALTERNATIVE_SETTING, // 不同世界观 -> 不同世界观
    [RelationTypes.GAME_ALTERNATIVE_VERSION]: RelationTypes.GAME_ALTERNATIVE_VERSION, // 不同演绎 -> 不同演绎
    [RelationTypes.GAME_VERSION]: RelationTypes.GAME_VERSION, // 不同版本 -> 不同版本
    [RelationTypes.GAME_MAIN_VERSION]: RelationTypes.GAME_VERSION, // 主版本 -> 不同版本
    [RelationTypes.GAME_COLLECTION]: RelationTypes.GAME_IN_COLLECTION, // 合集 -> 收录作品
    [RelationTypes.GAME_IN_COLLECTION]: RelationTypes.GAME_COLLECTION, // 收录作品 -> 合集
  },
  [`${SubjectType.Game}-${SubjectType.Anime}`]: {
    [RelationTypes.GAME_PREQUEL]: RelationTypes.ANIME_SEQUEL, // 前传 -> 续集
    [RelationTypes.GAME_SEQUEL]: RelationTypes.ANIME_PREQUEL, // 续集 -> 前传
    [RelationTypes.GAME_SIDE_STORY]: RelationTypes.ANIME_PARENT_STORY, // 外传 -> 主线故事
    [RelationTypes.GAME_PARENT_STORY]: RelationTypes.ANIME_SIDE_STORY, // 主线故事 -> 番外篇
    [RelationTypes.GAME_CHARACTER]: RelationTypes.ANIME_CHARACTER, // 角色出演 -> 角色出演
    [RelationTypes.GAME_SAME_SETTING]: RelationTypes.ANIME_SAME_SETTING, // 相同世界观 -> 相同世界观
    [RelationTypes.GAME_ALTERNATIVE_SETTING]: RelationTypes.ANIME_ALTERNATIVE_SETTING, // 不同世界观 -> 不同世界观
  },
  [`${SubjectType.Game}-${SubjectType.Book}`]: {
    [RelationTypes.GAME_PREQUEL]: RelationTypes.BOOK_SEQUEL, // 前传 -> 续集
    [RelationTypes.GAME_SEQUEL]: RelationTypes.BOOK_PREQUEL, // 续集 -> 前传
    [RelationTypes.GAME_SIDE_STORY]: RelationTypes.BOOK_PARENT_STORY, // 外传 -> 主线故事
    [RelationTypes.GAME_PARENT_STORY]: RelationTypes.BOOK_SIDE_STORY, // 主线故事 -> 番外篇
    [RelationTypes.GAME_CHARACTER]: RelationTypes.BOOK_CHARACTER, // 角色出演 -> 角色出演
    [RelationTypes.GAME_SAME_SETTING]: RelationTypes.BOOK_SAME_SETTING, // 相同世界观 -> 相同世界观
    [RelationTypes.GAME_ALTERNATIVE_SETTING]: RelationTypes.BOOK_ALTERNATIVE_SETTING, // 不同世界观 -> 不同世界观
  },
};

export function isRelationViceVersa(subjectType: number, relationType: number): boolean {
  const rtype = findSubjectRelationType(subjectType, relationType);
  if (!rtype) return true;
  return !rtype.skip_vice_versa;
}

export function getReverseRelation(
  subjectType: SubjectType,
  relatedType: SubjectType,
  relationType: number,
): number {
  if ([subjectType, relatedType].includes(SubjectType.Music)) {
    return relationType;
  }
  if (subjectType === SubjectType.Real) subjectType = SubjectType.Anime;
  if (relatedType === SubjectType.Real) relatedType = SubjectType.Anime;
  const mappingKey = `${subjectType}-${relatedType}`;
  const mapping = relationMappings[mappingKey as keyof typeof relationMappings];

  const reverseRelation = mapping[relationType as keyof typeof mapping];
  if (reverseRelation) {
    return reverseRelation;
  }

  if (subjectType === relatedType) {
    return relationType;
  } else {
    return RelationTypes.ADAPTATION;
  }
}
