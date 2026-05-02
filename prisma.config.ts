import { existsSync, readFileSync } from "node:fs";
import { defineConfig, env } from "prisma/config";

function loadLocalEnv(filePath: string) {
  if (!existsSync(filePath)) return;

  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const delimiter = trimmed.indexOf("=");
    if (delimiter === -1) continue;

    const key = trimmed.slice(0, delimiter);
    if (process.env[key]) continue;

    let value = trimmed.slice(delimiter + 1);
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

loadLocalEnv(".env.local");

export default defineConfig({
  datasource: {
    url: env("DATABASE_URL")
  },
  schema: "prisma/schema.prisma"
});
