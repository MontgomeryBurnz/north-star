import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createStudioGenerationConsent, hasStudioGenerationConsent } from "../src/lib/studio-generation-consent.ts";

test("explicit versioned consent must match the external reference choice", () => {
  for (const externalResearch of [false, true]) {
    assert.equal(hasStudioGenerationConsent({ externalResearch, paidGenerationConsent: createStudioGenerationConsent(externalResearch) }), true);
    assert.equal(hasStudioGenerationConsent({ externalResearch, paidGenerationConsent: createStudioGenerationConsent(!externalResearch) }), false);
  }
  for (const invalid of [null, [], true, "yes", {}, { paidGenerationConsent: true }, { paidGenerationConsent: { version: 1, confirmed: true } }]) {
    assert.equal(hasStudioGenerationConsent(invalid), false);
  }
  assert.equal(hasStudioGenerationConsent({ paidGenerationConsent: createStudioGenerationConsent(false) }), true);
  assert.notEqual(createStudioGenerationConsent(false), createStudioGenerationConsent(false), "No shared mutable consent object");
});

test("all Studio generation entry points require fresh confirmation; exports remain separate", () => {
  const source = readFileSync(new URL("../src/components/discovery-studio-console.tsx", import.meta.url), "utf8");
  assert.equal((source.match(/onClick=\{\(\) => requestAnalysis\(/g) ?? []).length, 3);
  assert.doesNotMatch(source, /onClick=\{\(\) => (?:void )?analyzePackage/);
  assert.match(source, /onConfirm=\{[^\n]*createStudioGenerationConsent\(externalResearch\)/);
  assert.match(source, /useState\(false\);\n  const \[pendingAnalysis/);
  const open = source.slice(source.indexOf("function openSavedRevision"), source.indexOf("function stageCollaborationRefinement"));
  assert.match(open, /setExternalResearch\(false\)/);
  assert.doesNotMatch(open, /setExternalResearch\(revision\.externalResearch\)/);
  const restore = source.slice(source.indexOf("async function restoreRevision"), source.indexOf("function openSavedRevision"));
  assert.match(restore, /setExternalResearch\(false\)/);
  const exports = source.slice(source.indexOf("async function exportPackage"), source.indexOf("function clearWorkspace"));
  assert.doesNotMatch(exports, /generateStudioPackage|paidGenerationConsent|discovery-synthesis/);
});

test("confirmation has accessible modal semantics, cancellation and unchecked one-operation approval", () => {
  const source = readFileSync(new URL("../src/components/studio-generation-confirmation.tsx", import.meta.url), "utf8");
  assert.match(source, /<dialog[^>]*aria-labelledby="studio-paid-title"[^>]*aria-describedby="studio-paid-description"/);
  assert.match(source, /showModal\(\)/);
  assert.match(source, /cancelRef\.current\?\.focus\(\)/);
  assert.match(source, /onCancel=\{[^\n]*onCancel\(\)/);
  assert.match(source, /\[acknowledged, setAcknowledged\] = useState\(false\)/);
  assert.match(source, /disabled=\{!acknowledged\}/);
  assert.match(source, /if \(!acknowledged \|\| submittedRef\.current\) return/);
  assert.match(source, /hard spending cap are not available/);
  assert.doesNotMatch(source, /localStorage|sessionStorage|fetch\(/);
});
