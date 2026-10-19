import assert from "node:assert/strict";
import test from "node:test";
import { isStudioRequestSameOrigin } from "../src/lib/studio-request-origin.ts";

test("Studio accepts the browser-facing local Host even when Next uses an internal localhost URL", () => {
  assert.equal(isStudioRequestSameOrigin(new Request("http://localhost:3017/api/studio/packages", { headers: { host:"127.0.0.1:3017", origin:"http://127.0.0.1:3017" } })), true);
});
test("Studio validates production protocol and host, never arbitrary forwarded hosts", () => {
  assert.equal(isStudioRequestSameOrigin(new Request("http://internal/api/studio/packages", { headers: { host:"www.north-star.live", "x-forwarded-proto":"https", origin:"https://www.north-star.live" } })), true);
  assert.equal(isStudioRequestSameOrigin(new Request("https://www.north-star.live/api/studio/packages", { headers: { host:"www.north-star.live", "x-forwarded-host":"attacker.example", origin:"https://attacker.example" } })), false);
});
test("Studio rejects cross-site, malformed and wrong-port origins", () => {
  const cases: Array<Record<string, string>> = [{origin:"https://attacker.example"}, {origin:"null"}, {origin:"https://www.north-star.live:444"}, {origin:"https://www.north-star.live", "sec-fetch-site":"cross-site"}];
  for (const headers of cases) assert.equal(isStudioRequestSameOrigin(new Request("https://www.north-star.live/api/studio/packages",{headers})),false);
});
