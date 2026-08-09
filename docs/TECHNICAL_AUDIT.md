# Technical Audit

## Scope and baseline

- Audited branch: `main`, baseline commit `470d0a35ca712a3c12473a5c8cccb2118092d3ed`.
- Runtime: Node.js/Express, Mongoose/MongoDB, server-rendered static command center, Electron/NSIS desktop packaging.
- Persistence ownership is workspace-scoped across identity, connectors, work graph, recommendations, decisions, actions, jobs, notifications, and audit events.
- External reads are implemented through bounded provider adapters. The only production write executor is the approval-gated Trello operations ledger.

## Confirmed strengths

1. Workspace authentication, roles, scoped API/session tokens, invitation lifecycle, and permission middleware are implemented.
2. Recommendation payload snapshots, expiring approvals, workspace policy checks, atomic execution claims, action attempts, reconciliation, follow-ups, and outcome checks form a defensible Trello write boundary.
3. Connector credentials are encrypted, OAuth state is signed, outbound hosts are constrained, reads are bounded, and sync paths reject provider writes.
4. Demo mode is explicitly labelled and read-only. It does not masquerade as a connected workspace.
5. Jobs, rate-limit metrics, response timing, audit history, and connector health are visible to authorized operators.
6. The Windows NSIS installer is reproducible and CI now builds the unsigned artifact on Windows.
7. Workspace exports are owner-only, audit-recorded, streamed with bounded cursors, and recursively strip credential material.
8. Archived-workspace deletion is owner-confirmed, exact-slug gated, resumable, registry-complete, and verified against a disposable real MongoDB database.
9. Migration, export, and deletion share one complete 40-collection workspace registry; a guarded real-Mongo verifier proves legacy preflight, backfill, and feature-flag index coverage.
10. Production live startup fails closed on database outage, cleans partially started resources, and exposes a stable Windows recovery choice without logging or displaying the connection URI.
11. Protected background jobs use expiring, heartbeating, token-bound MongoDB leases per workspace and job, preventing duplicate work when multiple Sneup processes share one database.
12. Dashboard and HAI JSON traffic uses a strict versioned API envelope with bounded failures and server-generated request correlation; protocol-specific and legacy responses remain compatible.
13. Optional workloads use workspace-scoped persisted rollout controls with deterministic subjects, optimistic revisions, bounded cache/history, reviewable audits, and live fail-closed behavior; no safety or authorization control is feature-flagged.

## Remediations in this release

- Added `npm run doctor` and a redacted JSON variant for runtime prerequisite checks.
- Added `/ready` with demo/live, database, initialization, critical-path, and write-stop state.
- Added `SNEUP_PROVIDER_WRITES_DISABLED`, checked before policy resolution or execution claim, with a persisted denial audit event.
- Added a redacted support bundle that excludes logs, user data, environment values, tokens, and connection strings.
- Added Linux quality gates and a Windows installer job in GitHub Actions.
- Added the production traceability, security, acceptance, API/UI audit, runbook, and verification documents required by the governing prompt.
- Made connector credential fields opt-in and added workspace-state enforcement before the only provider-write executor.
- Added a resource-bounded owner workspace export and corrected security-job observability persistence.
- Corrected the packaged desktop environment so production file logging is selected before application services load; this removes a startup-time detached-console `EPIPE` shutdown without muting persisted diagnostics.
- Added a non-reactivatable deleting state, minimal deletion receipts, lease recovery, delayed orphan sweeps, and shared export/deletion collection coverage.
- Made all Mongoose model exports reload-safe, moved product metadata to the reachable `/api` path, demand-loaded NLP, and reduced routine request-log disk churn.
- Removed the stale 30-model migration inventory, added guarded all-collection migration verification, and moved server/CI guidance to supported Node.js 22+ with Node.js 24 LTS in CI.
- Removed the production database-outage demo fallback, added clean startup-error propagation and Windows recovery, and corrected populated HAI identifiers at the public snapshot boundary.
- Replaced process-only scheduled-job overlap guards with reusable MongoDB leases for startup, scheduled, worker, API, and manual runs; webhook concurrency and provider-write claims remain independent.
- Added `/api/v1`, centralized frontend response parsing, request/header/log correlation, and versioned HAI discovery without changing provider callback, webhook, streamed export, report, or legacy contracts.

## Remaining release risks

| Risk | State | Required closure |
| --- | --- | --- |
| Live Trello acceptance | External | Authorize a dedicated test workspace and run the critical path with reversible cards. |
| Live Mongo migration/restore | External | Test on a production-like replica and capture backup/restore evidence. |
| Code signing | External | Provide an organization-owned Windows signing certificate and secure CI signing process. |
| Deployment/rollback | Partial | Select hosting, provision secrets, run canary, and prove rollback. |
| Data subject deletion | Implemented locally | Owner-authorized export and permanent archived-workspace deletion pass unit, security, UI-wiring, and real-Mongo verification. Capture an owner-controlled hosted acceptance run before production launch. |
| Accessibility/i18n | Partial | Complete assistive-technology review and Dutch copy catalog before claiming conformance. |
| Desktop resources | Measured | The final 2.3.3 package used four processes, 408.5 MB working set, 340.3 MB private bytes, and 6.30 cumulative CPU seconds after startup plus 30 seconds idle. Collect broader clean-machine traces before setting a hard budget. |
| Billing | Not applicable | No billing is required for the local-first product. |

No live credential, provider authorization, deployment, signed binary, or production backup claim is inferred from local tests.
