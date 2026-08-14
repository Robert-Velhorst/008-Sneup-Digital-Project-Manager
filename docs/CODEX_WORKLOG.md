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

## 2026-08-14 latest-board-health continuation

- Re-audited the 60-board operating path and found that daily brief and workspace ledger limited newest history rows before deduplicating by board. At the verified portfolio size, at least ten boards could be absent and repeated history could hide a critical board from Robert, notifications, reports, or HAI.
- Added one shared latest-per-board aggregation that scopes by workspace, uses the existing compound index, selects newest evidence before limiting, ranks critical states first, caps execution time, and populates only required board identity fields.
- A disposable 60-board/180-health-snapshot profile returned 60 unique newest boards in 17.3 ms, kept the critical board first and inside a 20-row cap, used `workspaceId_1_boardId_1_generatedAt_-1`, issued no provider writes, and dropped its dedicated database.
- The final local gate passed 124 suites/904 tests, lint, 5/5 safety evaluation, two zero-vulnerability audits, and positive five-secret production validation. Cold startup imported 254 modules in 264.4 ms at 70.6 MB RSS and kept Mongoose unloaded through Overview.
- In-app Browser rendered the critical Board Health card and ENH-033 at desktop and 390 x 844 with no horizontal overflow. HAI retained only snapshot/proposal paths, proposal approval, `never_direct`, and no approval or execution operation.
- Built and verified unsigned `release/Sneup-Setup-2.3.34.exe`, 109,492,015 bytes, SHA-256 `626687D4366379FA97700A8E0ADDA265C328C3619A870F317C9634ACC8EEEA67`. The exact CI packaged-app command passed at 371.5 MB working set, 392.4 MB private memory, and 1.484 CPU seconds; all four changed runtime modules are byte-identical inside the ASAR.

## 2026-08-14 active-work-drain continuation

- Re-audited the governing operations-ledger contract and current 2.3.32 runtime. Approval, exact payload, provider evidence, HAI read/propose, and ngrok origin controls remain intact.
- Found that cancelling a node-schedule job did not wait for a callback already in progress, workspace-deletion maintenance could overlap database teardown, and an active HTTP connection could keep process shutdown open indefinitely.
- Added tracked active-job draining, drain-aware connector/retention/deletion stops, immediate HTTP admission close, bounded forced connection teardown, database-last ordering, and redacted startup/doctor validation for the shared grace window.
- Corrected the remote-access runbook to use the implemented `SNEUP_API_KEY` setting.
- The final local gate passed 123 suites/902 tests, lint, the 5/5 safety evaluation, two zero-vulnerability audits, and positive five-secret production validation.
- Cold startup imported 254 modules in 315 ms at 70.4 MB RSS and kept Mongoose unloaded through Overview. The disposable real-Mongo 15,000-card profile measured 685.1 ms p50, 741.9 ms p95, and 406.3 MB peak RSS with bounded output, the intended index, approval required, and no provider writes.
- In-app Browser acceptance rendered nine setup checks plus ENH-032 at desktop and 390 x 844 with no horizontal overflow. HAI retained only snapshot/proposal paths, proposal approval, `never_direct`, and no approval or execution operation.
- Built and verified unsigned `release/Sneup-Setup-2.3.33.exe`, 109,490,628 bytes, SHA-256 `F397C644E8EC7BE71CCD72AA1B8F852A4EE7B3A73E7470824B1C34B1D094D32D`. The exact CI packaged-app command passed at 374 MB working set, 383.7 MB private memory, and 1.422 CPU seconds; all 15 changed runtime modules are byte-identical inside the ASAR.
- Published source `ee83ea53bcf2a019a213cc5b71bd6b2631b5c264`. GitHub run `31761836528` passed quality in 58 seconds and Windows packaging plus packaged-app launch in 2 minutes 34 seconds. Artifact `9204933068` has archive digest `sha256:c6d846baee9551c44de26f87d907eaf7b170ffd2fc57d7d4b2cfea1763165d94`; its independently downloaded installer is 109,490,671 bytes, unsigned, version 2.3.33, SHA-256 `259C80441889783AD6727B62E44E5112EB2382CD022D24769223FFB7716416A9`.

## 2026-08-14 runtime-lifecycle continuation

- Audited every live recurring workload and found that Trello, analytics, connector, intervention, performance, and notification schedules were not all stopped by application shutdown. Analytics and several workers could also duplicate jobs after repeated initialization or retain cancelled handles after stop.
- Found that a rejected `node-schedule` callback emits an `error` event; without a listener, a routine recorded provider/database failure could become an uncaught process exception. Added one bounded observer to every scheduled job without suppressing JobRun failure evidence.
- Made every schedule idempotent, cancellable, restartable, and invalid-cron fail-closed. Expanded partial-startup and ordinary cleanup across all scheduler groups, ngrok, HTTP, and MongoDB, while continuing cleanup after individual stop failures.
- Sanitized and bounded Job Health failure text before persistence. Focused lifecycle, rollback, Trello, connector, retention, and sanitizer tests pass; full release verification follows.
- The final full gate passed 120 suites/893 tests, lint, the 5/5 safety evaluation, two zero-vulnerability audits, and positive five-secret production validation.
- Cold startup imported 252 modules in 217.9 ms at 70.9 MB RSS and kept Mongoose unloaded through Overview. The disposable real-Mongo 15,000-card profile measured 1,000.8 ms p50, 1,021.1 ms p95, and 401.2 MB peak RSS with bounded output, the intended index, approval required, and no provider writes.
- In-app Browser acceptance rendered ENH-031 in the completed operations queue at desktop and 390 x 844 with no horizontal overflow. HAI retained only snapshot/proposal paths, `never_direct`, and no approval or execution operation.
- Built and verified unsigned `release/Sneup-Setup-2.3.32.exe`, 109,490,159 bytes, SHA-256 `6E672DD0AF9EF23A2B52284992217AB37D879285B24B0C2D1749E75BE871E584`. The exact CI packaged-app command passed at 372.1 MB working set, 349.8 MB private memory, and 1.234 CPU seconds; all 13 changed runtime modules are byte-identical inside the ASAR.
- Published source `8344df95e8f799c96cee5d0249ff3e48296b29c4`. GitHub run `31760069838` passed quality in 55 seconds and Windows packaging plus the packaged-app launch gate in 2 minutes 24 seconds. Artifact `9204287831` has archive digest `sha256:ab8d0ec115e61e56c369b1b1d70407a4eb04bdc94ce043e1db77f30fbf8edf26`; its independently downloaded installer is 109,490,254 bytes, unsigned, version 2.3.32, SHA-256 `99B537ACB53E5E56A45CE0151D0B396B3A790E233DA61DF2143C9E7310818176`.

