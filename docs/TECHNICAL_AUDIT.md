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
14. Every model-backed chat response uses one demand-loaded provider boundary with bounded untrusted context, history, output, timeout, no retries, deterministic local failure handling, provenance in API and conversation records, and provider-error redaction. Chat output cannot authorize a provider write.

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
- Isolated workspace administration rendering behind a retry-safe demand-loaded module while keeping every consequential mutation in the existing authenticated controller; browser QA found and fixed missing callback definitions before release.
- Replaced the eager, unbounded conversational provider call with one lazy response gateway and exhaustive deterministic failure-mode tests while preserving the existing chat response and worker-ledger contracts.
- Isolated approval and operations-ledger rendering plus approval/workspace-specific Dutch catalogs behind retry-safe demand-loaded modules. API, session, credential, approval, execution, and reconciliation authority remains in the authenticated controller, and exact operational evidence is never machine-translated.
- Isolated Forecasts and Reports rendering plus view-specific Dutch catalogs behind retry-safe demand-loaded modules. API/session access, form persistence, capacity and project-mapping mutation, report downloads, and provider authority remain in the authenticated controller.

## Remaining release risks

| Risk | State | Required closure |
| --- | --- | --- |
| Live Trello acceptance | External | Authorize a dedicated test workspace and run the critical path with reversible cards. |
| Live Mongo migration/restore | External | Test on a production-like replica and capture backup/restore evidence. |
| Code signing | External | Provide an organization-owned Windows signing certificate and secure CI signing process. |
| Deployment/rollback | Partial | Select hosting, provision secrets, run canary, and prove rollback. |
| Data subject deletion | Implemented locally | Owner-authorized export and permanent archived-workspace deletion pass unit, security, UI-wiring, and real-Mongo verification. Capture an owner-controlled hosted acceptance run before production launch. |
| Accessibility/i18n | Partial | English/Dutch shell, setup, help, command palette, primary workflow, connector marketplace, workspace administration, approval ledger, Work Signals, Forecasts, Reports, and consequential forms/modals pass catalog and targeted responsive checks. Complete an assistive-technology review before claiming conformance. |
| Desktop resources | Measured | The verified 2.3.21 package used four processes, 360.5 MB working set, 290.1 MB private bytes, and 1.688 cumulative CPU seconds in the repeatable local probe. Collect broader clean-machine traces before setting a hard budget. |
| Billing | Not applicable | No billing is required for the local-first product. |

No live credential, provider authorization, deployment, signed binary, or production backup claim is inferred from local tests.
## 2026-08-09 Work Signals technical continuation

### Finding: eager operator-only graph rendering

The initial command-center controller still parsed Work Signals and normalized graph rendering even when operators never opened that surface. The view also carried its operator localization in the eager catalog.

**Remediation:** move the renderer and its Dutch catalog behind one shared, fingerprinted, retry-safe loader. Module fetch and bounded API reads run concurrently; local filter changes do not contact the API or a provider.

**Measured result:** initial app plus localization fell from 318,418 to 294,642 raw bytes, 66,622 to 61,938 gzip bytes, and 54,323 to 50,964 Brotli bytes. The deferred module is 37,369 raw, 7,847 gzip, and 6,980 Brotli bytes.

### Finding: escaped URLs were not presentation-safe URLs

The previous graph renderer HTML-escaped evidence URLs but did not require HTTPS or reject embedded credentials before creating anchors. Escaping prevented markup injection but did not make an unsafe scheme appropriate to open.

**Remediation:** parse links through the existing safe external URL boundary and render rejected values as inert text. Added regressions for unsafe schemes and credential-bearing URLs.

### Residual risk

No local test proves authorization against real provider accounts, hosted ngrok exposure, a production restore/rollback, publisher signing, clean-machine resource behavior, or assistive-technology conformance. These remain external release gates.

## 2026-08-09 Forecasts and Reports technical continuation

### Finding: eager forecast/report rendering

Forecast, capacity, project-mapping, scenario, and report-list rendering remained in the initial controller even for operators who never opened those views.

**Remediation:** move both renderers and their Dutch catalogs behind shared-fingerprint, retry-safe loaders. Module fetch and bounded API read run concurrently, while every authenticated write/download path stays in the controller.

**Measured result:** initial app plus localization fell from 294,642 to 279,740 raw bytes, 61,938 to 58,547 gzip bytes, and 50,964 to 48,385 Brotli bytes. Forecasts and Reports total 31,512 raw deferred bytes.

### Finding: form-persistence ownership moved with markup

Approved scenario, capacity, and project-mapping form markup moved out of the controller, so the existing integration test initially no longer observed those forms.

**Remediation:** retain persistence authority in the controller through one guarded `enhanceForm` callback and verify both the deferred form allowlists and controller hook. Credential and consequential provider-action forms remain excluded.

### Residual risk

Live provider and report-export acceptance, hosted ngrok/HAI exposure, production restore/rollback, publisher signing, clean-machine resource behavior, and assistive-technology conformance remain external gates.
