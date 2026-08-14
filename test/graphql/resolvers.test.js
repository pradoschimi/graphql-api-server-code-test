import assert from "node:assert/strict";
import test from "node:test";

import { mergeActionIds, resolvers } from "../../src/graphql/resolvers.js";

test("mergeActionIds combines pre, main, and post actions in stable order", () => {
  const node = {
    preActions: [null, "action-1", "action-2"],
    actions: ["action-2", undefined, "action-3"],
    postActions: ["action-1", "action-4"],
  };
  const before = {
    preActions: [...node.preActions],
    actions: [...node.actions],
    postActions: [...node.postActions],
  };

  assert.deepEqual(mergeActionIds(node), [
    "action-1",
    "action-2",
    "action-3",
    "action-4",
  ]);
  assert.deepEqual(node, before);
  assert.deepEqual(mergeActionIds({}), []);
  assert.deepEqual(mergeActionIds(null), []);
});

test("Query.node selects by id, root node, or null result", () => {
  const knownNode = { _id: "known-node", root: false };
  const rootNode = { _id: "root-node", root: true };
  const calls = [];
  const repository = {
    nodeById(id) {
      calls.push(["nodeById", id]);
      return id === knownNode._id ? knownNode : null;
    },
    rootNode() {
      calls.push(["rootNode"]);
      return rootNode;
    },
  };

  assert.equal(
    resolvers.Query.node(null, { nodeId: "known-node" }, { repository }),
    knownNode,
  );
  assert.equal(resolvers.Query.node(null, {}, { repository }), rootNode);
  assert.equal(
    resolvers.Query.node(null, { nodeId: "unknown-node" }, { repository }),
    null,
  );
  assert.deepEqual(calls, [
    ["nodeById", "known-node"],
    ["rootNode"],
    ["nodeById", "unknown-node"],
  ]);
});

test("NodeObject exposes reference ids and stable nullable fields", () => {
  const node = {
    trigger: "trigger-1",
    responses: ["response-1", "response-2"],
    parents: ["parent-composite-1"],
    preActions: ["action-0"],
    actions: ["action-1"],
    postActions: ["action-2"],
    root: false,
    global: false,
  };
  const emptyNode = {
    trigger: null,
    responses: null,
    parents: undefined,
    actions: null,
  };

  assert.equal(resolvers.NodeObject.triggerId(node), "trigger-1");
  assert.deepEqual(resolvers.NodeObject.responseIds(node), [
    "response-1",
    "response-2",
  ]);
  assert.deepEqual(resolvers.NodeObject.parentIds(node), ["parent-composite-1"]);
  assert.deepEqual(resolvers.NodeObject.actionIds(node), [
    "action-0",
    "action-1",
    "action-2",
  ]);
  assert.equal(resolvers.NodeObject.priority(node), null);
  assert.equal(resolvers.NodeObject.colour(node), null);
  assert.equal(resolvers.NodeObject.root(node), false);
  assert.equal(resolvers.NodeObject.global(node), false);

  assert.equal(resolvers.NodeObject.triggerId(emptyNode), null);
  assert.deepEqual(resolvers.NodeObject.responseIds(emptyNode), []);
  assert.deepEqual(resolvers.NodeObject.parentIds(emptyNode), []);
  assert.deepEqual(resolvers.NodeObject.actionIds(emptyNode), []);
});

test("NodeObject resolves referenced objects through the repository", () => {
  const trigger = { _id: "trigger-1", name: "Trigger" };
  const response1 = { _id: "response-1", name: "First response" };
  const response2 = { _id: "response-2", name: "Second response" };
  const parent = { _id: "parent-1", compositeId: "parent-composite" };
  const action1 = { _id: "action-1", name: "First action" };
  const action2 = { _id: "action-2", name: "Second action" };
  const calls = [];
  const repository = {
    triggerById(id) {
      calls.push(["triggerById", id]);
      return trigger;
    },
    responsesByIds(ids) {
      calls.push(["responsesByIds", ids]);
      return [response1, response2];
    },
    nodesByCompositeIds(ids) {
      calls.push(["nodesByCompositeIds", ids]);
      return [parent];
    },
    actionsByIds(ids) {
      calls.push(["actionsByIds", ids]);
      return [action1, action2];
    },
  };
  const node = {
    trigger: "trigger-1",
    responses: ["response-1", "response-2"],
    parents: ["parent-composite"],
    preActions: ["action-1"],
    actions: null,
    postActions: ["action-2"],
  };
  const context = { repository };

  assert.equal(resolvers.NodeObject.trigger(node, {}, context), trigger);
  assert.deepEqual(resolvers.NodeObject.responses(node, {}, context), [
    response1,
    response2,
  ]);
  assert.deepEqual(resolvers.NodeObject.parents(node, {}, context), [parent]);
  assert.deepEqual(resolvers.NodeObject.actions(node, {}, context), [
    action1,
    action2,
  ]);
  assert.deepEqual(calls, [
    ["triggerById", "trigger-1"],
    ["responsesByIds", ["response-1", "response-2"]],
    ["nodesByCompositeIds", ["parent-composite"]],
    ["actionsByIds", ["action-1", "action-2"]],
  ]);

  const emptyNode = {};
  assert.equal(resolvers.NodeObject.trigger(emptyNode, {}, context), null);
  assert.deepEqual(resolvers.NodeObject.responses(emptyNode, {}, context), []);
  assert.deepEqual(resolvers.NodeObject.parents(emptyNode, {}, context), []);
  assert.deepEqual(resolvers.NodeObject.actions(emptyNode, {}, context), []);
});

test("resource templates and response locale groups map source fields", () => {
  const template = {
    _id: "template-1",
    createdAt: undefined,
    updatedAt: 1_727_122_901_547,
  };
  const repository = {
    resourceTemplateById(id) {
      return id === template._id ? template : null;
    },
  };
  const context = { repository };

  assert.equal(
    resolvers.Trigger.resourceTemplate(
      { resourceTemplateId: "template-1" },
      {},
      context,
    ),
    template,
  );
  assert.equal(
    resolvers.Action.resourceTemplate(
      { resourceTemplateId: "unknown-template" },
      {},
      context,
    ),
    null,
  );
  assert.equal(resolvers.ResourceTemplate.createdAt(template), 1_727_122_901_547);
  assert.equal(
    resolvers.ResourceTemplate.createdAt({
      createdAt: 1_654_758_039_590,
      updatedAt: null,
    }),
    1_654_758_039_590,
  );
  assert.equal(
    resolvers.ResponseLocaleGroup.localeGroupId({ localeGroup: "default" }),
    "default",
  );
  assert.deepEqual(
    resolvers.ResponsePlatform.localeGroups({ localeGroups: null }),
    [],
  );
  assert.deepEqual(
    resolvers.ResponseLocaleGroup.variations({ variations: undefined }),
    [],
  );
});
