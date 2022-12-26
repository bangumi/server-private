import type { IAuth } from 'app/lib/auth';
import type { repo } from 'app/lib/orm';

export interface Context {
  repo: typeof repo;
  auth: IAuth;
}
