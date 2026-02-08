import type { Static } from 'typebox';
import t from 'typebox';

import { relations as personRelations } from './common/person_relations.json';
import { assertValue } from './validate';

const PersonRelationTypeSchema = t.Object(
  {
    cn: t.String(),
    desc: t.Optional(t.String()),
    vice_versa_to: t.Optional(t.Integer()),
    skip_vice_versa: t.Optional(t.Boolean()),
    primary: t.Optional(t.Boolean()),
  },
  { additionalProperties: false },
);

const PersonRelationsSchema = t.Object(
  {
    prsn: t.Record(t.String(), PersonRelationTypeSchema),
    crt: t.Record(t.String(), PersonRelationTypeSchema),
    prsn_cv: t.Record(t.String(), PersonRelationTypeSchema),
  },
  { additionalProperties: false },
);

const checkedPersonRelationsRaw: unknown = personRelations;
assertValue(PersonRelationsSchema, checkedPersonRelationsRaw, 'person_relations.json');
const checkedPersonRelations = checkedPersonRelationsRaw;

export type PersonRelationType = Static<typeof PersonRelationTypeSchema>;
export type PersonRelationEntityType = keyof Static<typeof PersonRelationsSchema>;

export function findPersonRelationType(
  personType: PersonRelationEntityType,
  relationType: number,
): PersonRelationType | undefined {
  return checkedPersonRelations[personType]?.[relationType];
}
