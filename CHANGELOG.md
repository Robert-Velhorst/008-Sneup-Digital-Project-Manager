# Changelog

## 2.3.32 - 2026-08-14

### Lifecycle-safe background operations

- Made all recurring Trello, analytics, connector, intervention, performance, notification, invitation-retention, and data-retention schedules idempotent, cancellable, restartable, and fail closed when their cron configuration cannot create a job.
- Attached a non-secret error observer to every `node-schedule` job so a recorded provider or database failure cannot become an uncaught EventEmitter error that shuts down the whole application.
- Expanded shutdown and partial-startup rollback across every scheduler, ngrok, HTTP, and MongoDB. Cleanup continues after an individual stop failure and reports an aggregate failure only after all components were attempted.
- Sanitized and bounded failure text before it enters persisted Job Health history, including bearer/basic credentials, credential-bearing URLs, Trello query keys, and JSON-style secret fragments.
- Added packaged Windows runtime verification to GitHub Actions before the unsigned installer can be uploaded.

### Verification

- The full local gate passes 120 suites/893 tests, lint, and the 5/5 recommendation safety evaluation. Full and production dependency audits report zero vulnerabilities, and the production configuration check accepts five purpose-separated secrets without exposing their values.
- Cold startup imported 252 modules in 217.9 ms at 70.9 MB RSS and kept Mongoose unloaded through Overview. A disposable real-Mongo 15,000-card profile measured 1,000.8 ms p50, 1,021.1 ms p95, and 401.2 MB peak RSS with bounded output, the intended compound index, approval required, and no provider writes.
- In-app Browser acceptance rendered ENH-031 through the completed operations filter at desktop and 390 x 844 with equal client/scroll width. HAI exposed only bounded snapshot/proposal paths and retained `never_direct` provider-write policy.
- Built and verified unsigned `Sneup-Setup-2.3.32.exe`: 109,490,159 bytes, SHA-256 `6E672DD0AF9EF23A2B52284992217AB37D879285B24B0C2D1749E75BE871E584`. The exact CI packaged-app command passed product metadata, eight diagnostics, secret redaction, HAI policy, normal close, port release, and source-identical changed runtime files; its five-second sample used 372.1 MB working set, 349.8 MB private memory, and 1.234 CPU seconds.
- Published source `8344df95e8f799c96cee5d0249ff3e48296b29c4`. GitHub run `31760069838` passed quality in 55 seconds and Windows packaging plus packaged-app launch in 2 minutes 24 seconds. Artifact `9204287831` has archive digest `sha256:ab8d0ec115e61e56c369b1b1d70407a4eb04bdc94ce043e1db77f30fbf8edf26`; its single independently downloaded installer is 109,490,254 bytes, unsigned, version 2.3.32, SHA-256 `99B537ACB53E5E56A45CE0151D0B396B3A790E233DA61DF2143C9E7310818176`.

## 2.3.31 - 2026-08-14

### Lifecycle-safe ngrok browser ingress

- Added the validated runtime ngrok origin to the existing CORS boundary so invitation acceptance and authenticated browser POSTs work through the documented tunnel without a wildcard or duplicate manual allowlist.
- Reject and close non-HTTPS, credential-bearing, custom-port, non-root, query-bearing, or fragment-bearing listener URLs before publishing them.
- Share concurrent tunnel starts, refresh Sneup-owned public and Trello callback URLs across ephemeral restarts, and restore prior operator configuration on shutdown.
- Reflow the enhancement priority, status, and area filters into bounded narrow-screen controls without changing the desktop workflow.

### Verification

- The full local gate passes 117 suites/884 tests, lint, and the 5/5 recommendation safety evaluation. Full and production dependency audits report zero vulnerabilities, and the production configuration check accepts five purpose-separated secrets without exposing their values.
- A disposable real-Mongo 15,000-card profile measured 685.5 ms p50, 700.7 ms p95, and 491.9 MB peak RSS with bounded 10/12/12 output, the intended compound index, approval required, and no provider writes.
- In-app Browser acceptance passed the completed security backlog on desktop and at 390 x 844 after fixing a 45 px filter overflow. HAI exposed only snapshot and proposal paths and retained `never_direct` provider-write policy.
- Built and verified unsigned `Sneup-Setup-2.3.31.exe`: 109,488,324 bytes, SHA-256 `73BAEE77A86E9CE26E474DEF8660536167AAAFAAF8B72367E1F8698B79AFBF15`. Packaged verification passed product metadata, eight diagnostics, secret redaction, HAI policy, normal close, port release, and source-identical changed runtime and UI files.
- Published source `9c1cacc51f9b8f586a3d6a2aa25bb71813db499e`. GitHub run `31758359073` passed quality in 1 minute 8 seconds and Windows packaging in 2 minutes 10 seconds. Artifact `9203646859` has archive digest `sha256:290774b834f6b9785566604fcdd6f50b13c87d08d1392e9517003327261ec4f0`; its single independently downloaded installer is 109,488,556 bytes, unsigned, version 2.3.31, SHA-256 `2F4608960266D2A978FFA6664CA4BE7FD8454DAB0465FC574CC9EE197D5DEBB0`.

## 2.3.30 - 2026-08-14

### Fail-safe ambiguous Trello writes

