import { Type as t } from '@sinclair/typebox';
import type { ValidateFunction } from 'ajv';

import { TimelineCat } from '@app/lib/timeline/cat';

import { ajv } from './ajv';

const SubjectImage = t.Object(
  {
    subject_id: t.Integer(),
    images: t.String(),
  },
  { additionalProperties: false },
);

// -1 match all
export const imageValidator: Record<TimelineCat, Record<number, ValidateFunction>> = {
  [TimelineCat.Unknown]: {},
  // 1
  [TimelineCat.Relation]: {
    [-1]: ajv.compile(t.Object({}, { additionalProperties: false })),
    1: ajv.compile(
      t.Object(
        {
          uid: t.Integer(),
          images: t.String(),
        },
        { additionalProperties: false },
      ),
    ),
    2: ajv.compile(
      t.Object(
        {
          uid: t.Integer(),
          images: t.String(),
        },
        { additionalProperties: false },
      ),
    ),

    3: ajv.compile(
      t.Object(
        {
          grp_id: t.Integer(),
          grp_name: t.String(),
          images: t.String(),
        },
        { additionalProperties: false },
      ),
    ),
    4: ajv.compile(t.Union([t.Null(), t.Object({}, { additionalProperties: false })])),
    5: ajv.compile(
      t.Object(
        {
          eden_id: t.Integer(),
          eden_name: t.String(),
          images: t.String(),
        },
        { additionalProperties: false },
      ),
    ),
  },
  //   1: ajv.compile(t.String()),
  //   2: ajv.compile(Relation),
  //   3: ajv.compile(Group),
  //   4: ajv.compile(Group),
  //   5: ajv.compile(t.String()),
  // },
  // 2
  [TimelineCat.Wiki]: { [-1]: ajv.compile(t.Object({}, { additionalProperties: false })) },
  // 3
  [TimelineCat.Subject]: {
    [-1]: ajv.compile(SubjectImage),
    // 6: ajv.compile(t([t.Boolean(), SubjectImage])),
  },
  // 4
  [TimelineCat.Progress]: { [-1]: ajv.compile(t.Object({}, { additionalProperties: false })) },
  //   0: ajv.compile(Progress),
  //   1: ajv.compile(Progress2),
  //   2: ajv.compile(Progress2),
  //   3: ajv.compile(Progress2),
  // },
  // 5
  [TimelineCat.Say]: { [-1]: ajv.compile(t.Object({}, { additionalProperties: false })) },
  //   0: ajv.compile(t.String()),
  //   1: ajv.compile(t.String()),
  //   2: ajv.compile(Rename),
  // },
  // 6
  [TimelineCat.Blog]: { [-1]: ajv.compile(t.Object({}, { additionalProperties: false })) },
  //   0: ajv.compile(Blog),
  //   1: ajv.compile(Blog),
  // },
  // 7
  [TimelineCat.Index]: { [-1]: ajv.compile(t.Object({}, { additionalProperties: false })) },
  //   0: ajv.compile(Index),
  //   1: ajv.compile(Index),
  // },
  // 8
  [TimelineCat.Mono]: {
    [-1]: ajv.compile(t.Object({}, { additionalProperties: false })),
    1: ajv.compile(
      t.Object(
        {
          cat: t.Optional(t.String()),
          id: t.Integer(),
          images: t.String(),
        },
        { additionalProperties: false },
      ),
    ),
  },
  //   0: ajv.compile(Mono),
  //   1: ajv.compile(Mono),
  // },
  // 9
  [TimelineCat.Doujin]: {
    [-1]: ajv.compile(t.Object({}, { additionalProperties: false })),
    1: ajv.compile(
      t.Object(
        {
          id: t.Integer(),
          images: t.String(),
        },
        { additionalProperties: false },
      ),
    ),
    3: ajv.compile(
      t.Object(
        {
          id: t.Integer(),
          title: t.Optional(t.String()),
          name: t.Optional(t.String()),
          images: t.String(),
        },
        { additionalProperties: false },
      ),
    ),
  },
  //   [-1]: ajv.compile(Doujin),
  //   0: ajv.compile(Doujin),
  //   1: ajv.compile(Doujin),
  //   3: ajv.compile(Doujin),
  //   5: ajv.compile(DoujinType5),
  //   6: ajv.compile(Doujin),
  // },
};
