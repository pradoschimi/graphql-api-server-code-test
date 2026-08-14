import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { createRepository } from "../../src/data/repository.js";
import { startGraphQLServer } from "../../src/server.js";

const apiToken = "http-test-token";
const query = "query { node { _id name } }";

let server;
let url;
let resolverCallCount = 0;

before(async () => {
  const sourceRepository = await createRepository();
  const repository = {
    ...sourceRepository,
    nodeById(id) {
      resolverCallCount += 1;
      return sourceRepository.nodeById(id);
    },
    rootNode() {
      resolverCallCount += 1;
      return sourceRepository.rootNode();
    },
  };
  ({ server, url } = await startGraphQLServer({
    config: { apiToken, port: 0 },
    repository,
  }));
});

after(async () => {
  await server.stop();
});

async function request(authorization) {
  const headers = { "content-type": "application/json" };
  if (authorization !== undefined) {
    headers.authorization = authorization;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ query }),
  });

  return { response, body: await response.json() };
}

test("valid bearer token reaches the GraphQL resolver", async () => {
  const callsBeforeRequest = resolverCallCount;
  const { response, body } = await request(`Bearer ${apiToken}`);

  assert.equal(response.status, 200);
  assert.equal(body.errors, undefined);
  assert.deepEqual(body.data.node, {
    _id: "6296be3470a0c1052f89cccb",
    name: "Greeting Message",
  });
  assert.equal(resolverCallCount, callsBeforeRequest + 1);
});

test("invalid authorization headers return 401 and UNAUTHENTICATED", async () => {
  const invalidAuthorizations = [
    undefined,
    "Basic http-test-token",
    "Bearer ",
    "Bearer wrong-token",
  ];
  const callsBeforeRequests = resolverCallCount;

  for (const authorization of invalidAuthorizations) {
    const { response, body } = await request(authorization);

    assert.equal(response.status, 401);
    assert.equal(body.data, undefined);
    assert.equal(body.errors[0].message, "Authentication required");
    assert.equal(body.errors[0].extensions.code, "UNAUTHENTICATED");
    assert.equal(JSON.stringify(body).includes(apiToken), false);
    assert.equal(JSON.stringify(body).includes("wrong-token"), false);
  }

  assert.equal(resolverCallCount, callsBeforeRequests);
});
