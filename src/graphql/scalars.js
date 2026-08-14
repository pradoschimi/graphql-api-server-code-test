import { GraphQLJSON, GraphQLLong } from "graphql-scalars";

export const scalarResolvers = Object.freeze({
  JSON: GraphQLJSON,
  Long: GraphQLLong,
});
