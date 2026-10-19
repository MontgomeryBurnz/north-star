import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import JSZip from "jszip";
import { extractArtifactText } from "../src/lib/artifact-extraction.ts";

test("Studio page uses the discovery-to-build workspace", () => {
  const page = readFileSync(new URL("../src/app/artifacts/page.tsx", import.meta.url), "utf8");
  const studio = readFileSync(new URL("../src/components/discovery-studio-console.tsx", import.meta.url), "utf8");
  const route = readFileSync(new URL("../src/app/api/studio/discovery-synthesis/route.ts", import.meta.url), "utf8");
  assert.match(page, /DiscoveryStudioConsole/);
  assert.match(studio, /Turn discovery into build-ready product definition/);
  assert.match(studio, /Analyze discovery package/);
  assert.match(studio, /Stories, acceptance criteria, and test cases/);
  assert.match(studio, /Add missing context/);
  assert.match(studio, /data-studio-agnostic/);
  assert.match(studio, /data-studio-load-sample/);
  assert.match(studio, /sampleDiscoverySynthesis/);
  assert.match(studio, /\/api\/studio\/discovery-synthesis/);
  assert.doesNotMatch(studio, /ProgramSlicer|\/api\/programs/);
  assert.match(route, /requireInternalWorkspaceRouteAccess/);
  assert.match(route, /standalone: true/);
});

test("sample program is isolated, discoverable, and opens in Studio", () => {
  const page = readFileSync(new URL("../src/app/sample-program/page.tsx", import.meta.url), "utf8");
  const experience = readFileSync(new URL("../src/components/sample-program-experience.tsx", import.meta.url), "utf8");
  const navigation = readFileSync(new URL("../src/components/site-nav.tsx", import.meta.url), "utf8");
  const programHub = readFileSync(new URL("../src/components/program-workspace.tsx", import.meta.url), "utf8");
  const sampleData = readFileSync(new URL("../src/data/sample-program.ts", import.meta.url), "utf8");

  assert.match(page, /requireInternalWorkspacePage\("\/sample-program"\)/);
  assert.match(experience, /data-sample-program/);
  assert.match(experience, /Safe sample environment/);
  assert.match(experience, /\/artifacts\?sample=/);
  assert.match(navigation, /Sample.*\/sample-program/);
  assert.match(programHub, /data-sample-program-entry/);
  assert.match(sampleData, /Regional Service Request Modernization/);
  assert.match(sampleData, /acceptanceCriteria/);
  assert.doesNotMatch(experience, /\/api\/programs/);
});

test("artifact extraction supports CSV discovery evidence", async () => {
  const extraction = await extractArtifactText(Buffer.from("Capability,Pain Point\nOrdering,Manual re-entry"), "csv");
  assert.equal(extraction.extractionStatus, "extracted");
  assert.match(extraction.extractedText ?? "", /Manual re-entry/);
});

test("artifact extraction reads shared-string XLSX worksheets", async () => {
  const zip = new JSZip();
  zip.file("xl/sharedStrings.xml", "<sst><si><t>Capability</t></si><si><t>Order management</t></si></sst>");
  zip.file("xl/worksheets/sheet1.xml", '<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row></sheetData></worksheet>');
  const extraction = await extractArtifactText(await zip.generateAsync({ type: "nodebuffer" }), "xlsx");
  assert.equal(extraction.extractionStatus, "extracted");
  assert.match(extraction.extractedText ?? "", /Capability \| Order management/);
});
