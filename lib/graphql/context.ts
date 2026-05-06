import type { IAuth } from '@app/lib/auth/index.ts';

export interface Context {
  auth: IAuth;
}

declare module 'mercurius' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface MercuriusContext extends Context {}
}
