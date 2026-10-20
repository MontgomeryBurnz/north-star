import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (file: string) => readFileSync(new URL(`../src/components/${file}`, import.meta.url), "utf8");

test("saved handoff cards expose independent Refine and Review actions with current-revision gating", () => {
  const source = read("studio-delivery-preview.tsx");
  assert.match(source, /data-studio-lane-refine=\{story\.id\}/);
  assert.match(source, /aria-label=\{`Refine \$\{story\.id\}`\}/);
  assert.match(source, /disabled=\{disabled \|\| !currentRevision\}/);
  assert.match(source, /onRefine && view \?/);
  assert.match(source, /refiningStory && view && currentRevision && onRefine/);
  assert.match(source, /aria-label=\{`Review \$\{story\.id\}`\}/);
  assert.match(source, /Refine \$\{story\.id\} - saved package required/);
  assert.match(source, /choose Exit sample data first/);
  assert.doesNotMatch(source, /fetch\(|discovery-synthesis|paidGenerationConsent/);
  const workspace = read("studio-collaboration-workspace.tsx");
  assert.match(workspace, /workspaceView === "collaboration" && currentView\.canManage \? <StudioDeliveryPreview/);
  assert.match(workspace, /onRefine\(currentView, id, feedback\)/);
});

test("focused refinement dialog is keyboard-accessible, cancelable, blank-gated and does no generation or persistence", () => {
  const source = read("studio-refinement-dialog.tsx");
  assert.match(source, /<dialog[^>]*aria-labelledby="studio-refinement-title"[^>]*aria-describedby="studio-refinement-description"/);
  assert.match(source, /showModal\(\)/);
  assert.match(source, /feedbackRef\.current\?\.focus\(\)/);
  assert.match(source, /previousFocus\.isConnected/);
  assert.match(source, /onCancel=\{[^\n]*onClose\(\)/);
  assert.match(source, /if \(disabled \|\| !feedback\.trim\(\) \|\| submittedRef\.current\) return/);
  assert.match(source, /onPrepare\(feedback\.trim\(\)\)/);
  assert.match(source, /does not change the package, lane, or approval/);
  assert.match(source, /separate paid action that requires confirmation/);
  assert.doesNotMatch(source, /fetch\(|localStorage|sessionStorage|discovery-synthesis|onAction|paidGenerationConsent/);
});

test("preparing lane feedback lands at the matching full-package form without saving, approving, or generating", () => {
  const source = read("discovery-studio-console.tsx");
  const stage = source.slice(source.indexOf("function stageCollaborationRefinement"), source.indexOf("async function savePreparedExample"));
  assert.match(stage, /!saved\.canManage \|\| saved\.revision\.id !== saved\.headRevisionId \|\| !notes\.trim\(\)/);
  assert.match(stage, /openSavedRevision\(saved\)/);
  assert.match(stage, /setFeedbackTarget\(storyId\); setFeedbackKind\("change"\); setFeedback\(notes\)/);
  assert.match(stage, /feedbackPanelRef\.current\?\.scrollIntoView/);
  assert.match(stage, /feedbackInputRef\.current\?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(source, /Back to Delivery handoff/);
  assert.match(source, /data-studio-refinement-prepared/);
  assert.match(source, /setRefinementPrepared\(false\);\n      setSynthesis\(result\)/);
  const restore = source.slice(source.indexOf("async function restoreRevision"), source.indexOf("function openSavedRevision"));
  assert.match(restore, /setRefinementPrepared\(false\)/);
  assert.doesNotMatch(stage, /fetch\(|analyzePackage\(|requestAnalysis\(|onAction|setPendingAnalysis/);
});