- Wired the existing `SNEUP_TRELLO_TIMEOUT_MS` setting into every Trello SDK request with strict 1-60 second validation, a 16 MB response ceiling, a 256 KB request ceiling, and redirect denial.
- Kept timeout, connection-reset, HTTP 408/5xx, and local post-write snapshot outcomes claimed for manual reconciliation instead of labeling them as retryable failures. Definitive provider validation responses remain ordinary failures.
- Added exact confirmed/uncertain step evidence for partially created checklists and retained existing reassignment evidence. The Approvals view now explains the reconciliation reason and localized steps.
- Added first-run diagnostics for invalid timeout configuration without loading the Trello SDK.

### Verification

- The full local gate passes 116 suites/878 tests, lint, the 5/5 recommendation safety evaluation, two zero-vulnerability dependency audits, and positive five-secret production validation.
- Cold startup imported 252 modules in 237.6 ms at 68.0 MB RSS; seven demo routes remained Mongo-free. A disposable real-Mongo 15,000-card profile measured 750.6 ms p50, 828.5 ms p95, and 428.5 MB peak RSS with bounded output, the intended compound index, approval required, and no provider writes.
- In-app Browser acceptance passed the demand-loaded Approvals view, Dutch rendering, desktop and effective 749 px narrow containment, and zero current console warnings/errors. HAI exposed only bounded snapshot/proposal paths, advertised `never_direct`, and failed closed when durable proposal storage was unavailable.
- Built and verified unsigned `Sneup-Setup-2.3.30.exe`: 109,487,238 bytes, SHA-256 `502DCF6BD59543A9148C3451DAC6FC8CD9E610B156220BBEE41DC6DEBBF5AA27`. Packaged verification passed product metadata, eight diagnostics, secret redaction, HAI policy, normal close, port release, and source-identical changed runtime files.
- Published source `eac5a368dba90fcda2a17d63969dc523a5bd4c13`. GitHub run `31756362949` passed quality in 56 seconds and the Windows build in 2 minutes 52 seconds. Artifact `9202903661` has archive digest `sha256:f51ff875bb0e08bad3cabd2fc75538956fa23be3b6fb86803606a10f2fee647a`; its independently downloaded installer is 109,487,543 bytes, unsigned, version 2.3.30, SHA-256 `EC0E37E151A0FA23DC02CF47FC9579857464F626B70BEAD8618A76031573BBC5`.

## 2.3.29 - 2026-08-14

### Bounded production database connections

- Replaced the MongoDB driver's 100-connection-per-server default with a validated 20-socket per-process application pool that matches Sneup's bounded dashboard and worker concurrency.
- Retained no idle minimum, close unused sockets after 60 seconds, limit simultaneous connection establishment to two, and fail a saturated pool wait queue after five seconds instead of allowing indefinite request waits.
- Added bounded environment overrides, removed retired Mongoose connection flags, and made connection event registration idempotent across reconnects and embedded initialization.

### Production, cloud, HAI, and Windows verification

- A disposable real-Mongo run completed 100 concurrent reads in 115.5 ms, observed 17 peak checked-out and at most 20 created application connections, retained exactly one listener per connection event through reconnect, and dropped its database.
- The full gate passes 113 suites/862 tests, the 5/5 recommendation safety evaluation, two zero-vulnerability audits, and five-secret production validation. The 15,000-card profile measured 688.3 ms p50, 712.4 ms p95, and 349.1 MB peak RSS with no provider writes.
- In-app Browser acceptance passed demand-loaded Workspace rendering, disabled demo mutations, desktop/mobile containment, and zero current console warnings/errors. HAI still exposes only `snapshot` and approval-gated `propose`, with provider writes `never_direct`.
- Built and verified unsigned `Sneup-Setup-2.3.29.exe`: 109,485,792 bytes, SHA-256 `CCBC1B7C8A7BA15F5B15DC8DEAAD4EB23A00D9303994379238ABBD88F15D95FA`. Packaged verification passed product metadata, diagnostics, secret redaction, HAI policy, normal close, port release, and byte-identical changed runtime files.

## 2.3.28 - 2026-08-14

### Bounded authentication activity writes

- Kept API-token and session-token lookup, hash verification, expiry, user status, role, permission, and workspace resolution on every authenticated request.
- Replaced blocking document saves for non-audit `lastUsedAt` and `lastSeenAt` metadata with active-record-only atomic touches at a five-minute cadence. Revoked or disabled records cannot be revived by the metadata update.
- Added regression coverage for 100 repeated session resolutions and the exact interval boundary. A disposable real-Mongo profile retained 100 credential reads while reducing identity activity writes from 200 to two, a 99% reduction.

### Security, scale, browser, and Windows verification

- The full local gate passes 112 suites/855 tests, the 5/5 recommendation safety evaluation, two zero-vulnerability audits, and five-secret production validation.
- A real-Mongo 15,000-card profile measured 962.3 ms p50, 1,123.2 ms p95, and 355.7 MB peak RSS with bounded output, the intended compound index, approval required, and no provider writes.
- In-app Browser acceptance passed demand-loaded Workspace rendering, disabled demo mutations, English/Dutch responsive containment, a correlated `200` security context, and zero current console warnings or errors.
- Built and verified unsigned `Sneup-Setup-2.3.28.exe`: 109,485,088 bytes, SHA-256 `43F1B9587E3293E35FD0BD7C369CFB660063805B72871DF7E9034879EF6B666D`. Packaged verification passed product metadata, eight diagnostics, no secret exposure, HAI `never_direct`, normal close, port release, and byte-identical changed runtime files.

## 2.3.27 - 2026-08-13

### Truthful workspace invitation lifecycle

