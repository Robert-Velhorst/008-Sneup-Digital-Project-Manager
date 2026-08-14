# Technical Audit

- Closed a stale-screen authority gap in the review workflow. Yes, No, Change, payload edit, and Execute approved now carry the exact rendered recommendation revision through the browser and authenticated API. Missing or stale revisions fail before approval creation, policy resolution, or provider execution; the existing atomic database transition remains the final race guard. Eleven disposable real-Mongo runs produced one winner per race, no orphan approvals, no Trello attempts, and no provider writes.
- Replaced the line-oriented route permission search with a parser-backed CI gate. The exact release inventory contains 180 routes: 174 use known literal permissions and six intentionally public OAuth, signed webhook, invitation-token, or provider-verification routes retain explicit behavior contracts. Alternate Express syntax, router aliases, dynamic permissions, and unreviewed public routes fail closed.

## 2.3.37 Trello webhook governance audit

- Webhook setup previously ran before ngrok supplied its callback, matched existing configuration only by board, and wrote directly through the Trello client during startup. A changed ephemeral callback could remain stale indefinitely, and direct low-level mutation bypassed the deployment emergency stop.
- Reconciliation now runs after listener/ngrok startup, accepts only a public root HTTPS callback ending in `/api/webhooks/trello`, and turns create/update/delete drift into deduplicated protected Robert-owned recommendations. Approved execution reuses the existing attempt, ambiguity, reconciliation, and audit system.
- Every Trello card and webhook mutator now enforces demo mode and `SNEUP_PROVIDER_WRITES_DISABLED` at the client boundary. The 129-suite/932-test gate and a guarded repeated real-Mongo reconciliation pass with zero attempts and provider writes.

## 2.3.36 worker follow-up integrity audit

- Worker-response follow-up resolution previously used recommendation, intervention, card, and member predicates as alternatives. Two unanswered follow-ups on the same card could therefore be closed by one response even when they represented different recommendations and interventions.
- Response creation and intervention updates were separate writes, so simultaneous sources could retain duplicate WorkerResponse rows and overwrite response evidence. Manual follow-up resolution also used read-then-save and provider-specific audit source names could fail the broad audit schema after the response had committed.
- Added exact identity precedence, one atomic intervention response owner, losing-response cleanup, status-and-revision terminal guards, supported audit-source normalization, authenticated-workspace audits, and terminal-control suppression.
- A disposable real-Mongo verifier raced two provider responses and two manual resolutions. It retained one exact response, changed only the matching follow-up, preserved an adjacent same-card follow-up, produced one manual winner, and created zero Trello attempts or provider writes. The full 126-suite/915-test gate, two zero-vulnerability audits, browser QA, portfolio profile, HAI contract, and packaged Windows verification passed.

## 2.3.35 concurrent-review audit

- Approval, rejection, requested-change, and payload-edit paths previously read and saved a recommendation in separate operations. Two authenticated reviewers could therefore race, retain contradictory decision records, and overwrite one another's result.
- A stale open decision-queue row could snooze or delegate a recommendation after it had already been approved and executed, making completed work reviewable again and creating a duplicate-write path.
- Added revision-aware atomic review transitions, exact active-approval binding, losing-decision cleanup, terminal queue guards, and rollback of a linked recommendation when a competing queue claim wins.
- A disposable real-Mongo verifier raced approve against reject and approve against payload edit, then exercised stale and terminal queue actions. It produced one winner per race, zero orphan approvals, zero Trello attempts, and zero provider writes. The full 125-suite/910-test gate, two zero-vulnerability audits, browser QA, 15,000-card profile, HAI contract, and packaged Windows verification passed.

## 2.3.34 portfolio-health audit

- Daily brief and workspace ledger limited raw health-history rows before reducing them to one row per board. At 60 boards, at least ten current boards could be absent; repeated history could also displace a critical board from bounded human or HAI evidence.
- Added one workspace-scoped latest-per-board aggregation shared by daily brief, approval ledger, reports, notifications, and HAI. It selects newest rows before limiting, ranks critical states first, populates only required board identity, and enforces a five-second deadline.
- The query explicitly hints `workspaceId_1_boardId_1_generatedAt_-1`. A disposable 60-board/180-snapshot profile returned 60 unique boards in 17.3 ms and retained the critical board first under a 20-row cap.

