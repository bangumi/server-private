import type { IncomingMessage } from "http";

import type { PrismaClient } from "../generated/client";
import prisma from "../prisma";
import type { Auth } from "../auth";
import * as auth from "../auth";

export interface Context {
  user: Auth;
  prisma: PrismaClient;
}

export async function createContext({ req }: { req: IncomingMessage }): Promise<Context> {
  const key = req.headers["API-KEY"];
  if (key === undefined) {
    return {
      user: {
        login: false,
        allowNsfw: false,
      },
      prisma,
    };
  }

  if (Array.isArray(key)) {
    throw new Error("can't providing multiple access token");
  }

  return {
    user: await auth.byToken(key),
    prisma,
  };
}
