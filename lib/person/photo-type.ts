export const MonoPhotoType = Object.freeze({
  Character: 1,
  Person: 2,
} as const);

export type MonoPhotoType = (typeof MonoPhotoType)[keyof typeof MonoPhotoType];
