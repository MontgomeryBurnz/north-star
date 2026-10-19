import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const routes = [
  ["standalone", "../src/app/api/studio/discovery-synthesis/route.ts"],
  ["program", "../src/app/api/programs/[id]/discovery-synthesis/route.ts"]
] as const;

for (const [name, path] of routes) {
  test(`${name} discovery generation declares the supported Fluid Compute runtime`, () => {
    const route = readFileSync(new URL(path, import.meta.url), "utf8");
    assert.match(route, /export const maxDuration = 800;/);
  });
}

test("discovery generation reserves time for validation, persistence, and audit writes", () => {
  const service = readFileSync(new URL("../src/lib/discovery-studio-service.ts", import.meta.url), "utf8");
  const budget = service.match(/const DISCOVERY_RUN_TIMEOUT_MS = ([\d_]+);/);
  assert.ok(budget, "The service must declare an explicit generation budget.");
  const generationBudgetMs = Number(budget[1].replaceAll("_", ""));
  assert.equal(generationBudgetMs, 740_000);

  for (const [name, path] of routes) {
    const route = readFileSync(new URL(path, import.meta.url), "utf8");
    const duration = route.match(/export const maxDuration = (\d+);/);
    assert.ok(duration, `${name} discovery generation must declare a literal maxDuration.`);
    assert.ok(Number(duration[1]) * 1000 - generationBudgetMs >= 60_000, `${name} generation must leave at least 60 seconds for postprocessing.`);
  }
});
