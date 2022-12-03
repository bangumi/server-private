import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";

import { schema } from "./graphql/schema";
import type { Context } from "./graphql/context";
import { createContext } from "./graphql/context";
import { logger } from "./logger";

const server = new ApolloServer<Context>({
  schema,
});

await startStandaloneServer<Context>(server, { listen: { port: 4000 }, context: createContext });

logger.info("apollo server listen at http://127.0.0.1:4000");
