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
- Verified the exact pushed release with zero GitHub annotations in run `31294601570`: Node.js 24 quality completed in 52 seconds and the Windows installer artifact job in 2 minutes 16 seconds.

## 2026-08-09 fail-closed startup and HAI boundary continuation

- Found that a production MongoDB outage silently changed live mode into labelled demo mode, which contradicted the operator-selected runtime and could expose a public ingress in an unintended mode.
- Added an environment-aware startup policy: production live mode now fails closed before listening, development retains its labelled demo fallback, and explicit demo mode continues without a database.
- Made partial startup cleanup stop the deletion worker, ngrok tunnel, HTTP server, and database before propagating one stable error; direct Node startup exits nonzero while Electron can handle the failure.
- Added a Windows recovery dialog with explicit `Start demo mode` and `Close Sneup` choices, safe non-secret text, persisted recovery only after the user chooses it, and clean handling when settings cannot be saved.
- The packaged HAI smoke exposed populated board/card identifiers as `"[object Object]"`; the public snapshot serializer now emits stable bounded identifiers and has direct regression coverage.
- Passed lint, 83 suites/677 tests, 5/5 recommendation evaluation, two zero-vulnerability dependency audits, and the five-secret production release check.
- Built and exercised `Sneup-Setup-2.3.2.exe`; demo metadata/readiness/HAI, forced live-outage recovery, native ngrok binding, installer window, normal close, and port release passed. The unsigned installer is 109,421,274 bytes with SHA-256 `8473A866C0CBDC58E40868E1C27B39BF0C4F4BC9A3CEC8E5B983D5D060BE7371`.
- Verified exact source commit `3ef84b0b29da3db5b53871995434d11f73224945` in GitHub run `31295756051`: Node.js 24 quality passed in 1 minute, the unsigned Windows installer artifact passed in 2 minutes 9 seconds, and both jobs reported zero annotations.

## 2026-08-09 multi-instance job lease continuation

- Audited cloud worker execution and found that scheduled overlap guards existed only inside one Node process, allowing two Sneup instances sharing MongoDB to duplicate workspace analytics, connector sync, intervention scans, notifications, retention, and performance calculations.
- Added one atomic MongoDB lease per workspace and protected job. Startup, scheduled, worker, API, and manual runs heartbeat a five-minute lease and can renew or release only with their private token; webhook events retain independent event-level concurrency.
- A contended scheduled run records bounded skipped evidence without invoking its callback. A contended manual request returns HTTP 409 instead of claiming it ran successfully. Process loss is recoverable by lease expiry.
- Job Health now reports active protected runs and skipped runs, shows the bounded skip reason, treats an active lease as running instead of stale, disables conflicting manual triggers, and excludes expired abandoned runs from the current running count.
- Verified simultaneous acquisition against disposable MongoDB 7: exactly one process won, wrong-token release failed, normal release allowed reacquisition, forced expiry allowed takeover, and private lease token/instance identity remained excluded from ordinary queries. The database and isolated container were removed after verification.
- Passed lint, 84 suites/686 tests, the 5/5 safety evaluation, two zero-vulnerability dependency audits, production secret verification, and packaged Windows demo/readiness/Job Health/HAI/fail-closed/clean-close checks.
- Built `Sneup-Setup-2.3.3.exe`, 109,423,235 bytes, unsigned, SHA-256 `CA4B1EF0F34E1EB47BC5EDBE1BA5E77A2BE61070557A5F19D764094EE9D254B6`. Four packaged processes used 408.5 MB working set, 340.3 MB private bytes, and 6.30 cumulative CPU seconds after startup plus 30 seconds idle.
- Published source commit `f45ba4e50253648fea2c1c4f40c37005701c3a80`. GitHub run `31296974370` completed with zero annotations: quality in 1m02s and Windows installer plus artifact upload in 2m39s. Artifact `9033286273` (`sneup-windows-installer-unsigned`) has GitHub archive digest `sha256:09181328ab552a79a057ff2b3ded0e97a1efd3ef7f10619cf46474e6dee5d95a`.

## 2026-08-09 versioned API and HAI continuation

- Found that route-specific JSON shapes forced the command center and HAI consumers to interpret failures inconsistently and left no stable public compatibility boundary.
- Added `/api/v1` with one `{ ok, data, error, meta }` envelope, bounded error output, and a server-generated request ID shared by response headers and sanitized request logs. Static assets skip request-ID generation.
- Routed command-center JSON calls through one versioned parser, retained streamed workspace exports and reports, preserved every legacy `/api` path, and kept external webhook/OAuth protocol paths unchanged.
- Moved the HAI manifest and raw OpenAPI 3.1 contract to versioned snapshot/proposal paths while retaining the rule that HAI cannot approve or execute provider actions.
- Passed lint, 85 suites/692 tests, the 5/5 safety evaluation, two zero-vulnerability dependency audits, positive five-secret release verification, source-security scans, and a 12-endpoint live demo HTTP matrix. The requested in-app Browser connected twice but its webview did not attach.
- An alternating 800-request metadata benchmark measured 1.453 ms legacy and 1.588 ms versioned average latency, with 2.665/2.841 ms p95. After load plus 15 seconds idle, the temporary demo server used 118.5 MB working set, 132.6 MB private memory, 3.55 CPU seconds, 13 threads, and 267 handles.
- Built and exercised `Sneup-Setup-2.3.4.exe`, 109,424,462 bytes, unsigned, SHA-256 `6FDB70E399DBD1AEB2A6B669BA370496EAA42478364D50D0056C8B505953B54B`. The packaged executable reports version 2.3.4 and includes the official Windows x64 ngrok binding.
- The packaged demo passed legacy/versioned/readiness/jobs/HAI checks with matched request IDs, then closed normally and released port 3197. Four processes used 385.6 MB working set, 307.7 MB private memory, and 3.53 cumulative CPU seconds after load plus idle.
- A forced packaged live-database outage displayed `Sneup live workspace is unavailable`, kept port 3197 closed, and exited normally. The exact installer window opened and was closed without changing the machine.
- Computer Use discovered the exact packaged window but its installed runtime failed while returning window state. Along with the in-app Browser attach failure, current rendered capture remains an explicit tool-side evidence gap.
- Published source commit `47e6d5d25078590133a066990bc602a40f4ec457`. GitHub run `31298559390` completed with zero annotations: Node.js 24 quality in 1m01s and Windows installer plus artifact upload in 2m18s.
- Artifact `9033774213` (`sneup-windows-installer-unsigned`) has GitHub archive digest `sha256:ee4a4bf8f66b1e975b63fafb67ff22c3563f26f8f64e2e93fe845248f41ca52c`. Its single downloaded installer is 109,424,851 bytes, unsigned, with SHA-256 `CFC6ADD1B21DDFE5A2B09CDC51DEBC776A7302E07950077A2E337C7465FEE46F`.

