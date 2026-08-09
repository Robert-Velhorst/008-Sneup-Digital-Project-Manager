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

## 2026-08-09 contextual help continuation

- Re-audited the governing operations-ledger specification and current completion matrix after the verified 2.3.13 release; the remaining high-priority production gates require owner infrastructure or live provider consent.
- Added a standalone static help module covering all eight command-center views, setup/live readiness, decision safety, and privacy/data control, with direct handoffs into existing local workflows.
- Added contextual opening from the compact Help control or `F1`, bounded local search, labelled modal semantics, focus containment/restoration, Escape/backdrop close, and narrow-screen stacking.
- Kept the catalog out of browser storage, API traffic, database work, provider traffic, polling, and the main 6,500-line command-center module; its hidden DOM is not built until help first opens.
- Added ten focused jsdom tests for catalog completeness, context fallback, search, keyboard/focus behavior, safe routing, static integration, and browser-script initialization.
- In-app Browser QA passed the Forecasts context, local search, Decision Safety topic, Approvals handoff, desktop and narrow layouts, viewport containment, focus placement, and zero current console errors.
- Final local quality passed 103 suites/789 tests, 5/5 recommendation evaluation, two zero-vulnerability audits, purpose-separated release-secret verification, source scans, and three repeat startup profiles with no Mongoose load in demo mode.
- Built and verified the unsigned `Sneup-Setup-2.3.14.exe`: 109,453,766 bytes, SHA-256 `1F55E031B6079FEC3CF56992C4578BBD23893EEC3A84F21449BB5ADB8B672F79`. Four packaged processes settled to 356.7 MB working set and 289.2 MB private memory, then closed normally and released the loopback port.

## 2026-08-09 bounded form persistence continuation

- Added a standalone browser module for workspace-scoped session drafts and capped named presets, wired only to reviewed forecast, capacity, project-mapping, retention, rollout, and internal policy forms.
- Excluded credentials, invitations, notification destinations, provider-action payloads, reconciliation evidence, worker responses, destructive confirmations, and safety-relaxation confirmation from persistence; a defense-in-depth field-name filter rejects these categories even if requested.
- Bound field/value/record/name/preset counts, failed closed on malformed or unavailable storage, fixed workspace scope at form-open time, and clear drafts only after confirmed API success.
- Added jsdom coverage for storage, controls, browser bootstrap, workspace isolation, corruption, limits, and sensitive-form exclusions.
- Used a dedicated disposable MongoDB database for in-app Browser QA: draft save, preset save/apply, cancel/reopen restore, API-save cleanup, and mobile stacking passed with no current console errors; the database and both preview processes were removed afterward.
- Published exact source `72e25a5bcba8a92b424239051529a21c1acd68b0`; GitHub run `31314387786` passed Node 24 quality in 59 seconds and Windows packaging in 2 minutes 19 seconds. Artifact `9038323202` was downloaded and independently verified as one unsigned 2.3.13 installer.

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

## 2026-08-09 workspace data retention continuation

- Added an owner-only, disabled-by-default retention policy with bounded windows for terminal jobs, board-health snapshots, performance history, finalized notification receipts, and revoked or expired credentials.
- Added preview and policy APIs, an exact-workspace manual confirmation, a rotating bounded workspace worker, shared distributed lease protection, compound cleanup indexes, and pre/post high-risk audit evidence for every category batch.
- Preserved audit events, approvals, recommendations, Trello action attempts, active credentials, pending deliveries, and current project/work-graph records. A failed pre-delete audit prevents the delete and each batch re-applies its workspace, state, cutoff, and exact-ID conditions.
- Passed lint, 91 suites/721 tests, 5/5 recommendation evaluation, two zero-vulnerability audits, five-secret production verification, and a disposable MongoDB proof with six deletions, six protected records, six audit pairs, and seven indexes. The measured preview took 35.09 ms and the six audited batches 936.39 ms at 94.1 MB verifier RSS.
- Live browser QA previewed two due records, opened both policy and exact-slug confirmation states, pruned 2/2 disposable records, and rescanned to zero with no console warnings, horizontal overflow, or mobile modal overlap.
- Built the final `Sneup-Setup-2.3.7.exe`, 109,437,557 bytes, unsigned, SHA-256 `49FDDB4A27C250FFDD23586E71AB37A1F7FD332CF5AACA2662C2AE42471E8087`. Its 65,833,187-byte archive contains the retention UI/API/worker code and Windows x64 ngrok binding. Packaged demo smoke, HAI `never_direct` verification, a flat four-process idle sample, and clean port release passed.
- Published source commit `fd2bc329d9c07e232a742c6176e8e65ed8494c49`. GitHub run `31305480486` completed with zero annotations: Node.js 24 quality in 58 seconds and Windows installer plus artifact upload in 2 minutes 10 seconds.
- Artifact `9035818760` (`sneup-windows-installer-unsigned`) has GitHub archive digest `sha256:37381444bb9fcea1c84e6f03848cd5ac57bcd4eb2492d71ebb69dec66fc2f844`. Its single downloaded installer is 109,437,595 bytes, unsigned, reports version 2.3.7, and has SHA-256 `0B20508B15CF74A1C8BBD4ACE2ACC231E5086A524D95FAD9C6C96CE130C8846D`.

