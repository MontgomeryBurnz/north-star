# Explorer access

Explorer is a named, individually authenticated account type for product evaluation.
Administrators select **Explorer - Sample data, view-only** in user management;
the normal invitation and account activation flow is unchanged. No program
assignment is needed or accepted. Changing an existing account to Explorer clears
its program assignments; no other account's role changes automatically.

## Scope

- Browse Quick Start, Program Hub, Guided Plans, Studio, Client Portal,
  Client Updates, Leadership, and Knowledge with fictional sample data.
- Inspect prepared Studio summaries, evidence gaps, roadmap/backlog, stories,
  criteria, tests, and Jira/ADO delivery mapping previews.
- Choose deliverables/formats and download the server-owned fictional example.
- No uploads, extraction, edits, comments, feedback submission, new revisions,
  approvals, sharing changes, settings, live package access, paid generation,
  public research, assistant calls, or integration execution.
- Authentication, password setup/recovery, and logout remain available.

Explorer is not a replacement for Viewer, internal roles, or restricted Contractor
access. Those roles retain their existing permissions. No production users are
converted as part of the code change.

## Enforcement

The managed user record is authoritative; browser cookies and user metadata do
not grant privileges. When Supabase is configured, protected pages and non-auth
API routes require an active named account; a legacy shared site cookie alone
cannot restore access after individual authentication is removed. Explorer
login/setup clears the legacy workspace cookie instead of issuing it.
`isDemoMode` forces sample data for Explorer regardless of
the sample cookie. Editable demo-state cookies are ignored and sample persistence
throws on write. Live program predicates deny Explorer even with stale assignments.

Every non-auth API handler begins with `denyExplorerRequest`. Its explicit
allowlist admits only reviewed sample reads and the Studio export exception;
unknown endpoints are denied. GET is not assumed safe: artifact recommendation
can invoke AI, so that route is denied. The route inventory test fails if a new
handler omits the guard.

Explorer export accepts only format and deliverable selection; synthesis, title,
package/revision IDs, and other browser-submitted content are replaced with the
server-owned fictional example. No OpenAI or research service is invoked.
The client-portal sample PDF skips persisted export auditing for Explorer.

The persistent banner explains the restrictions. The UI compatibility boundary
disables existing editable controls and mutation buttons across workspaces; it
is an affordance, not the security boundary. Search, navigation, detail expansion,
view selection, output selection, and sample downloads remain available.

Normal hosting, authentication, and download traffic still consume infrastructure
resources. "No paid generation" means no AI/research/integration execution, not
an assertion of literally zero infrastructure cost.

## Verification

- Automated tests execute the real guard and blocked handler bodies with isolated
  identities. Any unexpected provider or persistence call throws.
- Tests cover active/disabled accounts, missing/forged sample cookies, stale
  assignments, forged export locators/content, and existing role behavior.
- Local running-server checks use synthetic authentication and a private-data
  canary, with no production credentials or paid providers.
- Production account invitations or role assignments are a separate administrator
  action after release; use individual invitations, not shared credentials.