## 2026-08-14 ngrok-browser-lifecycle continuation

- Re-audited the governing operations-ledger specification and current 2.3.30 release. The ledger, exact-payload approval, Trello evidence, Robert/VA/team queues, Windows package, and HAI proposal boundary remain wired; live provider and infrastructure acceptance remain external.
- Traced the documented remote invitation/session workflow through ngrok startup, CORS, static command-center delivery, public invitation acceptance, database sessions, Trello webhook callbacks, and shutdown.
- Found that ngrok discovered its origin after the CORS cache was built, but the cache neither admitted nor invalidated for that URL. Same-origin browser POSTs through the advertised tunnel could therefore fail at CORS before reaching invitation or session authentication. A closed ephemeral tunnel also left generated public/callback URLs behind, so a restart could reuse a dead Trello callback.
- Added strict listener URL validation, one shared in-progress start, dynamic exact-origin admission, tunnel-owned environment restoration, and fresh callback generation after restart. Existing API/session authentication, loopback binding, HAI limits, and provider-write approval controls are unchanged.
- Focused security, tunnel, and real Express preflight tests pass; full release verification follows below.
- The final full gate passed 117 suites/884 tests, lint, the 5/5 safety evaluation, two zero-vulnerability audits, and positive five-secret production validation.
- Cold startup imported 252 modules in 316.7 ms at 66.4 MB RSS and kept Mongoose unloaded through Overview. The disposable real-Mongo 15,000-card profile measured 685.5 ms p50, 700.7 ms p95, and 491.9 MB peak RSS, with bounded output, the intended index, approval required, and no provider writes.
- In-app Browser acceptance rendered ENH-030 in the completed security queue. A 390 px check exposed a 45 px filter overflow; the controls now reflow with equal client/scroll width while the desktop layout remains contained.
- HAI HTTP smoke retained only snapshot/proposal paths and `never_direct`. The packaged 2.3.31 app passed metadata, diagnostics, secret-redaction, HAI, clean-close, and port-release checks at 361.7 MB working set and 299.9 MB private memory.
- Built unsigned `release/Sneup-Setup-2.3.31.exe`, 109,488,324 bytes, SHA-256 `73BAEE77A86E9CE26E474DEF8660536167AAAFAAF8B72367E1F8698B79AFBF15`; changed ngrok, CORS, backlog, HTML, and CSS files are byte-identical inside the ASAR.
- Published source `9c1cacc51f9b8f586a3d6a2aa25bb71813db499e`. GitHub run `31758359073` passed quality in 1 minute 8 seconds and Windows packaging in 2 minutes 10 seconds. Artifact `9203646859` has archive digest `sha256:290774b834f6b9785566604fcdd6f50b13c87d08d1392e9517003327261ec4f0`; its independently downloaded installer is 109,488,556 bytes, unsigned, version 2.3.31, SHA-256 `2F4608960266D2A978FFA6664CA4BE7FD8454DAB0465FC574CC9EE197D5DEBB0`.

## 2026-08-14 ambiguous-Trello-write continuation

- Reconciled the governing operations-ledger contract and audited provider execution under timeouts, resets, multi-step writes, and local finalization faults.
- Found that `SNEUP_TRELLO_TIMEOUT_MS` was documented but not passed into `trello.js`, single-step ambiguous responses became ordinary failures, and checklist item faults lost evidence that the checklist already existed.
- Added a dependency-free validated Trello transport configuration, startup diagnostics, no-redirect and request/response bounds, ambiguity classification, exact partial-step evidence, and operator-visible reconciliation reasons.
- A service-level regression proves one timeout produces one provider call, leaves the recommendation claimed, saves `reconciliation.required`, and records the audit event. Definitive HTTP 400 responses remain ordinary failures.
- The full local gate passed 116 suites/878 tests, lint, the 5/5 recommendation safety evaluation, two zero-vulnerability audits, positive five-secret production validation, and a production-source dynamic-execution scan with no shipped-app finding.
- Cold startup imported 252 modules in 237.6 ms at 68.0 MB RSS and kept Mongoose unloaded through seven demo routes. The disposable real-Mongo 15,000-card profile measured 750.6 ms p50, 828.5 ms p95, 428.5 MB peak RSS, bounded 10/12/12 output, the intended compound index, approval required, and no provider writes; its database was dropped.
- In-app Browser acceptance rendered one demand-loaded Approvals module in Dutch with no desktop or effective 749 px narrow overflow and zero current console warnings/errors.
- HAI returned its 3.1.0 OpenAPI contract and bounded demo snapshot, advertised `never_direct`, exposed no approval or execution endpoint, and returned a fail-closed service-unavailable response when proposal durability required an unavailable database.
- Built and verified unsigned `release/Sneup-Setup-2.3.30.exe`, 109,487,238 bytes, SHA-256 `502DCF6BD59543A9148C3451DAC6FC8CD9E610B156220BBEE41DC6DEBBF5AA27`. The four-process packaged demo used 359.2 MB working set and 293.2 MB private memory, retained eight healthy redacted diagnostics and HAI `never_direct`, closed normally, released its port, and contained source-identical changed runtime files.
- Published source `eac5a368dba90fcda2a17d63969dc523a5bd4c13`. GitHub run `31756362949` passed quality in 56 seconds and the Windows build in 2 minutes 52 seconds. Artifact `9202903661` has archive digest `sha256:f51ff875bb0e08bad3cabd2fc75538956fa23be3b6fb86803606a10f2fee647a`; its single independently downloaded installer is 109,487,543 bytes, unsigned, reports version 2.3.30, and has SHA-256 `EC0E37E151A0FA23DC02CF47FC9579857464F626B70BEAD8618A76031573BBC5`.

## 2026-08-14 bounded-database-pool continuation

