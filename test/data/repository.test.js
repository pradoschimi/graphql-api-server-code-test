import assert from "node:assert/strict";
import test from "node:test";

import { createRepository } from "../../src/data/repository.js";

test("createRepository loads every provided data source", async () => {
  const repository = await createRepository();

  assert.deepEqual(repository.counts, {
    nodes: 7,
    triggers: 5,
    responses: 5,
    actions: 1,
    resourceTemplates: 3,
  });
  assert.equal(repository.nodes[0]._id, "6296be3470a0c1052f89cccb");
  assert.equal(repository.nodes[0].name, "Greeting Message");
});

test("repository resolves every entity type through indexes", async () => {
  const repository = await createRepository();

  assert.equal(
    repository.nodeById("6296be3470a0c1052f89cccb").name,
    "Greeting Message",
  );
  assert.equal(
    repository.nodeByCompositeId("V78P4OA9maz31ORn")._id,
    "6296be3470a0c1052f89cccb",
  );
  assert.equal(repository.rootNode()._id, "6296be3470a0c1052f89cccb");
  assert.equal(
    repository.triggerById("629712b210f525845e1a92f8").name,
    "Keyword: Say Hi",
  );
  assert.equal(
    repository.responseById("6296fcad70a0c11ddb89ccf0").name,
    "Greeting Message",
  );
  assert.equal(
    repository.actionById("6530933e6a1690d2f0c78a92").name,
    "Send Email Action",
  );
  assert.equal(
    repository.resourceTemplateById("61e9ba20f9b58155162dbf52").name,
    "Predefined Triggers",
  );
});

test("single lookups return null for empty and unknown keys", async () => {
  const repository = await createRepository();
  const singleLookups = [
    repository.nodeById,
    repository.nodeByCompositeId,
    repository.triggerById,
    repository.responseById,
    repository.actionById,
    repository.resourceTemplateById,
  ];

  for (const lookup of singleLookups) {
    assert.equal(lookup(null), null);
    assert.equal(lookup(undefined), null);
    assert.equal(lookup("unknown-id"), null);
  }
});

test("batch lookups filter unresolved references and preserve order", async () => {
  const repository = await createRepository();
  const responseIds = [
    "6297171270a0c17c5689cd0c",
    null,
    "unknown-id",
    "6296fcad70a0c11ddb89ccf0",
  ];
  const originalResponseIds = [...responseIds];

  assert.deepEqual(repository.responsesByIds(responseIds).map(({ _id }) => _id), [
    "6297171270a0c17c5689cd0c",
    "6296fcad70a0c11ddb89ccf0",
  ]);
  assert.deepEqual(responseIds, originalResponseIds);
  assert.deepEqual(repository.responsesByIds([]), []);
  assert.deepEqual(repository.responsesByIds(null), []);

  assert.deepEqual(
    repository.nodesByCompositeIds([
      "XTpR0HkNpxWjJ6eG",
      undefined,
      "unknown-id",
      "V78P4OA9maz31ORn",
    ]).map(({ compositeId }) => compositeId),
    ["XTpR0HkNpxWjJ6eG", "V78P4OA9maz31ORn"],
  );
  assert.deepEqual(repository.nodesByCompositeIds(undefined), []);

  assert.deepEqual(
    repository.actionsByIds([null, "6530933e6a1690d2f0c78a92"]),
    [repository.actionById("6530933e6a1690d2f0c78a92")],
  );
  assert.deepEqual(repository.actionsByIds(null), []);
});

test("repository lookups do not mutate source records", async () => {
  const repository = await createRepository();
  const before = JSON.stringify(repository.nodes);

  repository.nodeById("6296be3470a0c1052f89cccb");
  repository.nodeByCompositeId("V78P4OA9maz31ORn");
  repository.nodesByCompositeIds(["V78P4OA9maz31ORn"]);

  assert.equal(JSON.stringify(repository.nodes), before);
});
