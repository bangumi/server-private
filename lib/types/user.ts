import type { Static } from '@sinclair/typebox';
import { Type as t } from '@sinclair/typebox';

export const User = t.Object({
  ID: t.Integer(),
  username: t.String(),
  nickname: t.String(),
});

export type IUser = Static<typeof User>;
