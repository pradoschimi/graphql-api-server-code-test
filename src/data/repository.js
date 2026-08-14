import { readFile } from "node:fs/promises";
import { URL } from "node:url";

const dataSources = {
  nodes: "../../node.json",
  triggers: "../../trigger.json",
  responses: "../../response.json",
  actions: "../../action.json",
  resourceTemplates: "../../resourceTemplate.json",
};

async function readJson(relativePath) {
  const contents = await readFile(new URL(relativePath, import.meta.url), "utf8");
  return JSON.parse(contents);
}

function indexBy(records, key) {
  return new Map(
    records
      .filter(
        (record) => record[key] !== null && record[key] !== undefined,
      )
      .map((record) => [record[key], record]),
  );
}

function findOne(index, key) {
  if (key === null || key === undefined) {
    return null;
  }

  return index.get(key) ?? null;
}

function findMany(index, keys) {
  if (!Array.isArray(keys)) {
    return [];
  }

  return keys.flatMap((key) => {
    const record = findOne(index, key);
    return record === null ? [] : [record];
  });
}

export async function createRepository() {
  const entries = await Promise.all(
    Object.entries(dataSources).map(async ([name, relativePath]) => [
      name,
      Object.freeze(await readJson(relativePath)),
    ]),
  );
  const data = Object.fromEntries(entries);
  const indexes = {
    nodesById: indexBy(data.nodes, "_id"),
    nodesByCompositeId: indexBy(data.nodes, "compositeId"),
    triggersById: indexBy(data.triggers, "_id"),
    responsesById: indexBy(data.responses, "_id"),
    actionsById: indexBy(data.actions, "_id"),
    resourceTemplatesById: indexBy(data.resourceTemplates, "_id"),
  };
  const rootNode = data.nodes.find((node) => node.root === true) ?? null;

  return Object.freeze({
    ...data,
    counts: Object.freeze(
      Object.fromEntries(
        Object.entries(data).map(([name, records]) => [name, records.length]),
      ),
    ),
    nodeById: (id) => findOne(indexes.nodesById, id),
    nodeByCompositeId: (compositeId) =>
      findOne(indexes.nodesByCompositeId, compositeId),
    rootNode: () => rootNode,
    triggerById: (id) => findOne(indexes.triggersById, id),
    responseById: (id) => findOne(indexes.responsesById, id),
    actionById: (id) => findOne(indexes.actionsById, id),
    resourceTemplateById: (id) =>
      findOne(indexes.resourceTemplatesById, id),
    nodesByCompositeIds: (compositeIds) =>
      findMany(indexes.nodesByCompositeId, compositeIds),
    responsesByIds: (ids) => findMany(indexes.responsesById, ids),
    actionsByIds: (ids) => findMany(indexes.actionsById, ids),
  });
}
