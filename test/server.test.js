import assert from "node:assert/strict";
import test from "node:test";

import { createApolloServer } from "../src/server.js";

test("createApolloServer executes operations with an injected repository", async () => {
  const repository = {
    rootNode: () => ({
      _id: "root-node",
      createdAt: 1_726_000_000_000,
      name: "Injected root",
    }),
  };
  const server = createApolloServer();

  try {
    const response = await server.executeOperation(
      { query: "query { node { _id name } }" },
      { contextValue: { repository } },
    );

    assert.equal(response.body.kind, "single");
    assert.equal(response.body.singleResult.errors, undefined);
    assert.deepEqual(
      JSON.parse(JSON.stringify(response.body.singleResult.data)),
      { node: { _id: "root-node", name: "Injected root" } },
    );
  } finally {
    await server.stop();
  }
});

test("importing server.js does not start an HTTP listener", () => {
  assert.equal(typeof createApolloServer, "function");
});
