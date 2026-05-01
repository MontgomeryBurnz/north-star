import assert from "node:assert/strict";
import test from "node:test";
import { inferVercelProjectName, inferVercelTeamSlug } from "../src/lib/vercel-project-inference.ts";

test("inferVercelProjectName prefers the deployment host before a custom production domain", () => {
  const env = {
    VERCEL_PROJECT_PRODUCTION_URL: "www.north-star.live",
    VERCEL_URL: "north-star-git-main-montgomeryburnzs-projects.vercel.app"
  };

  assert.equal(inferVercelProjectName(env), "north-star");
  assert.equal(inferVercelTeamSlug(env), "montgomeryburnzs-projects");
});

test("inferVercelProjectName keeps explicit project configuration ahead of inference", () => {
  assert.equal(
    inferVercelProjectName({
      NORTHSTAR_VERCEL_PROJECT_NAME: "explicit-project",
      VERCEL_PROJECT_PRODUCTION_URL: "www.north-star.live",
      VERCEL_URL: "north-star-git-main-montgomeryburnzs-projects.vercel.app"
    }),
    "explicit-project"
  );
});

test("inferVercelProjectName uses the North Star slug when only the custom domain is available", () => {
  assert.equal(inferVercelProjectName({ VERCEL_PROJECT_PRODUCTION_URL: "www.north-star.live" }), "north-star");
});
