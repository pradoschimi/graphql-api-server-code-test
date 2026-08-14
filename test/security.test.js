import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { URL } from "node:url";

import { createRepository } from "../src/data/repository.js";
import { createApolloServer } from "../src/server.js";

const sourceDirectory = new URL("../src/", import.meta.url);

async function javascriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nestedFiles = await Promise.all(
    entries.map(async (entry) => {
      const url = new URL(entry.name, directory);
      if (entry.isDirectory()) {
        return javascriptFiles(new URL(`${entry.name}/`, directory));
      }
      return entry.isFile() && entry.name.endsWith(".js") ? [url] : [];
    }),
  );

  return nestedFiles.flat();
}

test("functionString and template schema are returned as inert source data", async () => {
  const repository = await createRepository();
  const expectedTemplate = repository.resourceTemplateById(
    "61e9ba20f9b581f25a2dbf51",
  );
  const server = createApolloServer();

  try {
    const response = await server.executeOperation(
      {
        query: `#graphql
          query TriggerTemplate($nodeId: ID) {
            node(nodeId: $nodeId) {
              trigger {
                resourceTemplate {
                  _id
                  functionString
                  schema
                }
              }
            }
          }
        `,
        variables: { nodeId: "6297005470a0c10d6b89ccf1" },
      },
      { contextValue: { repository } },
    );

    assert.equal(response.body.kind, "single");
    const result = response.body.singleResult;
    assert.equal(result.errors, undefined);
    assert.equal(
      result.data.node.trigger.resourceTemplate.functionString,
      expectedTemplate.functionString,
    );
    assert.deepEqual(
      result.data.node.trigger.resourceTemplate.schema,
      expectedTemplate.schema,
    );
  } finally {
    await server.stop();
  }
});

test("source code cannot execute data strings or persist datasource changes", async () => {
  const files = await javascriptFiles(sourceDirectory);
  const source = (
    await Promise.all(files.map((file) => readFile(file, "utf8")))
  ).join("\n");

  const forbiddenPatterns = [
    /\beval\s*\(/u,
    /\bnew\s+Function\s*\(/u,
    /\bFunction\s*\(/u,
    /\bwriteFile(?:Sync)?\s*\(/u,
    /\bappendFile(?:Sync)?\s*\(/u,
    /\bfunctionString\s*\(/u,
  ];

  for (const pattern of forbiddenPatterns) {
    assert.doesNotMatch(source, pattern);
  }
});

test("runtime source contains no hardcoded test or demonstration credentials", async () => {
  const files = await javascriptFiles(sourceDirectory);
  const source = (
    await Promise.all(files.map((file) => readFile(file, "utf8")))
  ).join("\n");

  for (const credential of [
    "demo-token",
    "http-test-token",
    "expected-secret-token",
    "wrong-secret-token",
  ]) {
    assert.equal(source.includes(credential), false);
  }
});
