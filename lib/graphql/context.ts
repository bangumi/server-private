import type { PrismaClient } from '../generated/client';
import type { IAuth } from '../auth';

export interface Context {
  auth: IAuth;
  prisma: PrismaClient;
}
