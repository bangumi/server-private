import type { IAuth } from '../auth';
import type { PrismaClient } from '../generated/client';
import type { repo } from '../torm';

export interface Context {
  repo: typeof repo;
  auth: IAuth;
  prisma: PrismaClient;
}
