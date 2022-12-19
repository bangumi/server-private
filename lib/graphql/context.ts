import type { IAuth } from '../auth';
import type { repo } from '../orm';

export interface Context {
  repo: typeof repo;
  auth: IAuth;
}
