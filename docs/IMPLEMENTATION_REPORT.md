# Sneup Implementation Report

## 2.3.39 continuation

Sneup now treats connector disconnect as an authoritative local lifecycle transition instead of an unaudited hard delete. The operator must confirm the exact account name, acknowledge that provider authorization is unchanged, and submit the current account revision. The transition shares the connector synchronization workspace lease, removes stored credentials and OAuth refresh leases, preserves historical read-only evidence, and rolls back if audit evidence cannot be recorded.

Disabled and reconnect-required accounts are rejected before feature evaluation, OAuth refresh, provider pacing, or adapter reads. Credential rotation and OAuth authorization reconnect the existing account and clear stale failure/disconnect state. Focused tests, the full 131-suite/947-test gate, browser QA, and a guarded real-Mongo lifecycle verifier pass with zero provider reads or writes after disconnect.

## 2.3.29 continuation

Sneup's shared Mongoose connection now defaults to a production-bounded pool: 20 application sockets per MongoDB server and process, zero idle minimum, two connections established at once, 60-second idle retirement, and a five-second wait queue. Connection, socket, selection, and model-buffer waits are bounded and every override fails closed outside its supported range. Reconnecting or embedding startup does not add duplicate connection listeners.

A disposable local MongoDB run completed 100 concurrent reads in 115.5 ms, remained under the 20-socket cap, kept exactly one listener per connection event through reconnect, and dropped its database. The 15,000-card portfolio path remained below its latency/memory budgets; browser, HAI, ngrok contracts, security gates, and packaged Windows behavior also passed.

The verified local installer is `release/Sneup-Setup-2.3.29.exe`, 109,485,792 bytes, unsigned, with SHA-256 `CCBC1B7C8A7BA15F5B15DC8DEAAD4EB23A00D9303994379238ABBD88F15D95FA`.

## 2.3.28 continuation

Sneup no longer saves API-token/session/user activity metadata on every authenticated request. The request path still reads and validates the presented credential, hash, expiry, revocation status, user status, role, permissions, and workspace each time. Only `lastUsedAt` and `lastSeenAt` are coalesced into atomic updates at most once every five minutes, and each update requires the record to remain active.

A disposable real-Mongo profile resolved the same session 100 times, retained 100 credential lookups, and reduced activity writes from 200 to two. Full quality passed 112 suites/855 tests, zero-vulnerability audits, release-secret separation, and a 15,000-card profile below its 5-second/512-MB budgets. Browser QA passed demand-loaded Workspace rendering, demo write controls, English/Dutch containment, and zero current errors.

The verified local installer is `release/Sneup-Setup-2.3.28.exe`, 109,485,088 bytes, unsigned, with SHA-256 `43F1B9587E3293E35FD0BD7C369CFB660063805B72871DF7E9034879EF6B666D`.

## 2.3.27 continuation

Sneup now constructs invitation creation, resend, revocation, and acceptance UI only after Workspace administration opens or an invitation URL is received. The deferred renderer owns localized bounded DOM and transient action state; the controller continues to own exact authenticated API calls and payloads, session-token persistence, workspace reload verification, and every provider boundary.

Failed pre-commit actions remain inline and retryable, active submits are locked, and one-time secure links render before the follow-up Workspace refresh. Server acceptance and revocation are reported as committed even if only session persistence or the later reload fails, preventing duplicate or misleading actions.

Initial app plus localization is 6,435 raw, 843 gzip, and 598 Brotli bytes smaller than 2.3.26. The full local gate passes 112 suites/854 tests, two zero-vulnerability audits, five-secret production validation, real-Mongo portfolio budgets, in-app Browser acceptance, and packaged Windows verification.

The verified local installer is `release/Sneup-Setup-2.3.27.exe`, 109,484,457 bytes, unsigned, with SHA-256 `6BF9B9918DD5B3B494504964B7620337A530B86B59301BFEE3901857FF53B1E4`.

