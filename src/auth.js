import { GraphQLError } from "graphql";

const bearerPattern = /^Bearer ([^\s]+)$/;

function unauthenticatedError() {
  return new GraphQLError("Authentication required", {
    extensions: {
      code: "UNAUTHENTICATED",
      http: { status: 401 },
    },
  });
}

export function authenticate(authorization, expectedToken) {
  if (typeof authorization !== "string") {
    throw unauthenticatedError();
  }

  const match = bearerPattern.exec(authorization);
  if (match === null || match[1] !== expectedToken) {
    throw unauthenticatedError();
  }
}
