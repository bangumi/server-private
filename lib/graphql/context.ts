import type { IAuth } from '../auth';
import type { repo } from '../torm';

export interface Context {
  repo: typeof repo;
  auth: IAuth;
}
