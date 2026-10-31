# Studio managed workflow (PoC)

Studio keeps the complete generated output snapshot separate from revision-linked
human workflow records. These features do not call AI or public research services.

## Entry points

Open **Studio > Delivery handoff**, select a saved package, then use:

- **Managed gaps**: assign an active internal owner, explicitly link affected
  stories, attach readable source references, and record a decision. Resolving a
  gap requires supporting evidence and a recorded answer. Assignment does not
  grant the assignee access to the package.
- **Saved refinements**: save/edit a draft, submit a refinement for review, or
  record an internal response. Drafts do not change lanes. Submission places the
  story on a review hold. Recording a response does not change the output or
  release that hold. A corrected output revision and human review remain needed.
- **Revision history > Compare saved revisions**: choose a baseline to inspect
  exact additions, removals, and changed fields across the full output package,
  source evidence, managed gap decisions, and saved refinements. No similarity or
  quality claims are inferred by the comparison.

The **Refine** dialog on saved story cards now supports **Save refinement**.
**Prepare refinement in Studio** saves the draft before opening the full package.
The existing item-review preparation action also saves feedback first. Preparing
feedback from a saved refinement reopens the latest stored revision before staging
it. Saved gap answers and their source/impact references are included as human
context for review, not treated as verified facts or automatic closure. Oversized
context is rejected before preparation rather than silently truncated.

## Readiness and history

- A linked, unresolved blocking gap holds its explicitly affected stories.
- Changing a linked gap's decision or impact scope clears existing approval for
  the old and new affected scope. Closure never silently restores approval.
- Generated `needs-input` remains `needs-input` after recording a decision.
- Refinements, gap decisions, and event history remain pinned to their revision.
- New output revisions start fresh approvals and unresolved gap states. Existing
  gap owners and still-valid story links carry as review leads, not closure.
- Prior revisions remain read-only for workflow changes; their records survive.
- Other than normal review metadata, these actions never overwrite the synthesis,
  sources, roadmap, epics, features, stories, acceptance criteria, or tests.
- Office exports continue to use the full saved output snapshot. Managed decisions
  do not silently rewrite the original gap list or exported requirements.

## Access and persistence

Only the package owner or an internal administrator can manage these records or
compare full revisions. Contractors retain exact-revision/item sharing and can
use their existing shared comments/change requests. Private managed gaps, draft
bodies, responses, event history, and source comparison are excluded from shared
DTOs; submitting an internal refinement exposes only a generic review-hold note.
Explorer remains sample-only and cannot access saved package APIs or mutations.

Data is additive within the existing server-only `studio_packages.record` JSONB
aggregate; no new table, grant, account role, or database migration is required.
Existing row locks and expected-version checks prevent stale writes. Owners are
resolved from active registered identities on the server, not trusted from names
or status fields supplied by a browser. Existing packages derive empty workflow
defaults without changing their immutable output snapshots.

## Verification / no paid calls

Tests use the saved fictional discovery package, deterministic revision fixtures,
synthetic identities, actual route function bodies and a locked database double.
They cover reopen/serialization, stale/concurrent writes, source/impact validation,
role isolation, approval invalidation, history preservation, full-package export
preservation, exact revision differences, and guarded preparation of saved context.

An isolated localhost UI checkout uses only saved fictional outputs, file-backed
QA records and synthetic identity boundaries. It has no production credentials;
provider routes are blocked. It is not a production authentication/database test.
The application persistence boundary is tested separately with transaction doubles.
No production data or paid model generation is needed for these checks.

This iteration saves refinement requests and gap decisions; it does not add a
manual editor for generated requirements or connect Jira/ADO. Updating generated
outputs still uses the separately confirmed generation workflow. Nothing here
automatically calls a model or claims that a resolved gap is development approval.