- Reconciled the complete governing operations-ledger specification against current source and confirmed that recommendation, approval, exact-payload execution, Trello-attempt evidence, Robert/VA/team queues, follow-up, audit, HAI, ngrok, and Windows boundaries remain wired.
- Found that each live process still inherited the MongoDB driver's 100-application-socket pool and unlimited wait queue. This over-reserved database capacity across Windows/cloud processes and allowed overload requests to wait indefinitely.
- Added validated per-process pool settings: 20 maximum sockets, zero idle minimum, two simultaneous connection establishments, 60-second idle retirement, five-second pool wait, and bounded connection/socket/buffer timeouts. Connection listeners now register once across reconnects.
- A disposable real-Mongo profile completed 100 concurrent reads in 115.5 ms, observed 17 peak checked-out and 19 post-attach created connections under the 20-socket cap, preserved one listener per event through reconnect, and dropped its database.
- Local quality passed 113 suites/862 tests, 5/5 recommendation evaluation, both zero-vulnerability audits, five-secret production validation, and a 15,000-card profile at 688.3 ms p50, 712.4 ms p95, and 349.1 MB peak RSS with no provider writes.
- Browser QA passed demand-loaded Workspace rendering, disabled demo mutations, desktop/mobile containment, and zero current warnings/errors. HAI manifest/OpenAPI retained only `snapshot` and approval-gated `propose`, provider writes `never_direct`, and no approval or execution endpoint.
- Built and verified unsigned `Sneup-Setup-2.3.29.exe`: 109,485,792 bytes, SHA-256 `CCBC1B7C8A7BA15F5B15DC8DEAAD4EB23A00D9303994379238ABBD88F15D95FA`. The final four-process probe used 357.5 MB working set and 290.7 MB private memory, closed normally, released the port, and retained byte-identical changed runtime/configuration files.
- Published exact source `7fd7b9ee457cc34eff877c56690e470277abf4bb`; GitHub run `31754056380` passed Node 24 quality in 1 minute 1 second and Windows packaging in 2 minutes 20 seconds. Artifact `9202090233` has archive size 109,491,734 bytes and digest `sha256:f39d8346254bc21a77f872b4160d930c41e06c7ff331e1261611720994cafbe6`; its single unsigned 2.3.29 installer is 109,485,834 bytes with SHA-256 `C573848981A5489F5ABD39EC63F7D2B468A655D904C74CC349CDB367F0149A56`.

## 2026-08-14 authentication-activity continuation

- Audited every API route against identity, workspace, permission, and external-write middleware. The only permissionless entry points remain signed provider callbacks/webhooks and one-time invitation acceptance; global API access still assigns an auditable principal.
- Found that authenticated dashboard traffic performed one API-token activity save or two session/user activity saves per request. These fields are operational presence metadata rather than immutable audit evidence.
- Kept full credential, revocation, expiry, user-status, role, permission, and workspace validation per request, while replacing blocking saves with active-record-only atomic timestamp touches every five minutes.
- Added exact query/update tests and a 100-request regression. A disposable real-Mongo run retained 100 credential reads while reducing activity writes from 200 to two, avoiding 198 writes (99%).
- Local quality passed 112 suites/855 tests, 5/5 recommendation evaluation, both zero-vulnerability audits, five-secret production validation, and a 15,000-card profile at 962.3 ms p50, 1,123.2 ms p95, and 355.7 MB peak RSS with no provider writes.
- In-app Browser passed Overview exclusion, one Workspace module load, disabled demo mutations, English/Dutch responsive containment, a correlated `200` security context, and zero current console warnings/errors.
- Built and verified unsigned `Sneup-Setup-2.3.28.exe`: 109,485,088 bytes, SHA-256 `43F1B9587E3293E35FD0BD7C369CFB660063805B72871DF7E9034879EF6B666D`. Four packaged processes used 364.1 MB working set, 328.4 MB private memory, and 1.938 cumulative CPU seconds, then closed normally and released the port; both changed runtime files were byte-identical in the archive.
- Published exact source `9d471b5918c6a27f775a8870511c9e8195d9bc07`; GitHub run `31751730555` passed Node 24 quality in 47 seconds and Windows packaging in 2 minutes 55 seconds. Artifact `9201228811` has archive size 109,491,191 bytes and digest `sha256:f48141f6b820a7c20250dfeee98e1c1e06667ad0e20897bd770c1c27bdd93f78`; its single unsigned 2.3.28 installer is 109,485,248 bytes with SHA-256 `4619979451B2A378C572FED2B4D05A3EF2F5AA37327A69BC949EDA3A097A9254`.

## 2026-08-13 workspace-invitation continuation

- Re-audited invitation creation, resend, revocation, and acceptance against the one-time-token and no-fake-success contract. Failed forms could lose entered values, one-time links depended on a second Workspace refresh, and committed server actions were blurred with later browser persistence or refresh faults.
- Moved invitation DOM and transient action state into `public/workspaceView.js`. Authenticated reads/writes, exact endpoints and bodies, session-token persistence, and workspace reload verification remain in `public/app.js`; the renderer has no network, credential, cookie, session, storage, or provider authority.
- Pre-commit failures now stay inline and retryable, duplicate submits are locked, secure links render before refresh, and committed accept/revoke/resend outcomes remain truthful when only refresh or session persistence fails.
- Initial app plus localization fell by 6,435 raw, 843 gzip, and 598 Brotli bytes. Startup imported 251 modules at 65.3 MB RSS without Mongoose; Overview reached 68.9 MB RSS with Mongoose still unloaded.
- Local quality passed 112 suites/854 tests, 5/5 recommendation evaluation, both zero-vulnerability audits, five-secret production validation, and a 15,000-card profile at 642.4 ms p95 and 307.4 MB peak RSS with no provider writes.
- In-app Browser passed Overview exclusion, one shared-fingerprint Workspace load, English/Dutch read-only controls, invitation-query removal, desktop/mobile containment, and zero current console warnings/errors. Protected mutation outcomes are covered by seeded DOM tests rather than fabricated live identity state.
- Built and verified unsigned `Sneup-Setup-2.3.27.exe`: 109,484,457 bytes, SHA-256 `6BF9B9918DD5B3B494504964B7620337A530B86B59301BFEE3901857FF53B1E4`. Four packaged processes used 364.4 MB working set, 316.3 MB private memory, and 1.609 cumulative CPU seconds, then closed normally and released the loopback port; all three changed runtime files were byte-identical in the archive.
- Published exact source `2acbc2bc5aa9e238031db736321c2dc9ff53ebb5`; GitHub run `31677406698` passed Node 24 quality in 1 minute 12 seconds and Windows packaging in 2 minutes 28 seconds. Artifact `9172127189` has archive size 109,490,662 bytes and digest `sha256:45a14e769d58116c7c16ad8414dbed0ed2e2a36799989fe24653191c80e75efb`; its single unsigned 2.3.27 installer is 109,484,739 bytes with SHA-256 `F4086F4696F02C2C701A025A9479A02C5B8920A63334CB3527F51AC3A8184FFE`. Live provider/ngrok/HAI acceptance, production deployment and restore, publisher signing, clean-VM scaling, and assistive-technology certification remain external.

