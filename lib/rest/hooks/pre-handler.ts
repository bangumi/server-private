/* eslint-disable @typescript-eslint/require-await */
import type { IAuth } from '@app/lib/auth';
import { NeedLoginError, NotAllowedError } from '@app/lib/auth';

export const requireLogin = (s: string) => async (req: { auth: IAuth }) => {
  if (!req.auth.login) {
    throw new NeedLoginError(s);
  }
};

export function requirePermission(s: string, checker: (auth: IAuth) => boolean) {
  return async ({ auth }: { auth: IAuth }) => {
    if (!checker(auth)) {
      throw new NotAllowedError(s);
    }
  };
}
