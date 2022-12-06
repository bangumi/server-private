import type { Static } from '@sinclair/typebox';
import { Type as t } from '@sinclair/typebox';

export type IUser = Static<typeof User>;
export const User = t.Object(
  {
    ID: t.Integer(),
    username: t.String(),
    nickname: t.String(),
  },
  { $id: 'User', title: 'User' },
);

export const ErrorRes = t.Object(
  {
    code: t.String(),
    error: t.String(),
    message: t.String(),
    statusCode: t.Integer(),
  },
  { $id: 'Error' },
);
