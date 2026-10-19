import assert from "node:assert/strict";
import JSZip from "jszip";
import { loadEnvFile } from "./browser-webdriver.mjs";
import { sampleDiscoverySources, sampleDiscoverySynthesis, sampleProgram } from "../src/data/sample-program.ts";

loadEnvFile(process.env.NORTHSTAR_ENV_FILE ?? ".env.local");
const baseUrl = (process.env.SMOKE_BASE_URL ?? "http://localhost:3100").replace(/\/$/, "");
const email = process.env.NORTHSTAR_TEST_USER_EMAIL ?? process.env.NORTHSTAR_USER_EMAIL;
const password = process.env.NORTHSTAR_TEST_USER_PASSWORD ?? process.env.NORTHSTAR_USER_PASSWORD;
if (!email || !password) throw new Error("Configure a North Star smoke-test user before checking Studio outputs.");
const cookies = new Map();
async function request(path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST", redirect: "manual",
    headers: { "content-type": "application/json", cookie: [...cookies].map(([key, value]) => `${key}=${value}`).join("; ") },
    body: JSON.stringify(body)
  });
  for (const cookie of response.headers.getSetCookie()) {
    const first = cookie.split(";", 1)[0];
    const index = first.indexOf("=");
    cookies.set(first.slice(0, index), first.slice(index + 1));
  }
  return response;
}
assert.equal((await request("/api/auth/user/login", { email, password })).status, 200, "Smoke-test authentication failed.");
const outputs = ["roadmap", "backlog", "stories", "tests", "gaps", "analysis"];
for (const [format, mainFile] of [["docx", "word/document.xml"], ["xlsx", "xl/workbook.xml"], ["pptx", "ppt/presentation.xml"]]) {
  const response = await request("/api/studio/export", { workspaceName: sampleProgram.name, synthesis: sampleDiscoverySynthesis, format, outputs });
  assert.equal(response.status, 200, `${format} export returned ${response.status}: ${(await response.clone().text()).slice(0, 180)}`);
  assert.match(response.headers.get("content-disposition") ?? "", new RegExp(`\\.${format}"$`));
  const buffer = Buffer.from(await response.arrayBuffer());
  const zip = await JSZip.loadAsync(buffer);
  assert.ok(zip.file(mainFile), `${format} main document is missing.`);
  assert.ok(zip.file("[Content_Types].xml"));
  console.log(`✓ Authenticated ${format.toUpperCase()} export is a native Office package (${buffer.length} bytes).`);
}
if (process.env.NORTHSTAR_VERIFY_STUDIO_AI === "true") {
  // Explicitly select the demo repository so this check never writes real program or audit data.
  cookies.set("northstar-demo", "regional-service-modernization");
  const response = await request("/api/studio/discovery-synthesis", { workspaceName: sampleProgram.name, artifacts: sampleDiscoverySources, selectedOutputs: outputs });
  const result = await response.json();
  if (!response.ok) throw new Error(`Live OpenAI generation check returned ${response.status}: ${result.error}`);
  assert.equal(result.synthesis.provider, "openai");
  assert.equal(result.synthesis.quality.status, "reviewed");
  assert.equal(result.synthesis.sourceCount, 6);
  console.log(`✓ Live OpenAI evidence review produced ${result.synthesis.stories.length} stories and ${result.synthesis.gaps.length} discovery gaps.`);
}
console.log("Studio output API smoke checks passed.");
