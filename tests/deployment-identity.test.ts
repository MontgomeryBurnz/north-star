import assert from "node:assert/strict";
import test from "node:test";
import { deploymentCommitSha } from "../src/lib/deployment-identity.ts";

test("deployment identity exposes only a complete Git SHA and fails closed when unavailable", () => {
  const sha = "4a2679389aca7ed8a54d70d481107db04e3cb5c5";
  assert.equal(deploymentCommitSha(sha), sha);
  assert.equal(deploymentCommitSha(sha.toUpperCase()), sha);
  for (const value of [undefined, "", "main", "4a26793", ` ${sha}`, `${sha}\n`, "not-a-git-sha-or-secret-value"]) {
    assert.equal(deploymentCommitSha(value), null);
  }
});