## 2.3.26 continuation

Sneup now constructs browser and Windows first-run setup only after the operator opens **Set up**. The deferred module owns localized, escaped, bounded DOM plus transient diagnostics and action state; the application controller continues to own authenticated diagnostics reads, desktop settings and restart IPC, the local completion marker, and connector navigation.

Desktop setup is now transactional at the user-visible boundary: Sneup records completion only after the settings write commits, leaves pre-commit failures inline and retryable, and reports a saved preference truthfully if the subsequent restart request fails. Diagnostics refreshes cancel or ignore stale requests, and desktop save/support actions reject duplicate submissions.

Initial app plus localization is 9,040 raw, 2,554 gzip, and 2,087 Brotli bytes smaller than 2.3.25. The full local gate passes 112 suites/849 tests, two zero-vulnerability audits, five-secret production validation, real-Mongo portfolio budgets, in-app Browser acceptance, and packaged Windows verification.

The verified local installer is `release/Sneup-Setup-2.3.26.exe`, 109,483,564 bytes, unsigned, with SHA-256 `6A005D09AEB71E6D15D9E1AC460DCA6D0F5405D35E3A4F9A7F0BF675962B6E7C`.

## 2.3.25 continuation

Sneup now constructs notification policy create/edit, activation, pause, and external test controls only after Approvals opens. The deferred module owns localized bounded DOM and transient action locks; the authenticated controller owns exact request bodies, encoded API routes, ledger reads, encrypted destinations, sessions, and every provider boundary.

The notification service now preserves daily operations brief schedules during partial updates and independently requires `confirmActivation: true` when a policy transitions to active. UI actions close only after a committed save or delivery, remain retryable after pre-commit failures, and report a refresh-only failure without inviting duplicate external actions.

Initial app plus localization is 12,974 raw, 2,071 gzip, and 1,731 Brotli bytes smaller than 2.3.24. The full local gate passes 111 suites/843 tests, two zero-vulnerability audits, five-secret production validation, real-Mongo portfolio budgets, in-app Browser acceptance, and packaged Windows verification.

The verified local installer is `release/Sneup-Setup-2.3.25.exe`, 109,482,700 bytes, unsigned, with SHA-256 `E4D290CA4FAFC9762017BF2E370E42549EAE626ED18D464B0FE008CDD908D165`.

## 2.3.24 continuation

Sneup now constructs the Generic Webhook inbound worker-response mapping editor only after Account connectors is opened for a real connected account. The deferred module owns localized, escaped, bounded DOM and transient search state; the authenticated controller owns option reads, encoded endpoint routing, exact save bodies, connector refreshes, credentials, sessions, and provider authority.

Searches abort stale requests, clear stale member/card choices, and ignore out-of-order results. Exact source identifiers, duplicate source pairs, the 100-mapping bound, modal cleanup, duplicate submits, and explicit failed-save retries are enforced in the UI in addition to the existing server checks. A committed save followed by a failed connector-list refresh now remains a truthful success across this editor and all ten selection forms.

Initial app plus localization is 9,524 raw, 1,920 gzip, and 1,556 Brotli bytes smaller than 2.3.23. The full local gate passes 111 suites/838 tests, two zero-vulnerability audits, five-secret production validation, real-Mongo portfolio budgets, in-app Browser acceptance, and packaged Windows verification.

The verified local installer is `release/Sneup-Setup-2.3.24.exe`, 109,481,903 bytes, unsigned, with SHA-256 `77240C43039263D0C785471BA44148272ABE3E533B4D18AD9041F516DCC21D6E`.

## 2.3.23 continuation

Sneup now constructs its ten connector account-selection editors only after Account connectors is opened. The deferred renderer owns localized, escaped, bounded form markup and guarded UI delegation; the authenticated controller continues to own option reads, exact endpoint and body construction, API writes, refreshes, credentials, and every provider boundary.

