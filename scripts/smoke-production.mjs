import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));

const smokeSteps = [
  { name: "chat disabled", script: "smoke-chat-disabled.mjs" },
  { name: "new program setup", script: "smoke-new-program-setup.mjs" },
  { name: "program slicers", script: "smoke-program-slicers.mjs" },
  { name: "studio", script: "smoke-studio.mjs" },
  { name: "admin model settings", script: "smoke-admin-model-settings.mjs" },
  { name: "admin audit export", script: "smoke-admin-audit-export.mjs" },
  { name: "admin user removal", script: "smoke-admin-user-removal.mjs" },
  { name: "team footprint propagation", script: "smoke-team-footprint.mjs" },
  {
    name: "client portal isolation",
    script: "smoke-client-isolation.mjs"
  },
  {
    env: {
      NORTHSTAR_CLIENT_DASHBOARD_SMOKE_CLEANUP: process.env.NORTHSTAR_CLIENT_DASHBOARD_SMOKE_CLEANUP ?? "prune"
    },
    name: "client dashboard updates",
    script: "smoke-client-dashboard-updates.mjs"
  },
  {
    env: {
      NORTHSTAR_CLIENT_PORTAL_SMOKE_CLEANUP: process.env.NORTHSTAR_CLIENT_PORTAL_SMOKE_CLEANUP ?? "prune"
    },
    name: "client portal seeded update",
    script: "smoke-client-portal.mjs"
  },
  {
    env: {
      NORTHSTAR_SMOKE_CLEANUP: process.env.NORTHSTAR_SMOKE_CLEANUP ?? "prune"
    },
    name: "active program save + client portal",
    script: "smoke-active-program-save.mjs"
  }
];

function runSmokeStep(step) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [join(scriptDirectory, step.script)], {
      env: {
        ...process.env,
        ...(step.env ?? {})
      },
      stdio: "inherit"
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${step.name} smoke failed with ${signal ? `signal ${signal}` : `exit code ${code}`}.`));
    });
  });
}

for (const step of smokeSteps) {
  console.log(`\n▶ Running ${step.name} smoke...`);
  await runSmokeStep(step);
}

console.log("\nProduction smoke bundle passed.");
