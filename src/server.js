import { pathToFileURL } from "node:url";

import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";

import { authenticate } from "./auth.js";
import { loadConfig } from "./config.js";
import { createRepository } from "./data/repository.js";
import { resolvers } from "./graphql/resolvers.js";
import { typeDefs } from "./graphql/typeDefs.js";

export function createApolloServer() {
  return new ApolloServer({ typeDefs, resolvers });
}

export async function startGraphQLServer(options = {}) {
  const config = options.config ?? loadConfig();
  const repository = options.repository ?? (await createRepository());
  const server = createApolloServer();
  // Apollo's standalone integration creates one context per HTTP operation:
  // https://www.apollographql.com/docs/apollo-server/api/standalone
  const { url } = await startStandaloneServer(server, {
    listen: { port: options.port ?? config.port },
    context: async ({ req }) => {
      // Throwing this GraphQLError from context prevents resolver execution and
      // lets Apollo return HTTP 401 as documented here:
      // https://www.apollographql.com/docs/apollo-server/security/authentication
      authenticate(req.headers.authorization, config.apiToken);
      return { repository };
    },
  });

  return { server, url };
}

function isMainModule() {
  return (
    process.argv[1] !== undefined &&
    import.meta.url === pathToFileURL(process.argv[1]).href
  );
}

if (isMainModule()) {
  try {
    const { url } = await startGraphQLServer();
    console.log(`GraphQL server ready at ${url}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Server failed to start");
    process.exitCode = 1;
  }
}