## 2026-08-09 first-run setup continuation

- Re-audited first-run setup against the approval-gated operations contract and found eager Overview parsing, premature completion markers, non-retryable save failures, ambiguous saved-but-restart-failed messaging, and stale diagnostics responses.
- Moved setup rendering, Dutch copy, transient diagnostics state, and desktop action locks into `public/setupView.js`. Diagnostics reads, desktop settings and restart IPC, local completion state, and connector navigation remain in `public/app.js`.
- Persisted setup state now changes only after the desktop settings write commits. Pre-commit failures stay inline and retryable; a post-commit restart failure remains a truthful saved state; stale diagnostics requests are cancelled or ignored.
- Initial app plus localization fell by 9,040 raw, 2,554 gzip, and 2,087 Brotli bytes. Startup imported 251 modules at 64.6 MB RSS without Mongoose; Overview reached 68.7 MB RSS with Mongoose still unloaded.
- Local quality passed 112 suites/849 tests, 5/5 recommendation evaluation, both zero-vulnerability audits, five-secret production validation, and a 15,000-card profile at 797.8 ms p95 and 426.6 MB peak RSS with no provider writes.
- In-app Browser passed setup exclusion from Overview, one shared-fingerprint load, eight English/Dutch diagnostics, refresh, responsive containment, and zero current console warnings/errors.
- Built and verified unsigned `Sneup-Setup-2.3.26.exe`: 109,483,564 bytes, SHA-256 `6A005D09AEB71E6D15D9E1AC460DCA6D0F5405D35E3A4F9A7F0BF675962B6E7C`. Four packaged processes used 362 MB working set and 296.7 MB private memory, then closed normally and released the loopback port; all four changed runtime files were byte-identical in the archive.
- Published exact source `02632fd2ddf1fd034c830d61bfbdf2b5833eff71`; GitHub run `31336994293` passed Node 24 quality in 56 seconds and Windows packaging in 1 minute 59 seconds. Artifact `9044650169` has archive size 109,489,825 bytes and digest `sha256:03d90293036efb3142c66687d4782cda1925a785c470ed118b4c98ab2cb1b2f6`; its single unsigned 2.3.26 installer is 109,483,883 bytes with SHA-256 `3BFF7AD7E90325DE6436BB1674C9ABED6AB1883D4A21439D50D40CEC2D21D8BA`. Live provider/ngrok/HAI acceptance, production deployment and restore, publisher signing, clean-VM scaling, and assistive-technology certification remain external.

## 2026-08-09 notification-policy continuation

- Fixed the notification service to preserve `dailyBriefSchedule` during partial updates and reject activation unless the request contains explicit server-authoritative confirmation.
- Moved notification policy create/edit, activate, pause, and external test UI into `public/approvalView.js`; exact body construction, encoded API routes, authenticated writes, encrypted destination handling, and provider authority remain in `public/app.js`.
- Added guarded single-submit behavior and truthful committed-write/delivered-test messaging when a subsequent operations-ledger refresh fails.
- Initial app plus localization fell by 12,974 raw, 2,071 gzip, and 1,731 Brotli bytes. Startup sampled 67.8 MB RSS on import and 72.2 MB after Overview with Mongoose still unloaded.
- Local quality passed 111 suites/843 tests, 5/5 recommendation evaluation, both zero-vulnerability audits, five-secret production validation, and a 15,000-card profile at 604.4 ms p95 and 330.6 MB peak RSS with no provider writes.
- In-app Browser passed deferred Approval loading, the shared fingerprint, English/Dutch read-only rendering, containment, and zero current console errors. Protected policy forms are covered by seeded DOM tests rather than fabricated database/provider state.
- Built and verified unsigned `Sneup-Setup-2.3.25.exe`: 109,482,700 bytes, SHA-256 `E4D290CA4FAFC9762017BF2E370E42549EAE626ED18D464B0FE008CDD908D165`. Four packaged processes used 363.3 MB working set and 329.4 MB private memory, then closed normally and released the loopback port; all three changed runtime files were byte-identical in the archive.
- Published exact source `f2c6bc854739ead5d800a471468bc009a6d6604d`; GitHub run `31335440803` passed Node 24 quality in 1 minute 12 seconds and Windows packaging in 2 minutes 11 seconds. Artifact `9044199111` has archive size 109,488,912 bytes and digest `sha256:94e1132dedb095bb16622868116e47334cd86e2bbcb1b0bb4f88c6951f595fc4`; its single unsigned 2.3.25 installer is 109,482,942 bytes with SHA-256 `AFCF25284ED347BEAF23A3E5F83D7AC3819FB2F337D457D7137880F5E49F158F`.

## 2026-08-09 inbound worker-response continuation

