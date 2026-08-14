import assert from "node:assert/strict";
import test from "node:test";

import { GraphQLError } from "graphql";

import { authenticate } from "../src/auth.js";

test("authenticate accepts exactly one matching Bearer token", () => {
  assert.doesNotThrow(() => authenticate("Bearer demo-token", "demo-token"));
});

test("authenticate rejects invalid authorization values without leaking tokens", () => {
  const expectedToken = "expected-secret-token";
  const invalidHeaders = [
    undefined,
    "",
    "Basic expected-secret-token",
    "Bearer",
    "Bearer ",
    "Bearer wrong-secret-token",
    "Bearer expected-secret-token extra",
    ["Bearer expected-secret-token", "Bearer expected-secret-token"],
  ];

  for (const authorization of invalidHeaders) {
    assert.throws(
      () => authenticate(authorization, expectedToken),
      (error) => {
        assert.ok(error instanceof GraphQLError);
        assert.equal(error.message, "Authentication required");
        assert.equal(error.extensions.code, "UNAUTHENTICATED");
        assert.equal(error.extensions.http.status, 401);
        assert.equal(error.message.includes(expectedToken), false);
        assert.equal(error.message.includes("wrong-secret-token"), false);
        return true;
      },
    );
  }
});
