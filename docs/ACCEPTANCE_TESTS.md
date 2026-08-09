# Acceptance Tests

| ID | Workflow | Automated evidence | Manual/live evidence | Status |
| --- | --- | --- | --- | --- |
| A01 | Fresh install and demo start | Installer build; desktop tests; doctor tests | Install unsigned build on clean Windows 11 VM | Automated pass, VM pending |
| A02 | Live startup rejects insecure configuration or database outage | `securityConfiguration.test.js`, `runtimeDiagnostics.test.js`, `startupPolicy.test.js` | Packaged forced-outage dialog and closed port | Pass locally; hosted live pending |
| A03 | Workspace and role isolation | `workspaceInviteService.test.js`, `security.test.js` | Two real user sessions | Automated pass, live pending |
| A04 | Trello connect and bounded sync | connector/sync tests | Dedicated Trello test account | Automated pass, provider pending |
| A05 | Detect risk and create evidence-backed recommendation | intervention and recommendation tests | Confirm against synced test board | Automated pass, provider pending |
| A06 | Approval snapshot and expiry | `approvalExpiry.test.js`, `security.test.js` | Review current payload in command center | Pass |
| A07 | Single provider write | atomic claim and ledger tests | Execute one reversible Trello action | Automated pass, provider pending |
| A08 | Emergency stop | `runtimeDiagnostics.test.js`, `security.test.js` | Set flag, restart, confirm `/ready` degraded and write denied | Pass locally |
| A09 | Ambiguous write reconciliation | reassignment and reconciliation tests | Simulate partial provider failure | Automated pass |
| A10 | Follow-up and outcome learning | follow-up/outcome/learning tests | Observe delayed synced evidence | Automated pass, elapsed live run pending |
| A11 | Connector read-only guarantee | adapter tests and safety profiles | Provider consent review | Pass for code; consent external |
| A12 | Notifications require explicit policy | notification tests | Verified sender and destination | Automated pass, delivery pending |
| A13 | Redacted support evidence | `runtimeDiagnostics.test.js`; `npm run support:bundle` | Inspect generated JSON | Pass locally |
| A14 | CI and installer | `.github/workflows/ci.yml` | Green GitHub run and installer artifact | Pass: 2.3.6 source `2e1f767b287ff572962d583b19f74b676a84718d`, run `31302533822`, artifact `9034945692` (`sneup-windows-installer-unsigned`) |
| A15 | Multi-instance background work | `jobLease.test.js`; disposable MongoDB 7 simultaneous race | Run two hosted Sneup instances against one workspace | Local real-Mongo pass; hosted evidence pending |
| A16 | Versioned API and HAI contract | `apiContract.test.js`; live demo HTTP matrix | Call `/api/v1` through deployment ingress and correlate a support request ID | Pass locally; hosted ingress pending |
| A17 | Optional workload canary and rollback | `featureFlagService.test.js`; 40-collection disposable MongoDB migration verifier; live demo API/HAI smoke | Manager pauses, stages, and restores one hosted optional capability while another session observes the same revision | Automated and local real-Mongo pass; hosted manager acceptance pending |

Production acceptance requires all pending live cells to be executed with organization-owned accounts. Demo data is not evidence of live-provider success.
