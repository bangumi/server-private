import type { Static } from 'typebox';
import t from 'typebox';

import * as platformConfig from './common/subject_platforms.json';
import { assertValue } from './validate';

const SubjectPlatformSchema = t.Object(
  {
    id: t.Integer(),
    type: t.String(),
    type_cn: t.String(),
    alias: t.Optional(t.String()),
    order: t.Optional(t.Integer()),
    wiki_tpl: t.Optional(t.String()),
    search_string: t.Optional(t.String()),
    enable_header: t.Optional(t.Boolean()),
    sort_keys: t.Optional(t.Array(t.String())),
  },
  { additionalProperties: false },
);

const SubjectPlatformDefaultSchema = t.Object(
  {
    sort_keys: t.Array(t.String()),
    wiki_tpl: t.String(),
  },
  { additionalProperties: false },
);

const SubjectPlatformsConfigSchema = t.Object(
  {
    platforms: t.Record(t.String(), t.Record(t.String(), SubjectPlatformSchema)),
    defaults: t.Record(t.String(), SubjectPlatformDefaultSchema),
  },
  { additionalProperties: false },
);

const checkedSubjectPlatformsRaw: unknown = {
  platforms: platformConfig.platforms,
  defaults: platformConfig.defaults,
};
assertValue(SubjectPlatformsConfigSchema, checkedSubjectPlatformsRaw, 'subject_platforms.json');
const checkedSubjectPlatforms = checkedSubjectPlatformsRaw;

export type SubjectPlatform = Static<typeof SubjectPlatformSchema>;
export type SubjectPlatformDefault = Static<typeof SubjectPlatformDefaultSchema>;

export function findSubjectPlatform(
  subjectType: number,
  plat: number,
): SubjectPlatform | undefined {
  return checkedSubjectPlatforms.platforms[subjectType]?.[plat];
}

export function getSubjectPlatforms(subjectType: number): SubjectPlatform[] {
  return Object.values(checkedSubjectPlatforms.platforms[subjectType] ?? {}).toSorted(
    (a, b) => a.id - b.id,
  );
}

export function getSubjectPlatformSortKeys(subjectType: number, plat: number): readonly string[] {
  const platform = findSubjectPlatform(subjectType, plat);
  const keys = platform?.sort_keys ?? checkedSubjectPlatforms.defaults[subjectType]?.sort_keys;
  return keys ?? Object.freeze(['放送开始', '发行日期', '开始']);
}
