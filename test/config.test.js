import assert from "node:assert/strict";
import test from "node:test";

import { loadConfig } from "../src/config.js";

test("loadConfig reads the required token and default port", () => {
  assert.deepEqual(loadConfig({ API_TOKEN: "demo-token" }), {
    apiToken: "demo-token",
    port: 4000,
  });
  assert.deepEqual(
    loadConfig({ API_TOKEN: "another-token", PORT: "4321" }),
    { apiToken: "another-token", port: 4321 },
  );
  assert.deepEqual(loadConfig({ API_TOKEN: "demo-token", PORT: "0" }), {
    apiToken: "demo-token",
    port: 0,
  });
});

test("loadConfig rejects a missing or blank API token without leaking it", () => {
  for (const env of [{}, { API_TOKEN: "" }, { API_TOKEN: "   " }]) {
    assert.throws(
      () => loadConfig(env),
      (error) => {
        assert.equal(error.message, "API_TOKEN is required");
        if (env.API_TOKEN?.trim()) {
          assert.equal(error.message.includes(env.API_TOKEN), false);
        }
        return true;
      },
    );
  }
});

test("loadConfig rejects invalid ports", () => {
  for (const port of ["abc", "3.14", "-1", "65536", "  "]) {
    assert.throws(
      () => loadConfig({ API_TOKEN: "demo-token", PORT: port }),
      { message: "PORT must be an integer between 0 and 65535" },
    );
  }
});
