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

## Remediations in this release

- Added `npm run doctor` and a redacted JSON variant for runtime prerequisite checks.
- Added `/ready` with demo/live, database, initialization, critical-path, and write-stop state.
- Added `SNEUP_PROVIDER_WRITES_DISABLED`, checked before policy resolution or execution claim, with a persisted denial audit event.
- Added a redacted support bundle that excludes logs, user data, environment values, tokens, and connection strings.
- Added Linux quality gates and a Windows installer job in GitHub Actions.
- Added the production traceability, security, acceptance, API/UI audit, runbook, and verification documents required by the governing prompt.

## Remaining release risks

| Risk | State | Required closure |
| --- | --- | --- |
| Live Trello acceptance | External | Authorize a dedicated test workspace and run the critical path with reversible cards. |
| Live Mongo migration/restore | External | Test on a production-like replica and capture backup/restore evidence. |
| Code signing | External | Provide an organization-owned Windows signing certificate and secure CI signing process. |
| Deployment/rollback | Partial | Select hosting, provision secrets, run canary, and prove rollback. |
| Data subject export/deletion | Partial | Add owner-authorized workspace export and deletion workflows before hosted multi-tenant release. |
| Accessibility/i18n | Partial | Complete assistive-technology review and Dutch copy catalog before claiming conformance. |
| Billing | Not applicable | No billing is required for the local-first product. |

No live credential, provider authorization, deployment, signed binary, or production backup claim is inferred from local tests.
