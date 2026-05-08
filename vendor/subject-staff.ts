import type { Static } from 'typebox';
import t from 'typebox';

import { staffs } from './common/subject_staffs.json';
import { assertValue } from './validate';

const SubjectStaffCategorySchema = t.Object(
  {
    order: t.Integer(),
    en: t.String(),
    cn: t.String(),
  },
  { additionalProperties: false },
);

const SubjectStaffPositionSchema = t.Object(
  {
    en: t.String(),
    cn: t.String(),
    jp: t.String(),
    desc: t.Optional(t.String()),
    rdf: t.Optional(t.String()),
    categories: t.Optional(t.Array(SubjectStaffCategorySchema)),
  },
  { additionalProperties: false },
);

const SubjectStaffsSchema = t.Record(t.String(), t.Record(t.String(), SubjectStaffPositionSchema));

const checkedSubjectStaffsRaw: unknown = staffs;
assertValue(SubjectStaffsSchema, checkedSubjectStaffsRaw, 'subject_staffs.json');
const checkedSubjectStaffs = checkedSubjectStaffsRaw;

export type SubjectStaffPosition = Static<typeof SubjectStaffPositionSchema>;

export function findSubjectStaffPosition(
  subjectType: number,
  position: number,
): SubjectStaffPosition | undefined {
  return checkedSubjectStaffs[subjectType]?.[position];
}
