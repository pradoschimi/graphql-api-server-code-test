import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { ApolloServer } from "@apollo/server";

import { createRepository } from "../../src/data/repository.js";
import { resolvers } from "../../src/graphql/resolvers.js";
import { typeDefs } from "../../src/graphql/typeDefs.js";

let repository;
let server;

before(async () => {
  repository = await createRepository();
  server = new ApolloServer({ typeDefs, resolvers });
});

after(async () => {
  await server.stop();
});

async function execute(query, variables) {
  const response = await server.executeOperation(
    { query, variables },
    { contextValue: { repository } },
  );

  assert.equal(response.body.kind, "single");
  return response.body.singleResult;
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

test("executeOperation resolves a complete nested node graph", async () => {
  const result = await execute(
    `#graphql
      query GetNode($nodeId: ID) {
        node(nodeId: $nodeId) {
          _id
          name
          createdAt
          triggerId
          responseIds
          parentIds
          actionIds
          priority
          colour
          trigger {
            _id
            name
            resourceTemplate {
              _id
              name
              createdAt
            }
          }
          responses {
            _id
            name
            platforms {
              integrationId
              build
              localeGroups {
                localeGroupId
                variations {
                  name
                  responses
                }
              }
            }
          }
          parents {
            _id
            name
          }
          actions {
            _id
            name
            functionString
            resourceTemplate {
              _id
              name
              createdAt
            }
          }
        }
      }
    `,
    { nodeId: "6297172e70a0c165b989cd10" },
  );

  assert.equal(result.errors, undefined);
  assert.deepEqual(plain(result.data.node), {
    _id: "6297172e70a0c165b989cd10",
    name: "User's Email",
    createdAt: 1_654_069_038_783,
    triggerId: "6297176c10f525b8a81a9304",
    responseIds: ["6297189510f525833b1a9305"],
    parentIds: ["rCMUtmL3aOULyqBL"],
    actionIds: ["6530933e6a1690d2f0c78a92"],
    priority: null,
    colour: null,
    trigger: {
      _id: "6297176c10f525b8a81a9304",
      name: "Email Trigger",
      resourceTemplate: {
        _id: "61e9ba20f9b58155162dbf52",
        name: "Predefined Triggers",
        createdAt: 1_727_122_901_547,
      },
    },
    responses: [
      {
        _id: "6297189510f525833b1a9305",
        name: "Get Email Response",
        platforms: [
          {
            integrationId: "woztell-essential-pack",
            build: 1,
            localeGroups: [
              {
                localeGroupId: "default",
                variations: [
                  {
                    name: "Standard",
                    responses: [
                      {
                        type: "TEXT",
                        text: "Thank you for signing up for our webinar!",
                        id: "8Y4Qw8A8",
                        transform: "",
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
    parents: [
      {
        _id: "6297164810f52524ba1a9300",
        name: "Sign up Webinar",
      },
    ],
    actions: [
      {
        _id: "6530933e6a1690d2f0c78a92",
        name: "Send Email Action",
        functionString: null,
        resourceTemplate: {
          _id: "62cfc19bf4573e1b32ca2295",
          name: "Send Email",
          createdAt: 1_654_758_039_590,
        },
      },
    ],
  });
});

test("executeOperation supports root selection, unknown ids, and empty relations", async () => {
  const rootResult = await execute(`#graphql
    query GetRootNode {
      node {
        _id
        name
        root
        trigger { _id }
        triggerId
        parents { _id }
        parentIds
        actions { _id }
        actionIds
      }
    }
  `);
  const missingResult = await execute(
    `#graphql
      query MissingNode($nodeId: ID) {
        node(nodeId: $nodeId) { _id }
      }
    `,
    { nodeId: "unknown-node" },
  );

  assert.equal(rootResult.errors, undefined);
  assert.deepEqual(plain(rootResult.data.node), {
    _id: "6296be3470a0c1052f89cccb",
    name: "Greeting Message",
    root: true,
    trigger: null,
    triggerId: null,
    parents: [],
    parentIds: [],
    actions: [],
    actionIds: [],
  });
  assert.equal(missingResult.errors, undefined);
  assert.equal(missingResult.data.node, null);
});
