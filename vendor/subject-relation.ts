import type { Static } from 'typebox';
import t from 'typebox';

import type { SubjectType as SubjectTypeEnum } from '@app/lib/subject';
import { type SubjectRelationId, SubjectType } from '@app/lib/subject/type.ts';

import { relation_mappings, relations } from './common/subject_relations.json';
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
  subjectType: SubjectTypeEnum,
  relationType: SubjectRelationId,
): SubjectRelationType | undefined {
  return checkedSubjectRelations[subjectType]?.[relationType];
}

export function isRelationViceVersa(
  subjectType: SubjectTypeEnum,
  relationType: SubjectRelationId,
): boolean {
  const rtype = findSubjectRelationType(subjectType, relationType);
  if (!rtype) return true;
  return !rtype.skip_vice_versa;
}

const SubjectRelationMappingsSchema = t.Record(
  t.Integer(),
  t.Record(t.Integer(), t.Record(t.Integer(), t.Integer())),
);

const relationMappingsRaw: unknown = relation_mappings;
assertValue(SubjectRelationMappingsSchema, relationMappingsRaw, 'subject_relations.json');
const relationMappings = relationMappingsRaw;

export function getReverseRelation(
  subjectType: SubjectTypeEnum,
  relatedType: SubjectTypeEnum,
  relationType: SubjectRelationId,
): SubjectRelationId {
  if ([subjectType, relatedType].includes(SubjectType.Music)) {
    return relationType;
  }

  if (subjectType === relatedType) {
    if (subjectType === SubjectType.Real) subjectType = SubjectType.Anime;
    if (relatedType === SubjectType.Real) relatedType = SubjectType.Anime;

    const reverseRelation = relationMappings[subjectType]?.[relatedType]?.[relationType];
    if (reverseRelation) {
      return reverseRelation;
    }
    return relationType;
  } else {
    return 1; // adaptation
  }
}