- Re-audited the remaining eager Connector surface and moved the connected Generic Webhook worker-response mapping editor into `public/connectorView.js`.
- Kept authenticated option reads, encoded account routing, exact save bodies, connector refreshes, credentials, sessions, and provider authority in `public/app.js`; the renderer owns only bounded DOM and transient search state.
- Added Dutch coverage, safe dynamic escaping, source-ID validation, 100-item bounds, stale request cancellation, member/card reset, cleanup, duplicate mapping and submit guards, and explicit failed-save retry.
- Corrected successful-save/failed-refresh behavior for this editor and all ten account-selection forms so committed writes are never presented as failed writes.
- Initial app plus localization fell by 9,524 raw, 1,920 gzip, and 1,556 Brotli bytes. Startup sampled 69.8 MB RSS on import and 72.7 MB after Overview with Mongoose still unloaded.
- Local quality passed 111 suites/838 tests, 5/5 recommendation evaluation, both zero-vulnerability audits, five-secret production validation, and a 15,000-card profile at 526 ms p95 and 328.3 MB peak RSS with no provider writes.
- In-app Browser passed deferred loading, shared fingerprint, 117 connectors, English/Dutch rendering, containment, and zero current console errors. The connected-account-only mapping editor is covered by seeded DOM tests rather than fabricated provider state.
- Built and verified unsigned `Sneup-Setup-2.3.24.exe`: 109,481,903 bytes, SHA-256 `77240C43039263D0C785471BA44148272ABE3E533B4D18AD9041F516DCC21D6E`. Four packaged processes used 362.5 MB working set and 347.7 MB private memory, then closed normally and released the loopback port.
- Published exact source `7e9400cc48ae42cc7c92a0a3ec9389781833f6e0`; GitHub run `31333762069` passed Node 24 quality in 1 minute 3 seconds and Windows packaging in 2 minutes 46 seconds. Artifact `9043718997` has archive size 109,488,047 bytes and digest `sha256:12528c7a7d929d6f2d6726cd74e98534af33001231ebd5c0785c3928e3100fed`; its single unsigned 2.3.24 installer is 109,482,011 bytes with SHA-256 `04BD2A3D63C29C24E5995FAB79060F68BDC6B3992740ABD634FC3C8BBCC82D14`.

## 2026-08-09 connector account-selection continuation

- Re-audited the remaining eager connector UI against the approval-gated operations contract and found ten account-selection renderers still loaded on Overview.
- Moved Figma, SharePoint, Mural, Xero, Procore, Resource Guru, Basecamp, Asana, Confluence, and Jira selection forms into `public/connectorView.js`, including English/Dutch copy, bounded options, escaping, duplicate-submit protection, cancel, and retry behavior.
- Kept all authenticated option reads, exact endpoint mapping, encoded account identifiers, POST bodies, refreshes, credentials, and provider authority in `public/app.js`; the deferred module cannot fetch or access tokens, cookies, sessions, storage, or providers.
- Initial app plus localization fell by 21,493 raw, 2,131 gzip, and 1,610 Brotli bytes. Demo startup imported 251 modules at 68.9 MB RSS without Mongoose; the 15,000-card real-Mongo profile measured 761.4 ms p50, 966.6 ms p95, and 340.1 MB peak RSS within its budgets.
- In-app Browser QA passed Overview exclusion, one shared-fingerprint Connector load, 117 entries, four honest catalog-only entries, English/Dutch rendering, no horizontal overflow, and zero current console errors. Seeded DOM tests cover the ten linked-account form flows because demo mode does not invent provider accounts.
- Local quality passed 111 suites/835 tests, 5/5 recommendation evaluation, both zero-vulnerability audits, purpose-separated five-secret validation, syntax/source/whitespace checks, and portfolio-scale verification with no provider writes.
- Built and verified unsigned `Sneup-Setup-2.3.23.exe`: 109,480,743 bytes, SHA-256 `97EE2D6E07D24B187CB2FCF1A223FF9C01AE1D5191FA37880A1B9FF17B1F3871`. Four packaged processes used 360.5 MB working set and 290.4 MB private memory, then closed normally and released the loopback port.
- Published exact source `be0eeb677dbf1049ecfa15d29fe010f44d58f53e`; GitHub run `31332160310` passed Node 24 quality in 1 minute 1 second and Windows packaging in 2 minutes 26 seconds. Artifact `9043260024` has archive size 109,486,755 bytes and digest `sha256:90fc98a6056c933649b977ea894e64369440cac1a53e85ceab735ecffb6a64a1`; its single unsigned 2.3.23 installer is 109,480,729 bytes with SHA-256 `EB60DF80CCDC45699A3254A56B48676E91AAE790C624213A8DD3BE449D1C7923`.

## 2026-08-09 workspace policy-form continuation

- Re-audited the workspace policy UI boundary against the approval-gated operations contract and found five form renderers still paid for on initial dashboard load.
- Moved timing, cooldown, decision-routing, decision-snooze, and provider-safety form construction into the retry-safe Workspace module while retaining exact payload construction and all authenticated writes in `public/app.js`.
- Preserved fixed Robert ownership for high/critical queues, guarded form persistence, successful-save cleanup, localized failures, and the rule that policies cannot directly perform provider writes.
- Reduced initial app-plus-localization transfer by 14,798 raw, 2,140 gzip, and 1,673 Brotli bytes compared with 2.3.21; even after Workspaces opens, combined source is 2,533 raw bytes smaller.
- In-app Browser QA passed deferred exclusion/loading, shared fingerprint, English/Dutch read-only workspace rendering, containment, and zero current console warnings/errors.
- Local quality passed 111 suites/831 tests, 5/5 recommendation evaluation, both zero-vulnerability dependency audits, and purpose-separated five-secret validation.
- Built and verified unsigned `Sneup-Setup-2.3.22.exe`: 109,479,448 bytes, SHA-256 `7AEF17707C0B79EE7832C8AB321228172544E3C386529957B28B9E0498923E21`. Four packaged processes used 361.1 MB working set and 292.3 MB private memory, then closed normally and released the loopback port.
- Published exact source `f5b442e832cae763a33fe6212ed39a91c56024b9`; GitHub run `31330566354` passed Node 24 quality in 1 minute 8 seconds and Windows packaging in 2 minutes 13 seconds.
- Independently downloaded artifact `9042817428`: its 109,485,528-byte archive has digest `sha256:2e3f4a2213d97a47435a25cd9baaed11c1fac9bd51f132e59adabf40d6331114`; the single unsigned 2.3.22 installer is 109,479,490 bytes with SHA-256 `1791C0DF6CEA5ABD23572DEC33F997400AD13416A957A101DDFAA608709B1F16`.

## 2026-08-09 approval operations continuation