- Moved invitation creation, resend, revocation, and acceptance rendering into the deferred Workspace module while authenticated API calls, exact payloads, session persistence, and workspace reload authority remain in `public/app.js`.
- Kept failed pre-commit actions inline and retryable, blocked duplicate submissions, and rendered one-time invitation links before attempting a follow-up refresh so committed links are not lost or falsely reported as failed.
- Separated server acceptance, browser-session persistence, and workspace reload outcomes. A committed invitation acceptance or revocation remains a truthful success when only local persistence or the subsequent refresh fails.

### Resource, security, browser, and Windows verification

- Reduced initial app-plus-localization delivery by 6,435 raw, 843 gzip, and 598 Brotli bytes compared with 2.3.26. Invitation controls remain absent from Overview and load only with Workspaces or an invitation URL.
- The full local gate passes 112 suites/854 tests, the 5/5 recommendation safety evaluation, two zero-vulnerability audits, five-secret production validation, and a real-Mongo 15,000-card profile at 642.4 ms measured p95 and 307.4 MB peak RSS with no provider writes.
- In-app Browser acceptance passed one-time fingerprinted Workspace loading, read-only demo controls, English/Dutch rendering, invitation-query removal, desktop/mobile containment, and zero current console warnings or errors.
- Built and verified unsigned `Sneup-Setup-2.3.27.exe`: 109,484,457 bytes, SHA-256 `6BF9B9918DD5B3B494504964B7620337A530B86B59301BFEE3901857FF53B1E4`. Packaged verification passed product metadata, eight diagnostics, no secret exposure, HAI `never_direct`, normal close, port release, and byte-identical changed runtime files.

## 2.3.26 - 2026-08-09

### Demand-loaded and truthful first-run setup

- Moved the complete browser and Windows first-run setup renderer, Dutch catalog, diagnostics presentation, and support-file controls into a retry-safe module that loads only when **Set up** is opened.
- Kept diagnostics API access, desktop IPC, persisted startup settings, local completion state, and connector navigation in `public/app.js`; the deferred renderer has no fetch, credential, cookie, session, storage, or desktop authority.
- Fixed startup-mode commit semantics so a failed desktop save remains retryable and cannot mark setup complete. A committed preference followed by a failed restart is reported as saved without inviting a duplicate write.
- Added cancellation and generation guards for stale diagnostics, plus duplicate-action locks for desktop save and support-file creation.

### Resource, security, browser, and Windows verification

- Reduced initial app-plus-localization delivery by 9,040 raw, 2,554 gzip, and 2,087 Brotli bytes compared with 2.3.25. The 15,025-byte setup module remains absent from Overview.
- The full local gate passes 112 suites/849 tests, the 5/5 recommendation safety evaluation, two zero-vulnerability audits, five-secret production validation, and a real-Mongo 15,000-card profile at 797.8 ms p95 and 426.6 MB peak RSS with no provider writes.
- In-app Browser acceptance passed deferred one-time fingerprinted loading, eight English/Dutch diagnostics, refresh, responsive containment, safe evidence escaping, and zero current console warnings or errors.
- Built and verified unsigned `Sneup-Setup-2.3.26.exe`: 109,483,564 bytes, SHA-256 `6A005D09AEB71E6D15D9E1AC460DCA6D0F5405D35E3A4F9A7F0BF675962B6E7C`. Packaged verification passed product metadata, eight diagnostics, no secret exposure, HAI `never_direct`, normal close, port release, and byte-identical changed runtime files.

## 2.3.25 - 2026-08-09

### Notification policy correctness and deferred controls

- Fixed status-only notification-policy updates so configured daily operations brief schedules remain intact, and require an explicit server-side `confirmActivation` before a paused policy can become active.
- Moved policy create/edit, activate, pause, and external test controls into the deferred Approval module while exact request bodies, authenticated API calls, encrypted destinations, refreshes, and provider authority remain in `public/app.js`.
- Added duplicate-action locks and truthful post-commit handling: a saved policy or delivered external test is no longer presented as failed when only the subsequent ledger refresh fails.

### Resource, security, browser, and Windows verification

- Reduced the initial app-plus-localization payload by 12,974 raw, 2,071 gzip, and 1,731 Brotli bytes compared with 2.3.24. The expanded Approval module remains absent from Overview and loads only when Approvals opens.
- The full local gate passes 111 suites/843 tests, the 5/5 recommendation safety evaluation, two zero-vulnerability audits, five-secret production validation, and a 15,000-card real-Mongo profile with 604.4 ms measured p95 and 330.6 MB peak RSS.
- In-app Browser acceptance passed one shared-fingerprint Approval load, English/Dutch rendering, read-only demo boundaries, layout containment, and zero current console errors. Seeded DOM coverage verifies protected policy flows without inventing database or provider state.
- Built and verified unsigned `Sneup-Setup-2.3.25.exe`: 109,482,700 bytes, SHA-256 `E4D290CA4FAFC9762017BF2E370E42549EAE626ED18D464B0FE008CDD908D165`. Packaged verification passed eight diagnostics, no secret exposure, HAI `never_direct`, normal close, port release, and byte-identical changed runtime files.

## 2.3.24 - 2026-08-09

### Demand-loaded inbound worker-response mapping

- Moved the Generic Webhook inbound worker-response mapping editor into the existing deferred Connector module, while authenticated reads, encoded account routing, exact save payloads, refreshes, and all credential/provider authority remain in `public/app.js`.
- Added complete English/Dutch rendering, bounded and escaped options, exact source-ID validation, stale-search cancellation, member/card reset semantics, duplicate-pair and 100-mapping limits, modal cleanup, and duplicate-submit protection.
- Fixed post-commit refresh handling across worker-response and all ten account-selection saves: a successful write followed by a failed list refresh is now reported as saved, so operators are not invited to repeat an already-committed mutation.