## 2026-08-09 OAuth renewal and Adobe Libraries continuation

- Re-audited the Trello operations-ledger objective and preserved the existing rule that all provider writes remain approval-gated. Found that OAuth connector sync had no access-token renewal path, so scheduled reads would fail after initial token expiry.
- Added encrypted OAuth refresh-token rotation under an atomic, expiring connector-account lease. A durable start audit must succeed before the fixed-host provider call; completion and bounded failure evidence contain no tokens or provider response bodies. Concurrent Sneup processes adopt the winning token instead of issuing a duplicate refresh.
- Replaced the stale Adobe Creative Cloud catalog-only entry with a reviewed OAuth connector for the current Creative Cloud Libraries API. It reads at most 100 fixed-host metadata records, retains only redacted names, opaque IDs, and timestamps, and excludes elements, assets, files, renditions, collaboration, people, links, storage details, comments, and all provider writes.
- Passed lint, 93 suites/732 tests, 5/5 recommendation evaluation, two zero-vulnerability dependency audits, five-secret production verification, tracked-file secret-pattern scanning, focused refresh contention and malformed-response tests, and packaged demo/version/Adobe/HAI checks.
- The final local `Sneup-Setup-2.3.8.exe` is 109,439,937 bytes, unsigned, SHA-256 `D7630BBA8DD6137143EA072CA1CF75FE42DF80F6B0FAD8B5F9EAF2FDAB8EFD05`. Its 65,852,931-byte archive includes the renewal and Adobe code, the executable reports 2.3.8, and the installer process opened and closed without installation.
- The packaged demo used four processes, 412.1 MB working set, 375.1 MB private memory, and 2.562 cumulative CPU seconds after 30 seconds. Adobe remains lazy and adds about 64 KB RSS after the shared connector stack is loaded. Packaged and installer processes closed and port 3199 was released.
- Published source commit `988f9a8f3abed7ec39b2b5718d5a67d8479c6f37`. GitHub run `31307217856` completed with zero annotations: Node.js 24 quality in 54 seconds and Windows installer plus artifact upload in 2 minutes 16 seconds.
- Artifact `9036334669` (`sneup-windows-installer-unsigned`) has GitHub archive digest `sha256:8edad301ab6f0ed809c6d72e1d77296cee42579aed80f074079114f17f7ceed0`. Its single downloaded installer is 109,440,023 bytes, unsigned, reports version 2.3.8, and has SHA-256 `D8E96FB7B82C7756C99D3C014F82E3E8EA71C445A695F6EB259BA485BD21E96B`.

### 2026-08-09 - Exact Trello dependency evidence and 2.3.9 release

