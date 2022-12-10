import type { IAuth } from '../auth';
import type { PrismaClient } from '../generated/client';

export interface Context {
  auth: IAuth;
  prisma: PrismaClient;
}
