import type { IAuth } from '@app/lib/auth/index.ts';
import type { repo } from '@app/lib/orm/index.ts';

export interface Context {
  repo: typeof repo;
  auth: IAuth;
}

declare module 'mercurius' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface MercuriusContext extends Context {}
}