- Replaced description-title blocker guesses with exact official Trello card short-link evidence, persisted stable card and attachment identifiers, and added graph aliases so full and short Trello identifiers resolve to the same work item.
- Reduced core and connector Trello card reads to attachment link metadata and selected member fields; no attachment preview/body data or provider write was added.
- Passed lint, 94 suites/738 tests, 5/5 recommendation evaluation, two zero-vulnerability dependency audits, five-secret production verification, and a zero-finding tracked non-fixture secret scan.
- The local `Sneup-Setup-2.3.9.exe` is 109,440,956 bytes, unsigned, SHA-256 `F011C6F19BEA4C8489FBADA0B70E25CBFD402390730FDE0871799FBF7BE19EFB`. The packaged four-process demo sampled 370.9 MB working set, 323.0 MB private memory, and 3.156 CPU seconds after 30 seconds, closed normally, and released port 3209.
- Published source commit `8a430c30ecfb1cd5cda729a5fb0689d508b8e1df`. GitHub run `31308308438` completed with zero annotations: Node.js 24 quality in 49 seconds and Windows installer plus artifact upload in 2 minutes 17 seconds.
- Artifact `9036645854` (`sneup-windows-installer-unsigned`) has GitHub archive digest `sha256:f7e5b0c33ae74fc530deb824ccc321eea2702daf6157cf95a59ba10985fdcf9c`. Its single downloaded installer is 109,440,523 bytes, unsigned, reports version 2.3.9, and has SHA-256 `50BFA7B5D711E1FD4BBC3A363BDF1BF9CFFBC6D52697AC013A995A9902D8208E`.
### 2026-08-09 - Runtime remediation, redacted desktop support, and 2.3.10 local release

- Added one authenticated eight-check runtime troubleshooting contract and joined it to demo/live setup with exact remediation, refresh, connector handoff, and labelled dialog semantics. The desktop exposes one bounded IPC action that atomically writes a configuration-only support file under Electron user data and returns only its filename.
- Added focused service/API/UI/desktop regressions and a repeatable Windows packaged-runtime verifier. The verifier refuses an existing session or occupied port, checks product metadata, redacted diagnostics, HAI `never_direct`, samples the complete Sneup process group, requests a normal close, and confirms port release.
- Passed lint, 97 suites/745 tests, 5/5 recommendation evaluation, both zero-vulnerability dependency audits, zero-finding tracked secret and shipped-marker scans, and positive five-secret production release verification. In-app Browser QA passed the setup flow at desktop and narrow mobile breakpoints with no overlap, horizontal overflow, or console warnings/errors.
- Built local `Sneup-Setup-2.3.10.exe`, 109,443,541 bytes, unsigned, version 2.3.10, SHA-256 `B935C2D4992BB159212680C7B48D6D4FC424A2E2927C3FDB9CB7EE057119AA37`. The packaged four-process demo sampled 392.4 MB working set, 338.7 MB private memory, and 2.656 CPU seconds after 30 seconds, retained eight redacted checks and HAI `never_direct`, closed normally, and released port 3213.
- Published source commit `5bf29b79f1b7779d243ea4812ff53b09fe103e28`. GitHub run `31309758407` completed successfully: Node.js 24 quality in 1 minute 8 seconds and Windows installer plus artifact upload in 1 minute 58 seconds.
- Artifact `9037035047` (`sneup-windows-installer-unsigned`) is 109,449,397 bytes with archive digest `sha256:7933205589ee2678c403c07e228f9b8afed0937a296038b56694c6ffd31a8f57`. Its single downloaded installer is 109,443,477 bytes, unsigned, reports version 2.3.10, and has SHA-256 `6B87407EC9CE0BC73790056F1AA5E58CA69DAE2FC1A3FFBEFAF7F32C517BCB40`.

### 2026-08-09 - Demand-loaded runtime and 2.3.11 local release