### Resource, security, browser, and Windows verification

- Reduced the initial app-plus-localization payload by 9,524 raw, 1,920 gzip, and 1,556 Brotli bytes compared with 2.3.23. The expanded Connector module remains absent from Overview and is fetched only when Connectors opens.
- The full local gate passes 111 suites/838 tests, the 5/5 recommendation safety evaluation, two zero-vulnerability audits, five-secret production validation, and a 15,000-card real-Mongo profile with 526 ms measured p95 and 328.3 MB peak RSS.
- In-app Browser acceptance passed Overview exclusion, one shared-fingerprint Connector load, 117 catalog entries, English/Dutch rendering, layout containment, and zero current console errors. Seeded DOM coverage verifies the connected-account-only mapping editor without inventing provider state.
- Built and verified unsigned `Sneup-Setup-2.3.24.exe`: 109,481,903 bytes, SHA-256 `77240C43039263D0C785471BA44148272ABE3E533B4D18AD9041F516DCC21D6E`. Packaged verification passed eight diagnostics, no secret exposure, HAI `never_direct`, normal close, and port release.

## 2.3.23 - 2026-08-09

### Demand-loaded connector account selection

- Moved all ten provider account-selection forms into the existing retry-safe Connector module, so Overview no longer downloads their markup, Dutch copy, option rendering, or form-construction code.
- Kept authenticated option reads, exact endpoint selection, encoded account identifiers, POST payloads, successful refreshes, and every credential/provider boundary in `public/app.js`. The deferred renderer has no fetch, token, cookie, session, storage, or provider authority.
- Added bounded option rendering, safe dynamic escaping, sole-option selection, empty-choice handling, duplicate-submit locking, cancellation, and retry after a failed save for Figma, SharePoint, Mural, Xero, Procore, Resource Guru, Basecamp, Asana, Confluence, and Jira.

### Resource, security, browser, and Windows verification

- Reduced the initial app-plus-localization payload by 21,493 raw, 2,131 gzip, and 1,610 Brotli bytes compared with 2.3.22. The Connector module remains deferred; its complete English/Dutch selection UI is fetched only when Connectors opens.
- Added all-ten-form values, localization, exact-body, empty-choice, cancellation, duplicate-submit, retry, escaping, no-draft, and source-authority regressions. The full local gate passes 111 suites/835 tests, the 5/5 recommendation safety evaluation, two zero-vulnerability audits, and five-secret production-style validation.
- In-app Browser acceptance passed Overview exclusion, one-time shared-fingerprint Connector loading, 117 connectors, four explicit catalog-only providers, English/Dutch rendering, layout containment, and zero current console errors.
- Built and verified unsigned `Sneup-Setup-2.3.23.exe`: 109,480,743 bytes, SHA-256 `97EE2D6E07D24B187CB2FCF1A223FF9C01AE1D5191FA37880A1B9FF17B1F3871`. Packaged verification passed eight diagnostics, no secret exposure, HAI `never_direct`, normal close, and port release.

## 2.3.22 - 2026-08-09

### Demand-loaded workspace policy forms

- Moved all five workspace policy form renderers into the existing retry-safe Workspace module, so Overview no longer downloads their markup, Dutch catalog strings, or form-construction code.
- Kept exact update-payload construction, authenticated API writes, saved-draft cleanup, error handling, and workspace refresh authority in the application controller. The deferred module can only render a form and delegate guarded UI callbacks.
- Preserved the fixed Robert ownership boundary for high- and critical-risk decision queues and the approval-only, no-direct-provider-write behavior of every policy.

### Resource, security, browser, and Windows verification

- Reduced the initial app-plus-localization payload by 14,798 raw, 2,140 gzip, and 1,673 Brotli bytes compared with 2.3.21. The Workspace module remains deferred and the combined source is still 2,533 raw bytes smaller after it is opened.
- Added five-form rendering, localization, values, draft-key, cancellation, persistence-hook, retry, source-authority, and fixed-owner regressions. The full local gate passes 111 suites/831 tests, the 5/5 recommendation safety evaluation, two zero-vulnerability audits, and five-secret production-style validation.
- In-app Browser acceptance passed Overview exclusion, one-time shared-fingerprint Workspace loading, English/Dutch rendering, read-only demo controls, layout containment, and zero current console warnings/errors.
- Built and verified unsigned `Sneup-Setup-2.3.22.exe`: 109,479,448 bytes, SHA-256 `7AEF17707C0B79EE7832C8AB321228172544E3C386529957B28B9E0498923E21`. Packaged verification passed eight diagnostics, no secret exposure, HAI `never_direct`, normal close, and port release.

## 2.3.21 - 2026-08-09

### Demand-loaded Forecasts and Reports

- Moved Forecasts, capacity evidence, delivery scenarios, project mappings, and report-list rendering into retry-safe modules loaded only when an operator opens the corresponding view.
- Kept every API request, capacity/project-mapping write, report download, session boundary, and provider authority in the authenticated application controller. The renderers receive only named guarded callbacks and cannot fetch, persist, approve, or execute provider actions.
- Added complete English/Dutch Forecasts and Reports operator chrome while preserving risks, assumptions, provider names, member and board evidence, identifiers, report labels, and server errors verbatim.

