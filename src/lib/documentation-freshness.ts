import { execFileSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";

export type DocumentationFreshnessSnapshot = {
  docsLatestAt: string | null;
  docsLatestPath: string | null;
  productLatestAt: string | null;
  productLatestPath: string | null;
  status: "current" | "needs-review" | "unknown";
};

const documentationPaths = [
  "docs/northstar-team-user-guide.md",
  "docs/northstar-executive-demo-guide.md",
  "docs/northstar-knowledge-management-solution.md",
  "docs/northstar-project-map.md",
  "docs/northstar-release-checklist.md"
];

const userFacingProductPaths = [
  "src/app",
  "src/components",
  "src/hooks",
  "src/lib/client-portal.ts",
  "src/lib/guided-plan-generator.ts",
  "src/lib/knowledge-center.ts",
  "src/lib/program-intelligence-types.ts",
  "src/lib/role-aware-ui.ts"
];

function readLatestGitTimestamp(paths: string[]) {
  try {
    const output = execFileSync("git", ["log", "-1", "--format=%cI", "--name-only", "--", ...paths], {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    })
      .trim()
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const timestamp = output[0] ?? null;
    const changedPath = output.slice(1).find(Boolean) ?? null;

    if (!timestamp) return null;
    return {
      path: changedPath,
      timestamp
    };
  } catch {
    return null;
  }
}

function readLatestFileTimestamp(paths: string[]) {
  let latest: { path: string; timestamp: string } | null = null;

  for (const path of paths) {
    const absolutePath = join(process.cwd(), path);
    if (!existsSync(absolutePath)) continue;

    const stat = statSync(absolutePath);
    const timestamp = stat.mtime.toISOString();
    if (!latest || new Date(timestamp).getTime() > new Date(latest.timestamp).getTime()) {
      latest = { path, timestamp };
    }
  }

  return latest;
}

function readLatestTimestamp(paths: string[]) {
  return readLatestGitTimestamp(paths) ?? readLatestFileTimestamp(paths);
}

export function getDocumentationFreshnessSnapshot(): DocumentationFreshnessSnapshot {
  const docs = readLatestTimestamp(documentationPaths);
  const product = readLatestTimestamp(userFacingProductPaths);

  if (!docs || !product) {
    return {
      docsLatestAt: docs?.timestamp ?? null,
      docsLatestPath: docs?.path ?? null,
      productLatestAt: product?.timestamp ?? null,
      productLatestPath: product?.path ?? null,
      status: "unknown"
    };
  }

  const status = new Date(docs.timestamp).getTime() >= new Date(product.timestamp).getTime() ? "current" : "needs-review";

  return {
    docsLatestAt: docs.timestamp,
    docsLatestPath: docs.path,
    productLatestAt: product.timestamp,
    productLatestPath: product.path,
    status
  };
}