The initial app plus localization is 21,493 raw, 2,131 gzip, and 1,610 Brotli bytes smaller than 2.3.22. The complete Connector module is 41,759 raw, 9,438 gzip, and 8,365 Brotli bytes and remains absent from Overview. The full local gate passes 111 suites/835 tests, two zero-vulnerability audits, purpose-separated release secrets, real-Mongo portfolio budgets, in-app Browser acceptance, and packaged Windows verification.

The verified local installer is `release/Sneup-Setup-2.3.23.exe`, 109,480,743 bytes, unsigned, with SHA-256 `97EE2D6E07D24B187CB2FCF1A223FF9C01AE1D5191FA37880A1B9FF17B1F3871`.

## 2.3.22 continuation

Sneup now constructs its five workspace policy editors only after Workspace administration is opened. The deferred renderer owns localized, escaped form markup and guarded UI delegation; the authenticated controller continues to own exact payload construction, API writes, successful-save cleanup, errors, refreshes, and every provider boundary. This removes 14,798 raw bytes from initial app-plus-localization delivery and adds complete seeded DOM/source regressions for each policy form.

## Connector Coverage

Sneup now includes an account connector marketplace for project-management tools used by human project managers from 2015 through 2026.

- Total connectors: 117 (113 bounded credential-backed readers; 4 catalog-only legacy, retired, or unavailable entries)
- Categories: 11
- Coverage includes work management, software delivery, communication, calendar/email, docs/knowledge, files/assets, whiteboards/design, time/finance/resourcing, CRM/support/stakeholders, automation/data, and incident/quality/monitoring.
- Major OAuth-ready providers include Jira, Asana, monday.com, ClickUp, Linear, Notion, Microsoft 365, Google Workspace, Google Forms, Mural, Canva, Adobe Creative Cloud, QuickBooks Online, Power BI, Slack, GitHub, GitLab, Zoom, Figma, Miro, Dropbox, Box, SharePoint, Xero, HubSpot, Salesforce, and Intercom. Power BI requests reviewed delegated `Report.Read.All` only and reads a capped report catalog without report contents, dashboards, datasets, workspace membership, descriptions, URLs, embeds, owners, subscriptions, users, or provider writes. Canva uses PKCE with an encrypted verifier in signed state, requests only `design:meta:read`, and reads capped design metadata without design content, pages, thumbnails, temporary links, owners, folders, assets, comments, approvals, or provider writes. QuickBooks Online uses reviewed Accounting API consent, retains only the selected opaque `realmId` returned in the OAuth callback, and reads capped sales-invoice status/date metadata without customers, invoice numbers, values, balances, payment data, descriptions, line items, addresses, URLs, attachments, taxes, or provider writes. Mural requests only `workspaces:read` and `murals:read`, requires selection of one authorized workspace, and reads capped active-mural metadata without mural content, widgets, comments, templates, rooms, people, URLs, sharing details, or provider writes. Google Forms requests only `drive.metadata.readonly` and reads a capped metadata index without form bodies, questions, responses, owners, URLs, sharing details, shared drives, or provider writes. SharePoint requires an explicit review of delegated `Sites.Read.All`, exposes only followed sites for selection, and then reads one bounded root-metadata page without file content, URLs, permissions, pages, lists, people, versions, sharing details, or provider writes. Xero requests only `accounting.invoices.read` plus offline access, requires selection of one authorized organisation, and reads capped sales-invoice status/date metadata without retaining contacts, invoice numbers, values, payment data, descriptions, line items, URLs, or provider writes.
- Token/manual connectors cover Trello, Wrike, Smartsheet, Airtable, Microsoft Project, Planner, Azure DevOps, Bitbucket, Confluence, Coda, Teamwork, Zoho Projects, Shortcut, Todoist, Zapier, Make, Tableau, Sentry, PagerDuty, Opsgenie, Jira Align, and more. Adobe Creative Cloud Libraries is a live OAuth connector with bounded metadata-only paging; it excludes elements, assets, files, renditions, collaboration, people, links, storage details, comments, and provider writes. OAuth access tokens are renewed before expiry under an atomic account lease with encrypted replacement and secret-free audit evidence. Opsgenie is a live API-key connector that requires an explicit US or EU endpoint, confirms the bounded current open-alert count, and reads one matching metadata collection with GET only; it excludes descriptions, aliases, responders, owners, teams, schedules, escalation policies, incidents, integrations, URLs, and provider writes. Basecamp is a live OAuth connector that requires selection of one authorized Basecamp 3 account and reads bounded project/to-do metadata with GET only; it excludes messages, schedules, documents, files, comments, client data, and hill-chart content. Coda is a live personal-access-token connector that requires an explicit document allowlist and reads table metadata only; it deliberately excludes row values, columns, pages, packs, and button actions. Teamwork is a live API-key connector that accepts only one HTTPS `*.teamwork.com` tenant, reads bounded project/task metadata with GET, and excludes private tasks, descriptions, comments, files, time, company, and billing data. Jira Align accepts a user-created tenant API token for one HTTPS `*.jiraalign.com` host, reads capped API v2 portfolio/program metadata with GET only and no resource expansion, and excludes descriptions, people, custom fields, dependencies, work items, planning details, URLs, and provider writes. Catalog-only entries explicitly state why Sneup cannot accept a new account link: Evernote is legacy-only, Pivotal Tracker is retired, and Height/Projectplace lack a verified bounded read-only contract.