- Re-read the governing operations-ledger specification and traced approval rendering, protected evidence, localization, guarded actions, asset caching, and modal ownership end to end.
- Extracted the complete Approvals and operations-ledger renderer into a retry-safe 56,476-byte module that loads in parallel with approval data and notification health only when the view first opens.
- Kept API, session, credential, approval, execution, reconciliation, notification, follow-up, response, and workspace mutations in the authenticated controller; the renderer receives named callbacks and has no direct authority.
- Added complete Dutch approval and consequential workspace form/modal copy while preserving free text, identifiers, provider/audit evidence, server errors, and exact payload JSON verbatim.
- Moved 373 approval-only and 145 workspace-only Dutch messages out of startup, with a prototype-key-safe lazy catalog registry. Initial app-plus-localization fell by 21,649 raw, 3,876 gzip, and 3,008 Brotli bytes versus 2.3.18.
- In-app Browser QA passed lazy loading, English/Dutch approval rendering, exact evidence and payload preservation, Robert filtering, read-only workspace safety, compact containment, and a clean console. Focused jsdom/source tests then covered the final lazy-catalog registration split.
- Final local quality passed 109 suites/817 tests, 5/5 recommendation evaluation, both zero-vulnerability dependency audits, and purpose-separated five-secret release validation without exposing values.
- Built and verified unsigned `Sneup-Setup-2.3.19.exe`: 109,475,145 bytes, SHA-256 `0C38644685A321F887C9B3FF1887EABBDED41723792D72882859AEBF0BC31CB8`. Four packaged processes used 359.9 MB working set and 294.2 MB private memory, then closed normally and released the loopback port.
- Published verified source `f8bb970a6a017a12996ff0f18cfd5933fee89d1f`; GitHub run `31325790644` passed Node 24 quality in 1 minute 2 seconds and Windows packaging in 1 minute 58 seconds. Independently downloaded artifact `9041503855`: its 109,481,334-byte archive has digest `sha256:75fa96794d960faf9c9df573fdb247e3892f80ae58c163dac3be3393d36373d2`; the single unsigned 2.3.19 installer is 109,475,379 bytes with SHA-256 `BCA37895826912A92AD8ED68C33516194CC1FFA52CEFDC80F29BACC9EAA0DDCF`.

## 2026-08-09 workspace administration continuation

- Re-read the governing operations-ledger specification and audited the remaining localization, maintenance, browser-load, cache, action-safety, and resource gaps around Workspace administration.
- Extracted the workspace, identity, policy, rollout, integrity, retention, and safety-history renderer into a 25,229-byte browser module loaded concurrently with the first workspace API read and reused across refreshes.
- Kept every consequential mutation in the existing controller and exposed only named callbacks to the renderer; the module has no direct API, session-token, credential, or persistence access.
- Added Dutch semantic copy for the complete renderer while preserving workspace/person/provider names, policy labels, audit actors, rollout descriptions/reasons, server errors, and integrity evidence verbatim.
- Browser QA found that three guarded action callbacks had been removed with the renderer. Restored them to the trusted controller, added source-boundary regressions, restarted under a new shared asset fingerprint, and reran the full English/Dutch flow successfully.
- The eager app fell from 310,673 to 291,628 bytes. The initial app-plus-localization payload fell by 13,128 raw, 2,062 gzip, and 1,350 Brotli bytes; a directional 100-sample parser benchmark moved from 0.210 to 0.143 ms median.
- In-app Browser QA proved the module is absent on Overview, loads once on Workspace administration, retains one instance after refresh, restores English/Dutch, and stays contained at 480x844 with no overflowing controls or current console warnings/errors.
- Final local quality passed 108 suites/809 tests, 5/5 recommendation evaluation, both zero-vulnerability dependency audits, synthetic purpose-separated release-secret validation, and a 67.0 MB RSS startup import with MongoDB still deferred.
- Built and verified the unsigned `Sneup-Setup-2.3.18.exe`: 109,466,199 bytes, SHA-256 `507A16FB942B959B0EC46991E57F97C7A7093CFAA6FD755AFC85CBD522B2D3CE`. Four packaged processes settled to 361.9 MB working set and 295.3 MB private memory, then closed normally and released the loopback port.
- Published exact source `e0a0cbbc17c33a47bdbd12adbfe3991d07ffce07`; GitHub run `31321936184` passed Node 24 quality in 1 minute 10 seconds and Windows packaging in 2 minutes 22 seconds.
- Independently downloaded artifact `9040446117`: its 109,472,305-byte archive has digest `sha256:eff8d19d6f47a6702bd628d806fe090ac937e5dea179923730e0576f78b5bc97`; the single unsigned 2.3.18 installer is 109,466,331 bytes with SHA-256 `4646153D37417799D93565801AFB637273E193861D592F951FFACB6143806B9C`.

## 2026-08-09 connector marketplace continuation

- Re-read the governing operations-ledger specification and audited the remaining code-owned completion gaps, connector catalog path, eager browser bundle, localization boundary, and shared asset-fingerprint contract.
- Extracted connector rendering, status/safety/freshness/rotation guidance, pagination, filters, and action binding into a retry-safe 21,089-byte browser module that loads only when Connectors opens.
- Run the connector API request and module fetch concurrently, retain one controller across rerenders, remove failed script loads, and clear the rejected promise so the next operator attempt can recover.
- Localized all connector operator chrome, category/status/count labels, and account-selection actions in Dutch while preserving provider descriptions, scope/safety summaries, availability reasons, source names, and sync evidence verbatim.
- Found that the shared cache version omitted localization, help, persistence, and deferred modules; expanded the authoritative fingerprint and immutable allowlist to all seven command-center assets and proved each file independently changes the version.
- The eager app fell from 329,496 to 310,673 bytes and from 62,782 to 59,256 gzip bytes. Including the larger Dutch catalog, the initial app-plus-localization payload still fell by 9,878 raw and 1,215 gzip bytes; the deferred connector module is 5,582 gzip bytes.
- In-app Browser QA proved the module is absent on Overview, loads once with the app fingerprint, renders 24/117 entries, supports Trello search and all four catalog-only providers, restores English/Dutch, preserves provider evidence, and remains contained at the minimum viewport with zero current console warnings/errors.
- Final local quality passed 107 suites/805 tests, 5/5 recommendation evaluation, both zero-vulnerability dependency audits, synthetic purpose-separated release-secret validation, and a 67.5 MB RSS startup import with MongoDB still deferred.
- Built and verified the unsigned `Sneup-Setup-2.3.17.exe`: 109,464,295 bytes, SHA-256 `0FDEAA4465A2C742FCFD26F89AF7654CAC63B28A68F1293B419B19168FB7F5E4`. Four packaged processes settled to 360.5 MB working set and 294.6 MB private memory, then closed normally and released the loopback port.
- Published exact source `34792cda09e19aaf5febf84a2ec963f9de5e6097`; GitHub run `31320214146` passed Node 24 quality in 1 minute 5 seconds and Windows packaging in 2 minutes 27 seconds.
- Independently downloaded artifact `9039960965`: its 109,471,073-byte archive has digest `sha256:e306d597e5079199c9e4a18063179fc5f6e74fe6a9e9f3b94b606143e65d8461`; the single unsigned 2.3.17 installer is 109,465,057 bytes with SHA-256 `5DCD0D8018DB8AA3F70DFC34DFDE28F0D4783C68D7499C89E9399B6F5D17A9C7`.

