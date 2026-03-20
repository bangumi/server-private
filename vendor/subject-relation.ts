import type { Static } from 'typebox';
import t from 'typebox';

import { relations } from './common/subject_relations.json';
import { assertValue } from './validate';

const SubjectRelationTypeSchema = t.Object(
  {
    en: t.String(),
    cn: t.String(),
    jp: t.String(),
    desc: t.String(),
    skip_vice_versa: t.Optional(t.Boolean()),
  },
  { additionalProperties: false },
);

const SubjectRelationsSchema = t.Record(
  t.String(),
  t.Record(t.String(), SubjectRelationTypeSchema),
);

const checkedSubjectRelationsRaw: unknown = relations;
assertValue(SubjectRelationsSchema, checkedSubjectRelationsRaw, 'subject_relations.json');
const checkedSubjectRelations = checkedSubjectRelationsRaw;

export type SubjectRelationType = Static<typeof SubjectRelationTypeSchema>;

export function findSubjectRelationType(
  subjectType: number,
  relationType: number,
): SubjectRelationType | undefined {
  return checkedSubjectRelations[subjectType]?.[relationType];
}