- Todoist uses only fixed-host bounded GET requests for project and task metadata. Each response is capped at 1 MB by default, redirects and proxy use are disabled, task titles redact email addresses and URLs, and normalized evidence never retains provider URLs, descriptions, comments, attachments, or provider-write capability.

- Airtable requires an explicit base, table, and field allowlist. It uses capped fixed-host GET pages with redirects and proxy use disabled, rejects malformed or repeated pagination cursors, redacts email addresses and URLs in retained field values, and excludes unselected fields, provider URLs, and provider writes.

## Security Work

Fixed or mitigated:

- API access gate for non-local API access.
- Rate limiting, stricter CORS, request body limits, and local-only default host.
- Trello webhook HMAC verification.
- ObjectId and numeric query validation.
- Encrypted connector credentials and signed OAuth state.
- OAuth redirect URI host hardening.
- Regex escaping for card-name dependency searches.
- Demand-loaded optional OpenAI startup with bounded context, history, output, timeout, and no automatic retries. Every provider failure mode returns a deterministic local response with explicit provenance, and provider error bodies are not logged.
- Owner-controlled data retention is disabled by default, range-bounded, preview-first, protected by a cross-process workspace lease, and audited before and after every destructive category batch. It cannot target audit, approval, recommendation, provider-action, active credential, pending delivery, or current project/work-graph evidence.

Remaining hardening:

- Add a publisher certificate for Windows installer signing.
- Capture owner-controlled live-provider, production restore, hosted canary/rollback, and assistive-technology evidence.

## Resource Usage Work

Reduced avoidable resource use:

