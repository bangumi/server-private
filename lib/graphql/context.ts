import type { PrismaClient } from '../generated/client';
import type { Auth } from '../auth';

export interface Context {
  auth: Auth;
  prisma: PrismaClient;
}
