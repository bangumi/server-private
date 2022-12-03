import type { PrismaClient } from '../generated/client';
import type { Auth } from '../auth';

export interface Context {
  user: Auth;
  prisma: PrismaClient;
}
