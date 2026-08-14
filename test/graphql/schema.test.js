import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSchema,
  GraphQLID,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
  validateSchema,
} from "graphql";

import { scalarResolvers } from "../../src/graphql/scalars.js";
import { typeDefs } from "../../src/graphql/typeDefs.js";

test("typeDefs build the required query and object contract", () => {
  const schema = buildSchema(typeDefs);
  const errors = validateSchema(schema);
  const queryFields = schema.getQueryType().getFields();
  const types = schema.getTypeMap();

  assert.deepEqual(errors, []);
  assert.ok(types.Action);
  assert.ok(types.Trigger);
  assert.ok(types.Response);
  assert.ok(types.ResponsePlatform);
  assert.ok(types.ResponseLocaleGroup);
  assert.ok(types.ResponseVariation);
  assert.ok(types.ResourceTemplate);
  assert.ok(types.NodeObject);
  assert.equal(String(queryFields.node.type), "NodeObject");
  assert.equal(queryFields.node.args[0].name, "nodeId");
  assert.equal(queryFields.node.args[0].type, GraphQLID);
});

test("typeDefs preserve field nullability and list shapes", () => {
  const schema = buildSchema(typeDefs);
  const types = schema.getTypeMap();
  const actionFields = types.Action.getFields();
  const platformFields = types.ResponsePlatform.getFields();
  const variationFields = types.ResponseVariation.getFields();
  const nodeFields = types.NodeObject.getFields();

  assert.ok(actionFields._id.type instanceof GraphQLNonNull);
  assert.equal(actionFields._id.type.ofType, GraphQLID);
  assert.ok(actionFields.name.type instanceof GraphQLNonNull);
  assert.equal(actionFields.name.type.ofType, GraphQLString);
  assert.ok(platformFields.build.type === GraphQLInt);
  assert.ok(nodeFields.parents.type instanceof GraphQLList);
  assert.ok(nodeFields.parentIds.type instanceof GraphQLList);
  assert.equal(String(variationFields.responses.type), "JSON");
  assert.equal(String(actionFields.createdAt.type), "Long!");
});

test("scalar resolver map uses the package Long and JSON scalars", () => {
  assert.equal(scalarResolvers.Long.name, "Long");
  assert.equal(scalarResolvers.JSON.name, "JSON");
  assert.equal(scalarResolvers.Long.serialize(1_726_000_000_000), 1_726_000_000_000);
  assert.deepEqual(scalarResolvers.JSON.serialize({ nested: [1, "two"] }), {
    nested: [1, "two"],
  });
});
