import type { IAuth } from '@app/lib/auth';
import { NeedLoginError } from '@app/lib/auth';

// eslint-disable-next-line @typescript-eslint/require-await
export const requireLogin = (s: string) => async (req: { auth: IAuth }) => {
  if (!req.auth.login) {
    throw new NeedLoginError(s);
  }
};