- Profiled the cold server and found that every route, Mongo model, Trello service, analytics engine, and worker loaded before the health endpoint could answer. The baseline cold import took about 17.5 seconds, loaded 1,353 modules, and used 121.6 MB RSS in this local environment.
- Added one-time lazy route and service boundaries while preserving every versioned and legacy path. Explicit demo health and overview paths now avoid MongoDB, live-only migration and worker code still loads before live operations begin, and shutdown only touches workers that were loaded.
- Split the lightweight Generic Webhook body policy from its database execution service and deferred live dependencies in mission control, the operations brief, Job Health, HAI metadata, feature flags, credential resolution, and manual job handlers.
- Added `npm run profile:startup` plus regression guards for shared router caching, first-load error forwarding, and a Mongo-free demo overview. The repeatable profile imported 251 modules in 763.9 ms at 69.1 MB RSS and served health plus the initial overview in 180.7 ms at 73.9 MB RSS without loading MongoDB.
- Passed lint, 99 suites/749 tests, 5/5 recommendation evaluation, two zero-vulnerability dependency audits, production secret separation, security-focused 402-test verification, and live in-app Browser refresh QA with no visible failure, overflow, warning, or error.
- Built local `Sneup-Setup-2.3.11.exe`, 109,444,137 bytes, unsigned, SHA-256 `A5DB98E13F7840172DF70B580DCB3A573A4AB497D64D68BCB85FB313590EC53C`. The executable reports 2.3.11.0.
- The packaged four-process demo retained eight redacted diagnostics and HAI `never_direct`, sampled 356.0 MB working set, 291.7 MB private memory, and 2.047 cumulative CPU seconds after 30 seconds, closed normally, and released its port. Compared with 2.3.10, this sample is 9.3% lower working set, 13.9% lower private memory, and 22.9% lower CPU.
- Published source commit `070e7789e30bd6e5068180ac72900804c33bbd4f`. GitHub run `31311350371` completed successfully: Node.js 24 quality in 57 seconds and Windows installer plus artifact upload in 2 minutes 45 seconds.
- Artifact `9037493770` (`sneup-windows-installer-unsigned`) is 109,450,087 bytes with archive digest `sha256:42e637b2b55c4c103d310e34f2763d269c648771d1c1325dde51b271489c26e6`. Its single downloaded installer is 109,444,145 bytes, unsigned, reports version 2.3.11, and has SHA-256 `3705C133BE3B713B086D8E905997CB1AD96E16393AC834C3E61645F18A8AE64D`.

### 2026-08-09 - Deterministic AI resilience and 2.3.12 local release

- Audited the complete model call surface and replaced the eager direct OpenAI call with one demand-loaded gateway. Context, history, output, timeout, and retries are bounded; absent credentials, initialization/auth/rate-limit/timeout/outage failures, malformed replies, and oversized replies all return deterministic local responses with explicit provenance.
- Provider error bodies and prompts are excluded from logs. Conversation metadata records provider versus deterministic mode, while the existing response field and user-intent-driven worker ledger bridge remain compatible. Chat output cannot approve or execute a provider write.
- Added focused gateway, API-contract, lazy-dependency, provenance, and ledger regressions. Full verification passed 101 suites/765 tests, lint, 5/5 recommendation scenarios, two zero-vulnerability dependency audits, five-secret production separation, and zero-finding source scans.
- The repeatable startup profile imported 251 modules in 422.0 ms at 70.6 MB RSS and served the initial overview in 112.3 ms at 75.4 MB RSS without MongoDB. Offline chat did not load OpenAI; loading that deferred SDK afterward added 122 modules, 6.0 MB RSS, and 4.65 seconds in the cold local sample.
- Browser QA passed the overview, approvals ledger, and 117-card connector marketplace without visible failure, horizontal overflow, console warning, or console error.
- Built local `Sneup-Setup-2.3.12.exe`, 109,445,733 bytes, unsigned, SHA-256 `4633D51C277CBF462163A915694D2BC1B1D82A8E2F2D242335A032E1D13D0C60`. The four-process package used 357.6 MB working set, 290.0 MB private memory, and 1.438 CPU seconds after 30 seconds, retained eight redacted diagnostics and HAI `never_direct`, closed normally, and released its port.
- Published source commit `b4aaf365ba40d825c1825ff74807ebf29f08f2ae`. GitHub run `31312592810` completed successfully: Node.js 24 quality in 61 seconds and Windows installer plus artifact upload in 2 minutes 23 seconds.
- Artifact `9037819305` (`sneup-windows-installer-unsigned`) is 109,451,792 bytes with archive digest `sha256:3ec405ac02310b5344389196958ec2e2e84939b657012b5615ad790e8bec3b44`. Its single downloaded installer is 109,445,824 bytes, unsigned, reports version 2.3.12, and has SHA-256 `F105AE98192C38C897065ADD0B01869137CE766802CEA03AF986E354B23778E2`.