- Relationship analysis is now capped by `RELATIONSHIP_ANALYSIS_LIMIT` and runs in targeted card/board modes.
- Mission-control analytics lookup now batches latest analytics by board.
- Mission-control card counting now indexes cards by board/list/member instead of repeatedly scanning the whole list.
- Mission-control focus, risk, and command ranking retains only the stable top 10/12/12 candidates before constructing rich evidence, avoiding portfolio-sized discarded payloads.
- The live portfolio card query uses a compound workspace/open-card/due/risk index. `npm run profile:portfolio-scale` verifies the winning MongoDB plan and real service path against a guarded disposable 60-board/15,000-card dataset.
- Background workers pause automatically when MongoDB is not connected.
- The OpenAI SDK and client are not loaded or constructed unless a non-placeholder `OPENAI_API_KEY` is present and a non-quick chat response actually needs the provider.
- Duplicate Mongoose index declarations were removed to reduce startup warnings and index churn.
- The command center loads hidden views on demand and exposes bounded, recent response-time p50/p95 summaries for the known view APIs. The telemetry retains neither request data nor unbounded history.
- Context-sensitive help is a separate static browser module covering all command-center views, setup, decision safety, and privacy. It builds no hidden topic DOM until first open, and its search and rendering use no API request, storage, database work, provider traffic, polling, or new dependency.
- English/Dutch localization uses a 600-key startup catalog plus 373 approval-only and 145 workspace-only messages registered only with those deferred views. Exact-message translation, local date/number/plural formatting, and one bounded local-storage preference never auto-translate provider, user, audit, free-text, error, identifier, or payload evidence.
- Connector, workspace, and approval rendering use separate demand-loaded browser modules. Sneup starts each module fetch and API read concurrently, reuses controllers, and clears failed loads for retry. Compared with 2.3.18, initial app-plus-localization is 21,649 raw, 3,876 gzip, and 3,008 Brotli bytes smaller. All nine initial/deferred assets share a content-derived immutable-cache version.
- API rate limiting has a hard bounded bucket map, expires stale state first, evicts least-recently-used pressure state only when needed, and exposes aggregate capacity metrics without request identifiers.
- NLP imports only the tokenization, sentence splitting, TF-IDF, English AFINN sentiment, and Porter stemming modules used by Sneup. The Windows build excludes Natural's unused language packs, classifiers, WordNet, and unused storage-client dependencies while preserving the existing NLP implementations.
- NLP is now demand-loaded only when card-content analysis runs, so normal server and desktop startup do not initialize Natural. Routine successful requests also avoid disk logging unless explicitly enabled; rejected, failed, and slow requests remain visible.
- Retention scans use compound workspace/status/date indexes and cap each category at 500 records per pass, preventing indefinite operational-history growth without introducing an unbounded cleanup query.

Installer footprint:

- The verified Windows installer is 110.0 MB and its app archive is 65.4 MB. The targeted NLP packaging pass reduced the app archive from 109.6 MB by 40.3% and the installer from 119.2 MB by 7.7%.
- A smaller future desktop footprint would require a different shell such as Tauri, WebView2-only packaging, or a PWA install path.

## Windows Installer

Added:

- Electron desktop wrapper in `desktop/main.js`.
- Secure preload bridge in `desktop/preload.js`.
- `npm run desktop` for local desktop testing.
- `npm run build:installer` / `npm run dist:win` for Windows NSIS packaging.
- Current release target: `release/Sneup-Setup-2.3.21.exe`.

The verified local 2.3.21 installer is 109,479,199 bytes with SHA-256 `B9E47D19CFA2C65A5263558953DF92351E6DD53F680E7965B71D9887AD2A1587`. It is intentionally reported as unsigned until an owner-controlled publisher certificate is available. The packaged executable reports product/file version 2.3.21 and retains the Windows x64 native ngrok binding.

The desktop app starts Sneup on `127.0.0.1` and opens the command center in an app window. On first run it starts in demo mode. The workspace choice stores only the non-secret `demo` or `live` startup preference in the Electron user-data directory, then relaunches before Sneup initializes. Production live mode fails closed before opening the HTTP listener when MongoDB is unavailable. The Windows error dialog can persist an explicit read-only demo choice and relaunch, preventing a failed live preference from trapping the user. An explicitly set `SNEUP_DEMO_MODE` environment variable takes precedence over the local preference until the user chooses the recovery action.

## Verification