## 2026-08-09 optional workload rollout continuation

- Found that phase 058 still lacked a general persisted rollout service, leaving hosted canaries and incident rollback dependent on process-level settings.
- Added four workspace-scoped optional workload controls for connector sync, forecast scenarios, work-graph decisions, and HAI proposals. Rollouts are deterministic per declared workspace/actor subject, use optimistic revisions, retain 50 reviewable history entries, and share one 30-second cache capped at 250 workspaces.
- Live storage failures fail closed, while explicit read-only demo mode retains safe defaults. No rollout key controls authentication, permissions, approval, audit, emergency stop, workspace isolation, or provider-write authorization.
- Added manager administration controls, history review, HAI manifest/OpenAPI metadata, and consumer-side UI guards. Connector sync pauses before account and provider reads.
- Added FeatureFlag to the shared migration/export/deletion registry, duplicate-key preflight, explicit index creation, and the guarded verifier. Disposable MongoDB 7 found and backfilled all 40 collections and created the workspace/key unique index, then was removed.
- Passed lint, 86 suites/704 tests, 5/5 recommendation evaluation, two zero-vulnerability dependency audits, positive five-secret release verification, source scans, and the live versioned rollout/HAI smoke. An 80-request rollout sample averaged 4.016 ms with 5.804 ms p95; an abusive 800-request attempt was correctly rate-limited.
- Built `Sneup-Setup-2.3.5.exe`, 109,429,244 bytes, unsigned, SHA-256 `A158F9FB1AF01F9506670139E817901B3AAA0B2B3C68DCB250340E1665927383`. The packaged executable reports 2.3.5 and contains the new model, route, service, UI, HAI contract, and Windows x64 ngrok binding.
- The packaged demo passed readiness/version/rollout/HAI checks and settled to 396.0 MB working set, 304.8 MB private memory, and 2.83 CPU seconds across four processes after 30 seconds idle. Normal close released all processes and port 3197.
- Forced live-database outage kept port 3197 closed and showed the stable recovery title. The exact installer dialog opened and closed without installation. In-app Browser again failed to attach; Windows control lacked its required guidance interface, so current rendered capture remains an explicit external/tool evidence gap.
- Published source commit `2ae4f982020f1b1cdfa840bf29ee28e281edae1e`. GitHub run `31300449925` completed with zero annotations: Node.js 24 quality in 1m08s and Windows installer plus artifact upload in 2m20s.
- Artifact `9034341974` (`sneup-windows-installer-unsigned`) has GitHub archive digest `sha256:cd8ac5757c553d2714e4b03085405a5927f6d1b8913b92b5691e213633bc91c9`. Its single downloaded installer is 109,429,289 bytes, unsigned, with SHA-256 `6731019A65C3587E4360D799D66F59D1336DC56740356050782B974A3EAEF8F3`.

## 2026-08-09 data integrity repair continuation

- Replaced global Trello entity identifiers with workspace-scoped compound uniqueness, including all-workspace duplicate preflight, guarded legacy-index removal, migration tests, and disposable MongoDB 7 verification across all 40 collections.
- Added a bounded dry-run-first integrity service, versioned API, CLI, and manager administration flow. It repairs only derived list/member counters after an explicit confirmation, re-scans before atomic apply, compensates if audit storage fails, and leaves Trello ambiguity, notification claims, recommendations, and job leases review-only.
- Passed lint, 88 suites/711 tests, 5/5 recommendation evaluation, both zero-vulnerability audits, five-secret release verification, real-Mongo migration/repair checks, browser repair flows at 1440x1000 and 390x844, and packaged demo/fail-closed checks.
- Built `Sneup-Setup-2.3.6.exe`, 109,433,640 bytes, unsigned, SHA-256 `D703178EE0E7A6AC1E853997FF3052EFE11082E550F95B673B05041043244948`. Four packaged processes settled to 399.5 MB working set and 359.5 MB private memory; normal close released all processes and port 3198.
- Published source commit `2e1f767b287ff572962d583b19f74b676a84718d`. GitHub run `31302533822` completed with zero failures/annotations: Node.js 24 quality in 1m12s and Windows installer plus artifact upload in 2m17s.
- Artifact `9034945692` (`sneup-windows-installer-unsigned`) has GitHub archive digest `sha256:dcf6f2d80ef6ced46bcc097d11cda4dd2fe5ead71331cd9c46657fe89866ccad`. Its downloaded installer is 109,433,841 bytes, unsigned, reports version 2.3.6, and has SHA-256 `6863CE73CB0DD66E024E6C2C2ECF1E028556251E9156354069F3E0A5B96F8AD7`.