### Resource, security, browser, and Windows verification

- Reduced the initial app-plus-localization payload by 14,902 raw, 3,391 gzip, and 2,579 Brotli bytes compared with 2.3.20. The 31,512 raw bytes of Forecasts/Reports rendering are fetched only when needed and share the command-center asset fingerprint.
- Added rendering, guarded-action delegation, localized-form, catalog-completeness, form-persistence, retry, CSP, source-authority, and fingerprint regressions. The full gate passes 111 suites/830 tests, the 5/5 recommendation safety evaluation, two zero-vulnerability audits, and five-secret production-style validation.
- In-app Browser acceptance passed English/Dutch rendering, exact operational-evidence preservation, deferred loading, shared fingerprint reuse, layout containment, and zero current console warnings/errors.
- Built and verified the unsigned Windows 11 installer. The packaged app reports 2.3.21, contains both deferred modules, exposes no secrets, keeps HAI at `never_direct`, closes normally, and releases its loopback port.

## 2.3.20 - 2026-08-09

### Demand-loaded Work Signals and graph review

- Moved Work Signals, adapter contracts, normalized graph summaries, decision candidates, dependency review, graph-item detail, and ledger graph context into a retry-safe module loaded only when an operator opens a view that needs it.
- Kept API, session, credential, recommendation, and dependency-review authority in the authenticated application controller. The renderer receives only guarded callbacks and cannot fetch, persist, approve, or execute provider actions.
- Added complete English/Dutch Work Signals operator chrome while preserving provider names, descriptions, identifiers, people, evidence, errors, and safe-write contracts verbatim.
- Rejected non-HTTPS and credential-bearing provider evidence links before rendering them as links; unsafe text remains visible but inert.

### Resource, browser, security, and Windows verification

- Reduced the initial app-plus-localization payload by 23,776 raw, 4,684 gzip, and 3,359 Brotli bytes compared with 2.3.19. The 37,369-byte Work Signals renderer is fetched only when needed and shares the command-center asset fingerprint.
- Added rendering, local-filter, guarded-action delegation, exact-evidence, URL-safety, localization-completeness, retry, CSP, source-boundary, and fingerprint regressions. The full gate passes 110 suites/824 tests, the 5/5 recommendation safety evaluation, two zero-vulnerability audits, and five-secret production-style validation.
- In-app Browser acceptance passed English/Dutch rendering, filter interaction, deferred loading, shared fingerprint reuse, exact evidence preservation, layout containment, and zero current console warnings/errors.
- Built and verified the unsigned Windows 11 installer. The packaged app reports 2.3.20, includes the deferred module, exposes no secrets, keeps HAI at `never_direct`, closes normally, and releases its loopback port.

## 2.3.19 - 2026-08-09

### Demand-loaded approval operations

- Moved the complete approval and operations-ledger renderer into a retry-safe module loaded only when Approvals opens, while leaving every API call, session boundary, and consequential action in the authenticated application controller.
- Localized approval queues, recommendations, protected payload review, findings, health, reconciliation, notification policy and delivery history, follow-ups, outcomes, and audit chrome in English and Dutch while preserving free text, identifiers, provider evidence, errors, and payload JSON verbatim.
- Split approval-only and workspace-only Dutch catalogs into their corresponding deferred modules and added a guarded runtime catalog registry that rejects prototype keys.

### Resource, security, and release verification

- Reduced the initial app-plus-localization payload by 21,649 raw, 3,876 gzip, and 3,008 Brotli bytes compared with 2.3.18; approval and workspace catalog cost is paid only when those operator views open.
- Added approval rendering, guarded-action delegation, semantic localization, exact-evidence preservation, lazy-catalog, prototype-key, CSP, and asset-fingerprint regressions. The full gate passes 109 suites/817 tests, the 5/5 recommendation safety evaluation, two zero-vulnerability dependency audits, and five-secret production-style validation.
- Built and verified the unsigned Windows 11 installer. The packaged app reports 2.3.19, remains demo/read-only by default, exposes no secrets, keeps HAI at `never_direct`, closes normally, and releases its loopback port.

## 2.3.18 - 2026-08-09

### Demand-loaded workspace administration

- Moved workspace, people, invitation, action-policy, safety-history, feature-rollout, integrity, and retention rendering out of the eager command-center bundle into a retry-safe module loaded only when Workspace administration opens.
- Kept every consequential API mutation in the existing trusted controller. The renderer receives only explicit callbacks and has no API, session-token, or persistence access of its own.
- Localized the complete workspace administration renderer in English and Dutch while preserving workspace names, people, provider identities, policy labels, audit actors, feature descriptions/reasons, and integrity evidence verbatim.

### Resource, browser, and release verification

- Reduced the eager app script from 310,673 to 291,628 bytes. Despite the larger localization catalog, the initial app-plus-localization payload is 13,128 raw, 2,062 gzip, and 1,350 Brotli bytes smaller; the 25,229-byte workspace renderer is fetched only on demand.
- Added renderer, action-delegation, localization-completeness, guarded-callback, CSP, and shared-cache-fingerprint regressions. In-app Browser QA caught and fixed missing guarded callback definitions before release, then passed English/Dutch, refresh, fingerprint reuse, and 480x844 containment with zero current console warnings/errors.
- The full gate passes 108 suites/809 tests, the 5/5 safety evaluation, two zero-vulnerability dependency audits, purpose-separated production-secret validation, and the verified 2.3.18 Windows package.

