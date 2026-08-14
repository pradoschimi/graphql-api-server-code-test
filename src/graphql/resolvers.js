import { scalarResolvers } from "./scalars.js";

function list(value) {
  return Array.isArray(value) ? value : [];
}

function resolveMany(references, lookup) {
  const ids = list(references);
  return ids.length === 0 ? [] : lookup(ids);
}

function resolveResourceTemplate(source, repository) {
  return source.resourceTemplateId === null ||
    source.resourceTemplateId === undefined
    ? null
    : repository.resourceTemplateById(source.resourceTemplateId);
}

export function mergeActionIds(node) {
  if (node === null || node === undefined) {
    return [];
  }

  return [
    ...new Set(
      [
        ...list(node.preActions),
        ...list(node.actions),
        ...list(node.postActions),
      ].filter((id) => id !== null && id !== undefined),
    ),
  ];
}

export const resolvers = {
  ...scalarResolvers,
  Query: {
    node(_parent, { nodeId }, { repository }) {
      return nodeId === undefined
        ? repository.rootNode()
        : repository.nodeById(nodeId);
    },
  },
  NodeObject: {
    trigger: (node, _args, { repository }) =>
      node.trigger === null || node.trigger === undefined
        ? null
        : repository.triggerById(node.trigger),
    responses: (node, _args, { repository }) =>
      resolveMany(node.responses, (ids) => repository.responsesByIds(ids)),
    parents: (node, _args, { repository }) =>
      resolveMany(node.parents, (ids) => repository.nodesByCompositeIds(ids)),
    actions: (node, _args, { repository }) =>
      resolveMany(mergeActionIds(node), (ids) => repository.actionsByIds(ids)),
    triggerId: (node) => node.trigger ?? null,
    responseIds: (node) => list(node.responses),
    parentIds: (node) => list(node.parents),
    actionIds: (node) => mergeActionIds(node),
    priority: (node) => node.priority ?? null,
    colour: (node) => node.colour ?? null,
    root: (node) => node.root ?? null,
    global: (node) => node.global ?? null,
  },
  Trigger: {
    resourceTemplate: (trigger, _args, { repository }) =>
      resolveResourceTemplate(trigger, repository),
  },
  Action: {
    resourceTemplate: (action, _args, { repository }) =>
      resolveResourceTemplate(action, repository),
  },
  ResourceTemplate: {
    createdAt: (template) => template.createdAt ?? template.updatedAt ?? null,
  },
  Response: {
    platforms: (response) => list(response.platforms),
  },
  ResponsePlatform: {
    localeGroups: (platform) => list(platform.localeGroups),
  },
  ResponseLocaleGroup: {
    localeGroupId: (localeGroup) => localeGroup.localeGroup ?? null,
    variations: (localeGroup) => list(localeGroup.variations),
  },
};
