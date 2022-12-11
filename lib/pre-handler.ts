import type { IAuth } from './auth';
import { NeedLoginError } from './auth';

// eslint-disable-next-line @typescript-eslint/require-await
export const requireLogin = (s: string) => async (req: { auth: IAuth }) => {
  if (!req.auth.login) {
    throw new NeedLoginError(s);
  }
};