- Syntax checks passed for changed JavaScript files.
- The final quality gate passed 109 suites/817 tests, lint, and the 5/5 recommendation evaluation.
- Three current demo startup samples imported 251 modules at 71.4-73.2 MB RSS and served the complete initial overview at 75.5-76.3 MB RSS without loading Mongoose. Absolute timings varied under concurrent machine load, so the controlled bundle-size comparison is the release optimization evidence.
- The guarded real-Mongo scale profile passed 60 boards and 15,000 cards at 1.26 seconds cold and 0.61-1.11 seconds repeated-read latency; its exact query index was selected and provider writes remained false.
- The in-app Browser passed demand-loaded connector, workspace, and approval behavior, English/Dutch restoration, refresh/module reuse, exact evidence/payload preservation, shared asset versioning, desktop/480x844 containment, and zero current console errors. Focused DOM/source regressions cover the final lazy-catalog split.
- The packaged 2.3.19 demo used four processes, 359.9 MB working set, 294.2 MB private memory, and 1.531 cumulative CPU seconds in the repeatable verifier; normal close released every process and the loopback port.
- Production-only and complete dependency audits both reported zero vulnerabilities; the five-secret production release check passed without exposing values.
- Prior live disposable-workspace draft and preset coverage remains part of the browser acceptance evidence.
## 2026-08-09 Work Signals implementation

### Files and boundaries

- Added `public/workSignalsView.js` for Work Signals, adapter contracts, normalized graph summaries, graph decisions, dependency review, graph detail, and graph ledger context.
- Updated `public/app.js` to load the renderer retry-safely, start module and API reads concurrently, register Dutch view copy lazily, and retain all authenticated action functions.
- Updated `src/services/commandCenterAssetService.js` so the deferred module participates in the shared content fingerprint and immutable cache policy.
- Added `tests/workSignalsViewUi.test.js` and expanded command-center asset and security regressions.

### Safety and correctness

- The renderer cannot fetch APIs, read sessions or credentials, persist browser state, approve recommendations, or execute provider work.
- Graph actions delegate only to `openGraphItemDetail`, `queueGraphDecision`, and `reviewGraphDependency` in the controller.
- Provider and evidence content is escaped and preserved verbatim. Only HTTPS URLs without username/password components become clickable.
- Failed script loads clear both promise and controller state, allowing a bounded retry when the operator reopens the view.

### Verification

- `npm run check:ci`: 110 suites/824 tests, lint, and 5/5 safety evaluation passed.
- Full and production dependency audits: zero vulnerabilities.
- Production-style release security: all five purpose-separated secrets accepted; values not exposed.
- In-app Browser: English/Dutch, deferred loading, shared fingerprint, filtering, exact evidence, no overlay/overflow, and zero warning/error logs passed.
- Packaged 2.3.20 runtime: version, eight diagnostics, secret redaction, HAI `never_direct`, clean close, and port release passed.

## 2026-08-09 Forecasts and Reports implementation

### Files and boundaries

- Added `public/forecastView.js` for capacity evidence, board/member forecasts, delivery scenarios, capacity profiles, and provider project mappings.
- Added `public/reportView.js` for read-only report discovery and guarded downloads.
- Updated `public/app.js` to load both renderers retry-safely, start module and API reads concurrently, register Dutch view copy lazily, and retain every authenticated action function.
- Updated the shared asset fingerprint and added renderer, localization, form-persistence, CSP, source-authority, and action-delegation tests.

### Safety, performance, and verification

- Neither renderer can call an API, read sessions or credentials, persist browser state directly, approve recommendations, or execute provider work.
- Initial app plus localization fell from 294,642 to 279,740 raw bytes, 61,938 to 58,547 gzip bytes, and 50,964 to 48,385 Brotli bytes; the deferred modules total 31,512 raw bytes.
- `npm run check:ci` passed lint, 111 suites/830 tests, and 5/5 recommendation scenarios. Both dependency audits report zero vulnerabilities and production-style validation accepted five distinct secrets without exposing values.
- In-app Browser acceptance passed English/Dutch rendering, deferred/fingerprinted loading, exact evidence, containment, and zero warning/error logs.
- Packaged 2.3.21 verification passed health, eight redacted diagnostics, HAI `never_direct`, normal close, and port release; the archive contains both new modules.
