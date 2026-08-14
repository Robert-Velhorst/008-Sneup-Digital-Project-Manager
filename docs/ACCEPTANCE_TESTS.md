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
| A09 | Ambiguous write reconciliation | `trelloClientSafety.test.js`, `trelloWriteReconciliation.test.js`, `trelloExecutionAmbiguity.test.js`, reassignment, and reconciliation tests | Simulate an accepted write with a lost provider response | Automated pass; provider simulation pending |
| A10 | Follow-up and outcome learning | follow-up/outcome/learning tests | Observe delayed synced evidence | Automated pass, elapsed live run pending |
| A11 | Connector read-only guarantee | adapter, OAuth renewal, contention, malformed-response, and safety-profile tests | Provider consent review | Pass for code; consent external |
| A12 | Notifications require explicit policy | notification tests | Verified sender and destination | Automated pass, delivery pending |
| A13 | Redacted support evidence | `runtimeDiagnostics.test.js`, `runtimeTroubleshooting.test.js`, `supportBundleService.test.js`; desktop IPC/UI wiring; `npm run support:bundle` | Inspect generated JSON | Pass locally |
| A14 | CI and installer | `.github/workflows/ci.yml` | Green GitHub run and installer artifact | Pass: 2.3.31 source `9c1cacc51f9b8f586a3d6a2aa25bb71813db499e`, run `31758359073`, independently checked artifact `9203646859` (`sneup-windows-installer-unsigned`) |
| A15 | Multi-instance background work | `jobLease.test.js`; disposable MongoDB 7 simultaneous race | Run two hosted Sneup instances against one workspace | Local real-Mongo pass; hosted evidence pending |
| A16 | Versioned API and HAI contract | `apiContract.test.js`; live demo HTTP matrix | Call `/api/v1` through deployment ingress and correlate a support request ID | Pass locally; hosted ingress pending |
| A17 | Optional workload canary and rollback | `featureFlagService.test.js`; 40-collection disposable MongoDB migration verifier; live demo API/HAI smoke | Manager pauses, stages, and restores one hosted optional capability while another session observes the same revision | Automated and local real-Mongo pass; hosted manager acceptance pending |
| A18 | Owner-controlled data retention | `dataRetentionService.test.js`, route/worker tests, and `verify:data-retention` | Preview, configure, exact-slug prune, and zero rescan in a live disposable workspace | Automated, real-Mongo, and browser pass; hosted owner volume pending |
| A19 | Authenticated ngrok browser ingress | `ngrokTunnelService.test.js`, `ngrokCorsIntegration.test.js`, and CORS security regressions | Accept an invitation and use a session through owner-controlled reserved and ephemeral domains | Automated lifecycle and real Express preflight pass; live ngrok account pending |

Production acceptance requires all pending live cells to be executed with organization-owned accounts. Demo data is not evidence of live-provider success.