## 2.3.17 - 2026-08-09

### Demand-loaded connector marketplace

- Moved connector catalog rendering, safety status, freshness and credential-rotation guidance, pagination, filtering, and account actions out of the eager command-center bundle into a retry-safe module loaded only when Connectors is opened.
- Start the connector API read and module fetch in parallel, reuse one module instance across search/filter/pagination renders, and reset failed loads so a refresh can genuinely retry instead of leaving a blank view.
- Localized the complete connector operator chrome in English and Dutch while preserving provider names, descriptions, scopes, availability reasons, safety summaries, and sync evidence verbatim.

### Cache correctness and verification

- Expanded the shared content fingerprint and immutable-cache allowlist to every initial and demand-loaded command-center asset, preventing connector-, help-, persistence-, or localization-only releases from serving stale browser code.
- Reduced the eager app script by 18,823 raw bytes and 3,526 gzip bytes. Even after the larger Dutch catalog, the initial app-plus-localization payload is 9,878 raw bytes and 1,215 gzip bytes smaller; the 21,089-byte connector renderer is fetched only on demand.
- Added connector rendering/action/catalog-completeness tests and per-asset fingerprint mutation tests; the full gate passes 107 suites/805 tests, two zero-vulnerability audits, browser acceptance, and Windows packaging.

## 2.3.16 - 2026-08-09

### English and Dutch operator experience

- Added a persistent English/Nederlands language control and a dependency-free browser catalog for the command-center shell, setup and diagnostics guidance, command palette, help center, and primary mission-control workflow chrome.
- Localized dates, numbers, counts, confidence labels, empty states, and contextual help search while leaving provider, user, audit, and source-evidence text unchanged.
- Added complete static-shell and help-catalog coverage, locale persistence/restoration checks, accessibility-label regression coverage, and desktop plus compact-viewport browser acceptance in both languages.

### Security and resource use

- Kept localization entirely local: no translation service, credentials, provider traffic, database work, polling, runtime dependency, or server module is added.
- The explicit catalog is 33,577 bytes raw, 11,269 bytes with gzip, and 9,887 bytes with Brotli; demo startup still imports 251 modules without loading Mongoose.
- Verified the full 105-suite/799-test quality gate, both zero-vulnerability dependency audits, purpose-separated release secrets, and the Windows 11 installer runtime.

## 2.3.15 - 2026-08-09

### Portfolio-scale mission control

- Added a guarded MongoDB-backed profiler for 60 boards, 300 lists, 15,000 cards, 100 members, and 60 analytics records through the real mission-control path.
- Added the compound workspace/open-card/due/risk index used by the portfolio query and verify its winning MongoDB plan during the scale run.
- Replaced eager focus, risk, and command evidence construction with stable bounded ranking so only visible winners receive rich evidence payloads.

### Performance and verification

- Reduced worst-case 15,000-card focus generation from 42.8 ms to 16.2 ms, risk generation from 50.5 ms to 19.9 ms, and command generation from 90.3 ms to 43.2 ms in the same local benchmark.
- Reduced worst-case command-generation peak RSS from about 165 MB to 106 MB while preserving score order, tie stability, evidence, and approval boundaries.
- Added regressions for bounded evidence materialization, deterministic ties, and graph-score displacement; the real-path scale profile passed at 1.26 seconds cold and 0.61-1.11 seconds repeated-read latency with no provider writes.

## 2.3.14 - 2026-08-09

### Context-sensitive operator help

- Added a searchable in-app help center with task guidance for all eight command-center views plus setup, decision safety, and privacy controls.
- Open the current view's topic from the compact Help control or `F1`, then hand off directly to the relevant existing workflow.
- Kept recommendations, approvals, executions, and ambiguous-result reconciliation explicitly separate in the operator guidance.

### Accessibility and resource use

- Added labelled modal semantics, contextual focus, focus containment and restoration, Escape handling, backdrop close, and a stacked narrow-screen layout.
- Render the bounded static catalog only when help first opens, using DOM APIs and no storage, API requests, database work, provider traffic, polling, or new runtime dependency.
- Added isolated browser-DOM coverage for every topic, context fallback, search, keyboard behavior, focus containment, application routing, and browser-script initialization.

## 2.3.13 - 2026-08-09

### Draft recovery and presets

- Added workspace-scoped session draft recovery to reviewed forecast, capacity, project-mapping, retention, rollout, and internal policy forms.
- Added up to eight named local presets per eligible form and workspace, with explicit save, apply, replace, and delete controls.
- Clear drafts only after a confirmed API success; canceling or a failed request preserves recoverable work.

### Security, compatibility, and resource use

- Restrict persistence to explicit field allowlists and reject credential, token, email, destination, confirmation, evidence, response, comment, and message fields even if a form requests them.
- Bound records, values, field counts, preset counts, names, and storage failures; malformed, unavailable, or oversized browser storage fails closed.
- Keep drafts in session storage and load the standalone persistence module before the application without adding database work, provider traffic, polling, or startup dependencies.
- Added isolated browser-DOM coverage plus a live disposable-workspace browser flow for draft save, preset apply, recovery, successful-save cleanup, and narrow-layout behavior.

## 2.3.12 - 2026-08-09

### AI resilience and safety

- Routed every model-backed chat response through one demand-loaded gateway with bounded context, history, output, timeout, and retry behavior.
- Added deterministic local responses for absent credentials, initialization errors, authentication failures, rate limits, timeouts, provider outages, malformed replies, and oversized replies.
- Persisted and returned provider-versus-deterministic provenance without changing the response field or allowing chat output to approve an external action.
- Redacted provider failures to status, reason, and bounded code metadata instead of logging provider error bodies or prompts.