## 2.3.33 graceful-restart audit

- Scheduler cancellation removed future invocations but did not prove callbacks already in progress had completed before MongoDB disconnected. Workspace-deletion maintenance had the same gap, and an active HTTP request could keep shutdown open indefinitely.
- Added explicit active invocation tracking, drain-aware connector/retention/deletion stops, immediate HTTP admission close, bounded forced connection teardown, and database-last ordering. Stable timeout evidence contains component/job names and codes only.
- The same bounded shutdown setting is validated by startup, doctor, and Windows first-run diagnostics.

## 2.3.29 database-pool audit

- The former connection options left MongoDB's 100-socket per-server default and unlimited wait queue intact for every Sneup process. Horizontal scaling multiplied that capacity and allowed an overload request to wait without a deadline.
- Added validated low-idle pool, connection, socket, selection, buffer, and wait-queue bounds. Defaults support the existing bounded dashboard/workers while allowing explicit per-process production tuning up to a guarded maximum.
- Removed retired Mongoose topology/parser flags and registered error/disconnect/reconnect listeners once per shared connection. A disposable real-Mongo concurrent-read and reconnect profile proved the active options and stable listener counts.
- Full regression, audits, portfolio scale, rendered dashboard, HAI HTTP contract, and packaged Windows verification passed. Live provider/cloud acceptance and publisher signing remain external.

## 2.3.28 authentication-activity audit

- Audited all API route registrations against global identity, workspace resolution, explicit permission middleware, and signed unauthenticated entry points. No unintended open mutation route was found.
- Removed blocking per-request `save()` calls for API-token/session/user presence metadata. Atomic update filters require active status and a missing, null, or stale timestamp; authorization continues to query and validate every credential and principal on every request.
- A disposable real-Mongo 100-request session profile retained all 100 credential reads and reduced metadata writes from 200 to two. The full 112-suite/855-test gate, two zero-vulnerability audits, production secret separation, 15,000-card profile, browser QA, and Windows package verification passed.
- Live provider/ngrok/HAI acceptance, signing, production rollback, clean-VM scaling, and assistive-technology evidence remain external.

## 2.3.27 workspace-invitation audit

- Found and fixed invitation forms that lost useful retry context, one-time links that depended on a second Workspace refresh, and committed accept/revoke/resend outcomes that could be misreported when only later browser persistence or refresh failed.
- Moved invitation DOM, Dutch copy, and transient action locks into the deferred Workspace module while keeping exact authenticated calls, payloads, session storage, workspace verification, and provider authority in the application controller.
- Added duplicate-submit guards, inline pre-commit retries, secure-link-before-refresh rendering, and explicit server-commit/session-persistence/workspace-reload outcome separation.
- Measured a 6,435 raw, 843 gzip, and 598 Brotli byte reduction in initial app-plus-localization delivery. Startup retained 251 import modules without Mongoose; the real-Mongo 15,000-card profile measured 642.4 ms p95 and 307.4 MB peak RSS within budget.
- Verified 112 suites/854 tests, zero dependency vulnerabilities, production secret separation, English/Dutch browser containment, and the 2.3.27 Windows package. Live provider/ngrok/HAI acceptance, signing, production rollback, clean-VM scaling, and assistive-technology evidence remain external.

## 2.3.26 first-run setup audit

- Found and fixed eager setup parsing, a premature local completion marker before desktop persistence, modal replacement that prevented failed-save retry, ambiguous committed-save/restart-failure handling, and stale diagnostics responses.
- Moved setup DOM, Dutch copy, diagnostics presentation, and transient action state into a retry-safe deferred module while keeping API, storage, desktop IPC, and navigation authority in the application controller.
- Added duplicate save/support locks, abortable diagnostics, generation-based stale-response rejection, bounded escaped server evidence, and source-boundary regressions.
- Measured a 9,040 raw, 2,554 gzip, and 2,087 Brotli byte reduction in initial app-plus-localization delivery. Startup retained 251 import modules without Mongoose; the real-Mongo 15,000-card profile measured 797.8 ms p95 and 426.6 MB peak RSS within budget.
- Verified 112 suites/849 tests, zero dependency vulnerabilities, production secret separation, English/Dutch browser containment, and the 2.3.26 Windows package. Live provider/ngrok/HAI acceptance, signing, production rollback, clean-VM scaling, and assistive-technology evidence remain external.

