# Codex Worklog

## 2026-08-08 governing prompt implementation

- Verified the 124-page source PDF and extracted all 116 named phases.
- Confirmed baseline branch, commit, remote, existing dirty/untracked user artifacts, package scripts, route/model/service/test inventory, and existing production controls.
- Identified operational gaps: no self-diagnostic command, no readiness endpoint, no deployment-wide provider-write stop, no redacted support bundle, no CI workflow, and missing required traceability documents.
- Implemented the doctor/readiness/write-stop/support-bundle services with focused tests.
- Added an audited emergency-stop denial before policy resolution and atomic execution claim.
- Added Linux test/lint/evaluation/audit gates and a Windows installer build job.
- Added the required audit, acceptance, security, runbook, task graph, checkpoint, completion, and verification documents.

This worklog records local engineering evidence. Live Trello, production MongoDB, code signing, hosting, and provider consent are not claimed.

## 2026-08-09 production lifecycle continuation

- Re-audited the active objective against the current pushed worktree and the Trello operations-ledger specification.
- Added an owner-only, streamed NDJSON workspace export that walks collections sequentially with bounded cursors instead of buffering a workspace in memory.
- Added recursive export redaction and made connector credential ciphertext opt-in at the Mongoose query boundary.
- Blocked every provider write when its workspace is suspended, archived, or missing, before workspace policy resolution or execution claim.
- Corrected the JobRun schema so scheduled security/retention work can persist observability evidence.
- Added focused export, credential-selection, UI wiring, and archived-workspace execution regressions.
- Found and fixed a packaged-only Windows startup failure caused by development console logging writing to a detached pipe; packaged builds now select production file logging before server modules load.
- Rebuilt and launched the 2.2.0 package, confirmed the real command-center window and loopback health endpoint remain available, recorded four idle processes at about 410 MB total working set, and verified a normal window close releases port 3197.
- The in-app Browser backend was available but its webview failed to attach twice, so 2.2.0 in-app Browser rendering remains an explicit evidence gap rather than a claimed pass.

## 2026-08-09 privacy and runtime continuation

- Added owner-confirmed permanent deletion for archived workspaces with a protected deleting state, minimal receipt, lease recovery, bounded retry, and five delayed late-write sweeps.
- Moved export and deletion onto one registry covering every workspace-scoped model; the suite fails when a future workspace model is omitted.
- Verified actual deletion against a disposable MongoDB 7 database seeded across all 39 registered collections, then dropped the verification database and removed its isolated container.
- Made every Mongoose model reload-safe after the security suite exposed an older Learning model recompilation warning.
- Demand-loaded Natural NLP, removed one unused NLP import, and changed routine request logging to retain only rejected, failed, and slow requests by default.
- Fixed the static-root/API conflict by serving machine-readable product capabilities at `/api` and proving both `/` and `/api` over a live Express listener.
- Retried the explicitly requested in-app Browser; its webview still did not attach, so current rendered Browser evidence remains pending.
- Updated the GitHub workflow to the official Node 24 action runtimes and verified clean Linux quality plus Windows installer artifact upload in run `31293249661`.

## 2026-08-09 migration completeness continuation

- Found that workspace migration still used a stale 30-model inventory while export and deletion used the complete 39-collection lifecycle registry.
- Replaced the duplicated migration inventory with the shared registry and added a regression that names the nine previously omitted identity, token, notification, capacity, webhook, and connector-signal collections.
- Added a database-name-guarded MongoDB verifier; it seeded 39 legacy unscoped records, found all 39 during preflight, backfilled all 39, verified none remained unscoped, dropped the database, and removed its disposable container.
- Raised the supported server minimum to Node.js 22, moved CI execution to Node.js 24 LTS, and corrected the obsolete Node.js 14/MongoDB 4 setup guidance.
- Passed 81 suites/670 tests, lint, 5/5 recommendation evaluation, both zero-vulnerability audits, production secret verification, 2.3.1 Windows packaging, packaged HTTP/HAI/readiness checks, normal command-center close, and installer-dialog close.
- Retried the in-app Browser on two fresh tabs; its backend connected but the webview did not attach, so current visual evidence remains explicitly pending.