## 2026-08-09 English/Dutch localization continuation

- Re-read the governing operations-ledger specification and audited the current completion matrix, static shell, generated operator chrome, setup flow, command palette, and contextual help catalog.
- Added a dependency-free English/Dutch runtime with persisted locale choice, exact-message translation, local date/number/plural formatting, and reversible static DOM translation.
- Kept provider, user, audit, and source-evidence text outside automatic translation so Sneup never changes the meaning of operational evidence.
- Localized the command-center shell, setup and diagnostics guidance, command palette, contextual help and search, and primary mission-control/team/board workflow chrome. Secondary dynamic screens remain explicitly partial in the completion matrix.
- Added six focused localization tests covering persistence, restoration, static-shell completeness, help-catalog completeness/search, evidence preservation, formatting, script order, and the language control's accessible name.
- In-app Browser QA passed English and Dutch restoration, localized help search/topic/action routing, setup diagnostics, desktop and compact viewport containment, and zero current console warnings/errors.
- Final local quality passed 105 suites/799 tests, 5/5 recommendation evaluation, both zero-vulnerability dependency audits, synthetic purpose-separated release-secret validation, and a 70.8 MB RSS startup import with MongoDB still deferred.
- The 33,577-byte catalog compresses to 11,269 bytes with gzip or 9,887 bytes with Brotli and adds no API request, database work, provider traffic, polling, dependency, or server module.
- Built and verified the unsigned `Sneup-Setup-2.3.16.exe`: 109,462,200 bytes, SHA-256 `33F959504DAE00AE5F8ED4D5DAB5FC2CA21FDA3B7CAB40BAF1554DE49E6587E5`. Four packaged processes settled to 360.6 MB working set and 292.6 MB private memory, then closed normally and released the loopback port.
- Published exact source `49af27f6fab19c2bf4e9da6f4da50fd49fbf7044`; GitHub run `31318682009` passed Node 24 quality in 1 minute 1 second and Windows packaging in 2 minutes 36 seconds.
- Independently downloaded artifact `9039544372`: its 109,468,258-byte archive has digest `sha256:27d1e1214d8272ad6257d9b757a1f43702c0c4372d4a1803546c8c76713f4eb3`; the single unsigned 2.3.16 installer is 109,462,310 bytes with SHA-256 `7719761E182506337CAA71737C6312479B94552CEF65DA128F892C8EA48943C9`.

## 2026-08-09 portfolio-scale continuation

- Re-read the complete governing operations-ledger specification and traced the live mission-control path through projected MongoDB reads, analytics, lists, forecast capacity, work graph, evidence, and approval-safe command generation.
- Found that focus, risk, and command builders eagerly created rich evidence for thousands of candidates before discarding all but 10 or 12; replaced that work with stable bounded ranking while preserving score order and first-seen ties.
- Added the exact `{ workspaceId, closed, due, riskLevel }` compound card index used by the live portfolio query.
- Added focused regressions proving evidence is materialized only for visible winners and graph score can still displace lower-ranked commands.
- Added `profile:portfolio-scale`, guarded to a dedicated disposable database name, which seeds and exercises 60 boards, 300 lists, 15,000 cards, 100 members, and 60 analytics records through the real service and drops only that database afterward.
- MongoDB 7 verification passed: 898.7 ms seed, 1,264.9 ms cold snapshot, repeated reads of 759.9/613.0/1,111.0 ms, 353.5 MB peak verifier RSS, exact compound-index selection, bounded 10/12/12 output, approval required, and no provider writes. The exact temporary container was removed and its port released.
- The same worst-case 15,000-card algorithm sample improved focus from 42.8 to 16.2 ms, risks from 50.5 to 19.9 ms, and commands from 90.3 to 43.2 ms; command peak RSS fell from about 165 to 106 MB.
- Final local quality passed 104 suites/793 tests, 5/5 recommendation evaluation, both zero-vulnerability dependency audits, positive five-secret production verification, and a 71.1 MB RSS startup import with MongoDB still deferred.
- Built and verified the unsigned `Sneup-Setup-2.3.15.exe`: 109,454,208 bytes, SHA-256 `EDDC7030114E5D424398ACA79BB8683A6DE08B919F9AC7BD7955F9AF81068FD6`. Four packaged processes settled to 358.8 MB working set and 287.4 MB private memory, then closed normally and released the loopback port.
- Published exact source `2fa0a91691c74dc68c552e56f6ce08227fbbe826`; GitHub run `31316707100` passed Node 24 quality in 1 minute 9 seconds and Windows packaging in 3 minutes 51 seconds.
- Independently downloaded artifact `9038991309`: its 109,460,351-byte archive has digest `sha256:135e228f7902a7023b0cdf9aa568b3aae10928a30039a7b9f580c4ef4ee525e8`; the single unsigned 2.3.15 installer is 109,454,450 bytes with SHA-256 `BF32EAC5996FF5471F4D9D274AE2B78FC974CB7D0518AE06BAE924B5B06B4EC9`.

## 2026-08-09 contextual help continuation