## 2.3.25 notification-policy audit

- Fixed a partial-update defect that omitted `dailyBriefSchedule`, which could reject or reset a configured daily operations brief when only status changed.
- Moved policy create/edit/status/test DOM construction into the deferred Approval renderer while preserving exact request, authentication, encryption, and provider authority in the application controller.
- Added server-authoritative activation confirmation, duplicate-action locks, and post-commit truthfulness so refresh faults cannot invite repeated external delivery.
- Measured a 12,974 raw, 2,071 gzip, and 1,731 Brotli byte reduction in initial app-plus-localization delivery. Startup retained 251 import modules without Mongoose; the real-Mongo 15,000-card profile stayed below 605 ms p95 and 331 MB RSS.
- Verified 111 suites/843 tests, zero dependency vulnerabilities, production secret separation, English/Dutch browser containment, and the 2.3.25 Windows package. Live provider/ngrok/HAI acceptance, signing, production rollback, clean-VM scaling, and assistive-technology evidence remain external.

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
- Moved all five remaining workspace policy form renderers into that deferred module while keeping exact payload construction, authenticated updates, fixed high/critical Robert ownership, and provider authority in the controller. The module remains unable to fetch, read credentials, or persist state directly.
- Moved all ten connector account-selection form renderers into the deferred Connector module. The controller retains authenticated option reads, encoded account routing, exact POST bodies, refreshes, and every credential/provider boundary; the renderer has no network, session, cookie, token, or storage capability.
- Moved inbound worker-response mapping into the same deferred module, added bounded race-safe searches and exact identifier checks, and fixed successful-write/failed-refresh handling across eleven connector forms so an already-committed mutation is never presented as a failed save.
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
| Desktop resources | Measured | The verified 2.3.24 package used four processes, 362.5 MB working set, 347.7 MB private bytes, and 1.938 cumulative CPU seconds in the repeatable local probe. Collect broader clean-machine traces before setting a hard budget. |
| Billing | Not applicable | No billing is required for the local-first product. |

No live credential, provider authorization, deployment, signed binary, or production backup claim is inferred from local tests.

## 2026-08-09 Worker-response mapping technical continuation

**Finding:** the inbound worker-response editor remained in the eager controller and mixed DOM construction with authenticated request orchestration. Out-of-order search results could restore stale choices, failed searches replaced useful context, duplicate submits were possible, account IDs were not encoded on these routes, and a successful write followed by a failed refresh was presented as a failed save.

**Remediation:** move rendering and bounded transient search state into `connectorView.js`; keep fetch, session, exact endpoint/body, and provider authority in `app.js`. Abort and version searches, reset dependent card state, retain the form on recoverable failures, enforce server-matching ID and count bounds, lock active submits, encode account routes, and distinguish save failure from post-commit refresh failure.

**Measured result:** initial app plus localization fell from 243,449 to 233,925 raw bytes, 54,557 to 52,637 gzip bytes, and 45,810 to 44,254 Brotli bytes. The Connector module grows only on demand. The real-Mongo profile returned 15,000 cards at 476.8 ms p50/526 ms p95 with 328.3 MB peak RSS and no provider writes.

## 2026-08-09 Connector selection technical continuation

**Finding:** ten provider-specific account-selection renderers remained in the eager controller after the marketplace itself became demand-loaded.

**Remediation:** define one bounded selection-form contract in `connectorView.js`, register its Dutch catalog with that module, and expose one guarded save callback. Keep all endpoint mapping, authenticated reads/writes, encoded account IDs, and provider authority in `app.js`.

**Measured result:** initial app plus localization fell from 264,942 to 243,449 raw bytes, 56,407 to 54,276 gzip bytes, and 46,712 to 45,102 Brotli bytes. Startup imported 251 modules at 68.9 MB RSS without Mongoose; the 15,000-card portfolio profile stayed within latency and 512 MB RSS budgets.
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