### Compatibility and resource use

- Deferred the optional OpenAI SDK until the first configured provider request and avoided routine offline fallback logging.
- Rejected blank chat messages and unsupported channels before database or provider work while preserving all supported chat channels and quick-response behavior.

## 2.3.11 - 2026-08-09

### Performance and resource use

- Deferred API routes, live database services, provider sync engines, and background workers until the selected runtime or requested endpoint needs them.
- Kept health, HAI metadata, feature controls, mission control, the daily brief, and Job Health independent of MongoDB in explicit demo mode.
- Added `npm run profile:startup` and regression guards for one-time router loading and the Mongo-free demo overview.

### Compatibility and resilience

- Preserved every versioned and legacy API path through one shared lazy router instance and forwarded first-load failures through the existing error boundary.
- Kept live workspace normalization, migration preflight, worker startup, provider approval gates, and graceful shutdown behavior unchanged.

## 2.3.10 - 2026-08-09

### Added

- Added an authenticated, redacted runtime-diagnostics endpoint covering the application runtime, workspace mode, database, Trello, production secrets, remote API protection, cloud tunnel, and provider-write safety.
- Joined those checks and exact remediation actions into first-run setup, with a refresh control and connector handoff.
- Added a desktop-only support-file action that writes configuration status under Electron user data and opens the location in File Explorer.
- Added a repeatable Windows packaged-runtime verifier for health, diagnostics, HAI safety, resource use, normal close, and port release.

### Security and resilience

- Support files are created atomically with owner-only file permissions and exclude environment values, credentials, tokens, connection strings, logs, and user data.
- The renderer receives one bounded IPC method and only the created filename; it cannot choose a path or read the file through the desktop bridge.
- The shared setup drawer now exposes labelled modal-dialog semantics.

## 2.3.7 - 2026-08-09

### Added

- Added owner-controlled workspace retention policies for terminal job history, board-health snapshots, performance history, finalized notification receipts, and revoked or expired credentials.
- Added a bounded preview, exact-workspace manual confirmation, daily opt-in worker, distributed lease protection, and `npm run verify:data-retention` real-Mongo proof.

### Security and resilience

- Retention is disabled by default, owner-only, range-bounded, and audited before and after every destructive category batch.
- Audit events, approvals, recommendations, Trello action attempts, active credentials, non-final notification deliveries, and current project/work-graph records are never retention candidates.
- The worker and manual API share one workspace lease; failed pre-delete audit storage blocks deletion and every delete re-applies the workspace, status, and cutoff query to the exact previewed IDs.

### Performance

- Each retention category uses a compound workspace/status/date index and reads at most 501 IDs per pass, with a 200-record default.
- Retention data loads only with Workspace Administration and performs no provider reads or writes.

## 2.3.6 - 2026-08-09

### Added

- Added a workspace-scoped data-integrity scanner and guarded repair workflow to Workspace Administration.
- Added `npm run repair:data` as a dry-run-first support command; apply mode requires `--apply --confirm repair-derived-state`.
- Added real-Mongo verification for list counts, member assignment/workload caches, audit evidence, and review-only provider ambiguity.

### Security and resilience

- Repairs are bounded, fingerprinted, re-scanned immediately before apply, atomically skipped on drift, and limited to derived internal state.
- Trello reconciliation, notification delivery claims, executing recommendations, and stale job runs remain review-only; the repair path never imports a provider client or retries an external action.
- Trello board, list, card, comment, and member identifiers are now unique per Sneup workspace instead of globally, with fail-closed duplicate preflight and guarded legacy-index removal.

### Performance

- Integrity scans query independent collections concurrently, aggregate card sources in two bounded database operations, return at most 500 findings, and load only with Workspace Administration.
- A 30-request local live sample measured 14.01 ms p50 and 23.71 ms p95 with a 119.5 MB server working set after browser QA.

## 2.3.5 - 2026-08-09

### Added

- Added workspace-scoped rollout controls for connector synchronization, capacity scenarios, work-graph decisions, and HAI proposals.
- Added deterministic workspace/actor percentage rollout, optimistic revisions, bounded change history, and manager-facing administration controls.
- Added the rollout collection to migration, export, deletion, and guarded real-Mongo verification coverage.

### Security and resilience

- Optional capabilities fail closed when rollout storage is unavailable in live mode; explicit read-only demo mode retains safe defaults.
- Rollout controls cannot grant permissions, approve recommendations, execute provider writes, disable audits, or weaken emergency-stop and workspace boundaries.
- Rollout history is capped at 50 entries, database lookup caching is capped at 250 workspaces for 30 seconds, and connector synchronization skips before account/provider reads when paused.

### HAI and compatibility

- The HAI manifest advertises its `hai_proposals` rollout control and OpenAPI documents the paused/unavailable response.
- Existing `/api` routes remain compatible while the command center uses the versioned rollout API.

## 2.3.4 - 2026-08-09

### Added

- Added a strict `/api/v1` JSON contract with `ok`, `data`, `error`, and bounded request metadata.
- Added one server-generated request ID across the response header, versioned envelope, and sanitized request diagnostics.

### Changed

- The command center now routes JSON API traffic through `/api/v1` and unwraps responses in one shared parser.
- The HAI manifest and OpenAPI document now advertise versioned snapshot and proposal endpoints.

### Compatibility and performance