- Re-audited the governing operations-ledger specification and current completion matrix after the verified 2.3.13 release; the remaining high-priority production gates require owner infrastructure or live provider consent.
- Added a standalone static help module covering all eight command-center views, setup/live readiness, decision safety, and privacy/data control, with direct handoffs into existing local workflows.
- Added contextual opening from the compact Help control or `F1`, bounded local search, labelled modal semantics, focus containment/restoration, Escape/backdrop close, and narrow-screen stacking.
- Kept the catalog out of browser storage, API traffic, database work, provider traffic, polling, and the main 6,500-line command-center module; its hidden DOM is not built until help first opens.
- Added ten focused jsdom tests for catalog completeness, context fallback, search, keyboard/focus behavior, safe routing, static integration, and browser-script initialization.
- In-app Browser QA passed the Forecasts context, local search, Decision Safety topic, Approvals handoff, desktop and narrow layouts, viewport containment, focus placement, and zero current console errors.
- Final local quality passed 103 suites/789 tests, 5/5 recommendation evaluation, two zero-vulnerability audits, purpose-separated release-secret verification, source scans, and three repeat startup profiles with no Mongoose load in demo mode.
- Built and verified the unsigned `Sneup-Setup-2.3.14.exe`: 109,453,766 bytes, SHA-256 `1F55E031B6079FEC3CF56992C4578BBD23893EEC3A84F21449BB5ADB8B672F79`. Four packaged processes settled to 356.7 MB working set and 289.2 MB private memory, then closed normally and released the loopback port.
- Published exact source `c798810ad57bc14ec27b49917dba51e7d5247d83`; GitHub run `31315530839` passed Node 24 quality in 1 minute 5 seconds and Windows packaging in 2 minutes 7 seconds.
- Independently downloaded artifact `9038639092`: its 109,459,970-byte archive has digest `sha256:a37fa807b8c04fb33b8f6e2de76ce9160c65dc0c5372dee4c88786316c43539b`; the single unsigned 2.3.14 installer is 109,454,064 bytes with SHA-256 `C97ABCDDFB81417FE04849C3B057100045BFB642307422F275CF89F1F263F77F`.

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
## 2026-08-09 demand-loaded Work Signals continuation

- Extracted Work Signals, adapter contracts, graph summaries, decision candidates, dependency review, graph detail, and graph ledger context from the eager command-center controller into `public/workSignalsView.js`.
- Kept all API, session, credential, recommendation-queue, and dependency-review authority in `public/app.js`; the deferred renderer receives only explicit guarded callbacks.
- Added retry after module-load failure, one shared fingerprint across ten command-center assets, local filtering without provider/API work, lazy Dutch registration, invalid-date containment, and HTTPS-only credential-free evidence links.
- Reduced initial app plus localization from 318,418 to 294,642 raw bytes, 66,622 to 61,938 gzip bytes, and 54,323 to 50,964 Brotli bytes. The deferred renderer is 37,369 raw, 7,847 gzip, and 6,980 Brotli bytes.
- In-app Browser QA passed view identity, nonblank rendering, deferred script loading, shared fingerprint reuse, filter interaction, English/Dutch operator text, exact provider evidence, no framework overlay, no horizontal overflow, and zero console warnings/errors.
- Passed lint, 110 suites/824 tests, 5/5 recommendation evaluation, both zero-vulnerability audits, production-style five-secret validation, syntax/diff checks, and focused source scans.
- Built `Sneup-Setup-2.3.20.exe`, 109,476,907 bytes, unsigned, SHA-256 `3B0E3460D84DAA3BD5CC7E182FA423287C321E4A50B83621E8F0E311450A6D95`. Packaged verification reported version 2.3.20, healthy demo diagnostics, eight checks, no exposed secrets, HAI `never_direct`, normal close, and port release.
- Published source commit `0b19b13009bae3523d4cdffa14ea630c923b139f`. GitHub run `31327523743` completed successfully: Node.js 24 quality in 1 minute 1 second and Windows installer plus artifact upload in 2 minutes 14 seconds.
- Artifact `9041970725` (`sneup-windows-installer-unsigned`) is a 109,483,887-byte archive with digest `sha256:7e47e852d4c7a084f5177c2d018aedb4ce5bd949ba9b6a623f6b0ed0d9040cb0`. Its single downloaded installer is 109,477,917 bytes, unsigned, reports version 2.3.20, and has SHA-256 `D245ABBC0D6C6B3D4CDD2DA53DD81A310FA21D798631E05E6A36A0CC7EE8CBDC`.

## 2026-08-09 Forecasts and Reports continuation

- Re-read the governing approval-gated operations-ledger specification and traced Forecasts/Reports rendering, API ownership, form persistence, localization, caching, and retry behavior end to end.
- Extracted Forecasts and Reports into retry-safe demand-loaded modules while keeping API/session access, capacity and project-mapping mutation, report downloads, and all provider authority in `public/app.js`.
- Added complete Dutch operator chrome and localized forecast forms while preserving operational risks, assumptions, provider/member/board evidence, report labels, identifiers, and server failures verbatim.
- Reduced initial app plus localization from 294,642 to 279,740 raw bytes, 61,938 to 58,547 gzip bytes, and 50,964 to 48,385 Brotli bytes. The two deferred modules total 31,512 raw bytes.
- In-app Browser QA passed Overview non-loading, one-time shared-fingerprint module loads, English/Dutch Forecasts and Reports, exact evidence, containment, and zero current console warnings/errors.
- Passed lint, 111 suites/830 tests, 5/5 recommendation evaluation, two zero-vulnerability dependency audits, production validation with five independent secrets, diff/source checks, and the startup profile. Demo import used 53.2 MB RSS; the seven-request overview sample ended at 58.6 MB RSS without loading Mongoose.
- Built and verified unsigned `Sneup-Setup-2.3.21.exe`: 109,479,199 bytes, SHA-256 `B9E47D19CFA2C65A5263558953DF92351E6DD53F680E7965B71D9887AD2A1587`. Four packaged processes used 360.5 MB working set and 290.1 MB private memory, then closed normally and released the loopback port.
- Live provider/ngrok/HAI authorization, production restore/deployment rollback, publisher signing, clean-VM scaling, and assistive-technology certification remain external gates.
- Published source commit `431e99dbfeef8e11105b079c620f101db338cf83`. GitHub run `31329172266` completed successfully: Node.js 24 quality in 49 seconds and Windows installer plus artifact upload in 2 minutes 15 seconds.
- Artifact `9042435236` (`sneup-windows-installer-unsigned`) is a 109,485,393-byte archive with digest `sha256:349a257ffc1cadbdaa37d45cc8e88695fcfa27ecb6fe86c3dc34cd99ef26d79a`. Its single independently downloaded installer is 109,479,402 bytes, unsigned, reports version 2.3.21, and has SHA-256 `D41A927DDD85B0CC487F092DA3E856ECA4CCD9F6923EB0FE37094D283B023A1F`.
