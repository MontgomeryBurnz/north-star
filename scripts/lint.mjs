import { ESLint } from "eslint";

const DEFAULT_TARGETS = [
  "eslint.config.mjs",
  "next.config.mjs",
  "postcss.config.mjs",
  "scripts/**/*.mjs"
];

const timeoutMs = Number(process.env.NORTHSTAR_LINT_TIMEOUT_MS ?? 30000);
const requestedTargets = process.argv.slice(2).filter((arg) => arg !== "--");
const targets = requestedTargets.length > 0 ? requestedTargets : DEFAULT_TARGETS;

function withTimeout(promise, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`${label} exceeded ${timeoutMs}ms. Reinstall dependencies before release.`));
    }, timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

const eslint = new ESLint({
  errorOnUnmatchedPattern: false,
  overrideConfigFile: "eslint.config.mjs"
});

try {
  const results = await withTimeout(eslint.lintFiles(targets), "ESLint");
  const formatter = await eslint.loadFormatter("stylish");
  const output = formatter.format(results);

  if (output) {
    console.log(output);
  }

  const errorCount = results.reduce((total, result) => total + result.errorCount, 0);
  const warningCount = results.reduce((total, result) => total + result.warningCount, 0);

  if (errorCount > 0 || warningCount > 0) {
    console.error(`ESLint found ${errorCount} error(s) and ${warningCount} warning(s).`);
    process.exit(1);
  }

  console.log(`ESLint passed for ${targets.join(", ")}.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