- Existing `/api` routes remain available, external webhooks and OAuth callbacks retain their established protocol paths, and streamed reports, exports, and OpenAPI remain unwrapped.
- An 800-request alternating local benchmark measured 1.45 ms legacy and 1.59 ms versioned average latency; request IDs are skipped for cacheable frontend assets.

## 2.3.3 - 2026-08-09

### Added

- Protected startup, scheduled, worker, API, and manual jobs now acquire one expiring MongoDB lease per workspace and job, with heartbeat renewal and token-bound release.
- Job Health shows active protected runs, skipped contention, and the bounded skip reason while keeping lease tokens and instance identity private.

### Fixed

- Multiple Sneup processes sharing MongoDB can no longer run the same protected workspace job concurrently.
- Manual job requests now return a conflict when another instance owns the job instead of reporting a false successful trigger.
- Stale abandoned run records no longer inflate the current running-job count after their lease expires.
- Intervention outcome verification is now registered in Job Health and can be triggered safely through the same leased manual-job contract.

### Verification

- A disposable MongoDB 7 race test proved exactly one simultaneous lease winner, wrong-token release rejection, clean release/reacquisition, expiry takeover, and private-field exclusion.

## 2.3.2 - 2026-08-09

### Fixed

- Production live mode now fails closed when MongoDB is unavailable instead of silently changing the process into demo mode.
- Partial startup failures stop ngrok, close any opened HTTP server, disconnect MongoDB when necessary, and propagate a stable error to the embedding desktop app.
- The Windows app offers an explicit read-only demo restart after a live-database startup failure, preventing a persisted live preference from trapping the user in repeated failed launches.
- HAI snapshots now serialize populated board and card references as stable public identifiers instead of `"[object Object]"`.
- Electron production files are now included in the repository lint and GitHub quality gates.

### Security

- The desktop recovery dialog uses a stable non-secret message and never includes the underlying MongoDB connection error or URI.
- Explicit demo mode remains read-only and skips MongoDB; development-only fallback remains visibly labelled and provider-write blocked.

## 2.3.1 - 2026-08-09

### Fixed

- Workspace migration now covers all 39 workspace-scoped collections instead of omitting identity, token, notification, capacity, webhook, and connector-signal records from its older duplicated model list.
- Migration, owner export, and permanent workspace deletion now share one authoritative collection registry, preventing future data-lifecycle drift.
- Installation guidance no longer recommends unsupported Node.js 14 or MongoDB 4 deployments.

### Verification

- Added a guarded disposable-Mongo migration verifier that seeds one legacy record per collection, confirms all 39 appear in preflight, backfills all 39, and verifies none remain unscoped.
- CI now tests Sneup on Node.js 24 LTS while retaining Node.js 22 as the minimum supported server runtime.

## 2.3.0 - 2026-08-09

### Added

- Owner-confirmed permanent deletion for archived workspaces, including a minimal deletion receipt and resumable cleanup.
- Guarded real-Mongo workspace deletion verification across all 39 workspace-scoped collections.
- Machine-readable product and capability metadata at `GET /api` while `/` remains the command center.

### Fixed

- Workspaces in the irreversible `deleting` state can no longer be changed or reactivated.
- Every Mongoose model is reload-safe, eliminating model recompilation warnings and hot-reload failures.
- The formerly unreachable JSON root metadata is now available at its explicit API path.

### Performance

- Natural NLP modules load only when card-content analysis is requested instead of during every server or desktop startup.
- Routine successful HTTP requests no longer create info-level disk logs by default; rejected, failed, and slow requests remain bounded diagnostics.

### Security

- Workspace credentials and identity tokens are removed before the workspace record completes deletion, with provider writes blocked throughout the deleting state.
- Cleanup leases, resumable progress, bounded retries, and five delayed orphan sweeps prevent interrupted or in-flight work from silently retaining workspace data.

## 2.2.0 - 2026-08-09

### Added

- Owner-only streamed workspace export with bounded database cursors and a completion manifest.
- Workspace export control in the Windows and browser command center.

### Fixed

- Suspended, archived, or missing workspaces now fail closed before Trello policy resolution or execution.
- Connector credential ciphertext is excluded from ordinary Mongoose queries and selected only by credential-consuming paths.
- Security retention jobs can now persist their declared job type in the observability ledger.
- Unsigned Windows builds retain Sneup executable metadata and icon resources instead of disabling resource editing.
- Packaged Windows builds now use file-only production logging, preventing a detached console pipe from terminating the desktop app during startup.

### Security

- Workspace exports recursively omit connector credentials, token hashes and prefixes, passwords, signing secrets, and encrypted notification destinations.
- Export requires an authenticated workspace owner and records start/completion audit evidence.

## 2.1.0 - 2026-08-08

### Added

- Redacted runtime doctor and support bundle commands.
- Readiness endpoint with explicit demo/live and critical-path state.
- Audited deployment-wide provider-write emergency stop.
- GitHub Actions quality gates and unsigned Windows installer artifact build.
- Production audit, acceptance, security, runbook, traceability, and verification documents.
- Authenticated ngrok ingress with fail-closed startup and graceful shutdown.
- Least-privilege HAI connector for bounded operations snapshots and approval-gated proposals.

### Security

- Provider writes can be stopped globally before workspace policy evaluation or execution claim.
- Diagnostics report configuration state without returning credential or connection-string values.
- HAI cannot approve or execute its own proposals, and ngrok cannot start with missing, weak, or placeholder remote-access credentials.
