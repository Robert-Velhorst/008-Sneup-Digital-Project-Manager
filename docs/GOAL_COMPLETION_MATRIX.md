# Goal Completion Matrix

Status meanings: **Implemented** is present and locally verified; **Partial** has useful implementation but an identified gap; **External** requires owner-controlled accounts or infrastructure; **N/A** is outside the product's current surface. No phase is marked complete from documentation alone.

2.3.41 closes two authorization blind spots. A parser-backed release gate accounts for every Express route independent of formatting or alternate route syntax, and every recommendation review, payload edit, or approved execution is bound to the exact revision the operator saw. Stale requests cannot authorize a newer payload, and the real-Mongo proof records no orphan approval, Trello attempt, or provider write.

2.3.40 removes avoidable read-only ledger startup cost without changing authority. Demo access no longer loads MongoDB workspace scope or live ledger models, while Trello, policy, payload, graph, and provider-write modules load only for operations that need them. Live workspace resolution, human approval, execution claims, emergency-stop checks, and audit evidence remain intact.

2.3.27 also keeps the complete workspace invitation interface demand-loaded. Its renderer has no API, credential, cookie, session, storage, or provider authority; exact authenticated calls, session persistence, and workspace reload verification remain in the controller. One-time links render before refresh, failed pre-commit actions remain retryable, and committed server outcomes are not relabelled as failed when only later local work fails.

2.3.28 removes a production-scale database hot spot without weakening access control. Session and API-token credentials are still read and validated for every request; only non-audit presence timestamps are coalesced into active-record-only atomic five-minute touches. A disposable real-Mongo 100-request profile reduced those writes from 200 to two.

2.3.29 bounds the shared MongoDB client for standalone and cloud use. Each process defaults to 20 application sockets rather than 100, retains no idle minimum, retires idle sockets, limits simultaneous connection creation, and fails saturated pool waits after five seconds. Operators can tune each validated bound without changing code.

2.3.31 closes the authenticated remote-browser lifecycle gap. The exact validated HTTPS ngrok origin enters the existing CORS boundary when the tunnel becomes available; unsafe listener URLs fail closed, concurrent starts share one tunnel, and Sneup-owned ephemeral public/callback URLs are removed or refreshed without overwriting operator changes. HAI remains read/propose-only and provider writes remain approval-gated.

2.3.32 gives every recurring live workload one owned lifecycle. Schedules cannot silently duplicate or accept invalid cron configuration, recorded callback failures no longer become uncaught scheduler errors, partial-startup cleanup continues through HTTP and MongoDB after another stop fails, persisted job errors are credential-sanitized, and Windows CI must exercise the packaged app before upload.

2.3.33 closes the restart-time drain gap. Sneup stops accepting HTTP work, cancels future schedules, and keeps MongoDB available while active requests, scheduled callbacks, connector synchronization, retention, and deletion maintenance finish. One validated grace window bounds shutdown, overlong HTTP connections are force-closed, and doctor/Windows setup reject invalid configuration before startup.

2.3.34 closes a portfolio-health visibility gap. Daily brief and workspace ledger now select one newest health snapshot for every board before applying a cap, rank critical boards first, and share this indexed bounded evidence with reports, notifications, and HAI. The 60-board profiler proves unique coverage over 180 historical snapshots.

2.3.35 closes a concurrent-review integrity gap. Recommendation review transitions compare one exact revision atomically, approved recommendations bind one active approval record, and stale queue actions cannot reopen terminal work. Real-Mongo races produce one winner with no orphan authority, Trello attempt, or provider write.

2.3.36 closes a worker-response evidence gap. One response now atomically owns one eligible executed intervention, follow-ups resolve by exact recommendation/intervention identity before bounded card fallback, and terminal resolutions use revision-aware guards. Real-Mongo response and resolution races produce one winner while adjacent same-card work remains due, with no Trello attempt or provider write.

2.3.37 closes the Trello webhook startup and governance gap. Reconciliation waits for the final ngrok callback, queues exact protected create/update/delete recommendations for Robert, deduplicates pending work, and cannot bypass the emergency stop through a direct low-level client call. Disposable real-Mongo evidence records decisions and audits without an action attempt or provider write.

2.3.38 closes the connector recovery gap. Transient provider failures persist a bounded due time and remain eligible for later scheduler passes, permanent credential failures stop automatic retries, manual and scheduled synchronization share one distributed workspace lease, and successful recovery clears the failure state. The API exposes only bounded operator guidance and the disposable real-Mongo proof performs no provider write.

2.3.39 closes the connector cleanup lifecycle gap. Disconnect is exact-confirmation and revision guarded, shares the synchronization lease, purges local credentials and OAuth refresh authority, preserves prior read-only evidence, and records rollback-protected audit evidence. Disabled and reconnect-required accounts cannot reach OAuth refresh or provider adapters; reconnection updates the existing record, and the disposable real-Mongo proof performs no provider read or write after disconnect.

| Phase | Status | Evidence or remaining gate |
| --- | --- | --- |
| 000 Repository integrity | Implemented | Baseline commit/branch/remote recorded; unrelated worktree artifacts preserved. |
| 001 File and dependency audit | Implemented | `TECHNICAL_AUDIT.md`, package inventory, production audit gate. |
| 002 Product outcome contract | Implemented | `CRITICAL_PATH.md` defines the human outcome and stop conditions. |
| 003 Critical path smoke test | Partial | Automated service path exists; live Trello execution remains external. |
| 004 Architecture validation | Implemented | Existing Node/Mongo/Electron architecture retained and audited. |
| 005 Data ownership/persistence | Implemented | Workspace-scoped Mongoose models and ownership tests. |
| 006 Configuration/startup guards | Implemented | Security validation, `npm run doctor`, production database fail-closed policy, partial-startup cleanup, and explicit Windows demo recovery. |
| 007 Authentication/session security | Implemented | Users, sessions, API tokens, invitations, token peppers. |
| 008 Authorization/ownership | Implemented | Role permissions and workspace-scoped queries/tests. |
| 009 API/error contract | Implemented | `/api/v1` uses one bounded success/error envelope with response/log request correlation; legacy and protocol-specific responses remain compatible. |
| 010 Frontend/navigation | Implemented | Operational command center, command palette, and contextual help center. |
| 011 Core vertical slice | Partial | Full code path exists; authorized live-provider run pending. |
| 012 Provider reality review | Partial | Bounded real adapters exist; owner OAuth/API consent is external. |
| 013 Platform/compliance boundaries | Partial | Data minimization is coded; final provider terms review is external. |
| 014 No fake success | Implemented | Explicit read-only demo and catalog-only states; write paths fail closed. |
| 015 File/upload/media safety | N/A | Product has no user-upload workflow; PDF reports use controlled output. |
| 016 Jobs/schedulers/workers | Implemented | Job controls, run records, workers, health, tests, expiring per-workspace distributed leases, idempotent scheduler ownership, observed callback failures, complete partial-startup cleanup, and bounded active-work drain before database teardown. |
| 017 Idempotency/duplicates | Implemented | Delivery receipts, atomic claims, serialized syncs, reconciliation, and revision-safe review decisions prevent duplicate provider writes. |
| 018 Rate limits/quotas | Implemented | Request limits, provider bounds, pacing, retry caps, visible truncation failures. |
| 019 Audit history | Implemented | Workspace audit events and operations-ledger timelines. |
| 020 Dashboard/next action | Implemented | Decision, exception, policy, health, report, and ledger views; latest-per-board health is deduplicated before risk-first caps across human and HAI surfaces. |
| 021 Forms/validation/autosave | Partial | Reviewed non-sensitive operational forms have bounded workspace/session draft recovery with success-only cleanup; credential, consequential-confirmation, evidence, response, destination, and provider-action forms are deliberately excluded. |
| 022 Search/filter/sort/page | Implemented | Bounded list APIs and command-center filters. |
| 023 Import/export | Implemented | Provider ingestion, PDF reports, and owner-only streamed workspace export exist. |
| 024 Templates/presets/defaults | Partial | Policy/report defaults plus up to eight workspace-scoped named presets exist for reviewed reusable form fields; arbitrary or sensitive form templating is deliberately excluded. |
| 025 AI abstraction/fallback | Implemented | Every model call uses one demand-loaded, timeout-bounded, no-retry gateway. Missing credentials, initialization/auth/rate-limit/timeout/provider failures, malformed output, and oversized output return bounded deterministic responses with explicit provenance and redacted failure logs. |
| 026 Human review/approval | Implemented | Queue, protected payload review, exact active-approval binding, approval expiry, atomic review revisions, and policy gates. |
| 027 Notifications/reminders | Implemented | Explicit policies, claims, delivery evidence, quiet hours, digests. |
| 028 Privacy/deletion | Implemented | Redaction, invitation retention, owner-only streamed export, and owner-confirmed resumable archived-workspace deletion cover local Sneup data. Provider-side grant revocation remains external. |
| 029 Web security | Implemented | Helmet/CSP, origin controls, bounded bodies, throttling. |
| 030 Secrets/rotation | Implemented | Purpose-separated secrets, encryption, rotation visibility, release check. |
| 031 One-command local development | Implemented | `npm ci`, doctor, start/demo paths, Windows installer. |
| 032 Docker/deployment | Partial | Authenticated fail-closed ngrok ingress and deployment guidance exist; no production deployment proof. |
| 033 Migrations/rollback | Partial | Workspace preflight/backfill shares the complete 40-collection lifecycle registry and passes disposable-Mongo verification; production restore/rollback rehearsal is external. |
| 034 CLI/doctor | Implemented | `doctor`, `doctor:json`, support bundle. |
| 035 Health/readiness | Implemented | `/health`, `/ready`, job health, response timing. |
| 036 Operator diagnostics | Implemented | Doctor, readiness, job/connector health, audit, support bundle. |
| 037 Labelled demo mode | Implemented | Read-only demo boundary and visible mode state. |
| 038 Fake provider lab | Implemented | Provider mocks are test-only and cannot activate production success. |
| 039 Test factories/fixtures | Implemented | Deterministic service/provider fixtures across test suites. |
| 040 Backend tests | Implemented | Jest regression suite and CI gate. |
| 041 Frontend/component tests | Partial | Static/UI assertions plus isolated jsdom coverage verify drafts/presets, help, all ten connector account-selection flows, workspace, and approval rendering/action delegation, complete renderer and consequential form/modal localization, exact evidence preservation, guarded callback presence, demand-load boundaries, lazy catalog safety, and per-asset cache fingerprints; full browser automation remains partial. |
| 042 Worker/job tests | Implemented | Sync, notification, retention, outcome, job execution coverage. |
| 043 End-to-end tests | Partial | Local browser flows exist; live-provider E2E is external. |
| 044 Acceptance matrix | Implemented | `ACCEPTANCE_TESTS.md`. |
| 045 Adversarial tests | Implemented | Security, webhook, SSRF, duplicate, partial failure, scope tests. |
| 046 Cross-user isolation | Implemented | Workspace identity and authorization regression coverage. |
| 047 Path traversal/file safety | Implemented | Controlled static/report paths and traversal/security tests. |
| 048 Provider failure simulation | Implemented | Retry, timeout, partial write, truncation, and reconciliation tests. |
| 049 Accessibility | Partial | Labels, modal semantics, contextual focus, focus containment/restoration, Escape/F1 behavior, and responsive help navigation are covered; assistive-technology certification remains external. |
| 050 Responsive/browser compatibility | Partial | Help plus the demand-loaded connector, workspace, approval, and enhancement renderers pass desktop and 390x844 containment with no control overflow; packaged Windows 150% scaling passes, while the clean-VM 125%/200% matrix remains pending. |
| 051 Performance/indexing | Implemented | Bounded queries, indexes, concurrency, batching, response timing, and cross-process duplicate-work suppression. |
| 052 Large data/pagination | Implemented | Provider caps/pages are tested; a guarded real-Mongo profiler exercises 60 boards/300 lists/15,000 cards/100 members and 180 health snapshots, verifies bounded mission-control output plus 60 unique latest board-health rows, confirms both compound indexes, enforces latency/RSS budgets, performs no provider writes, and drops only its dedicated database. |
| 053 Backup/restore | Partial | Runbook is defined; production-like restore evidence is external. |
| 054 Reconciliation/repair | Implemented | Trello reconciliation remains evidence-gated; the generalized dry-run-first repair CLI and administration UI repair only bounded internal derived state, re-scan before atomic apply, and audit every successful change. |
| 055 Local-first analytics | Implemented | Local response/job/recommendation metrics; no forced telemetry. |
| 056 SaaS without billing | Implemented | Multi-workspace identity exists; billing is not required. |
| 057 Dutch/English readiness | Partial | Persistent, tested English/Dutch catalogs cover the static shell, setup, command palette, contextual help/search, primary mission control, connector marketplace, workspace administration, approval/operations ledger, and consequential workspace forms/modals. Provider, user, audit, free-text, error, identifier, and payload evidence remains verbatim by design; assistive-technology certification remains pending. |
| 058 Feature flags/rollout | Implemented | Four optional capabilities have workspace-scoped persisted controls, deterministic percentage rollout, optimistic revisions, bounded cache/history, manager UI, and live fail-closed behavior. Safety and provider-write authorization are outside the flag system. |
| 059 Formal state machines | Implemented | Enumerated persisted lifecycle states, guarded transitions, revision-safe review decisions, and terminal queue immutability. |
| 060 Domain model | Implemented | Mongoose models and operations-ledger domain boundaries. |
| 061 Invariants/constraints | Implemented | Schema/index constraints, exact active-approval authority, transition/security tests, and real-Mongo race verification. |
| 062 Pre-action safety screen | Implemented | Payload, risk, policy, approval, expiry, history shown before execute. |
| 063 Credential verification | Partial | Doctor validates presence/posture; live provider verification is external. |
| 064 Threat model/security review | Implemented | `SECURITY.md`, technical audit, adversarial tests. |
| 065 Privacy impact | Partial | Data-minimization boundaries documented; formal DPO review external. |
| 066 Supply chain | Implemented | Lockfile, `npm ci`, production audit, CI gate. |
| 067 Licenses/third parties | Partial | MIT project/dependencies tracked; service terms review external. |
| 068 CI/CD gates | Implemented | Linux quality job and Windows installer artifact job. |
| 069 Canary/rollback | Partial | Optional workloads now have immediate persisted canary/pause controls and revision-safe rollback; hosted rollout proof remains external. |
| 070 Operator runbook | Implemented | `OPERATOR_RUNBOOK.md`. |
| 071 User guide/help | Implemented | README plus searchable in-app guidance cover every command-center view, setup, decision safety, privacy, and direct workflow handoffs. |
| 072 Troubleshooting/error catalog | Implemented | Set up exposes a stable eight-check runtime, connectivity, remote-access, and write-safety catalog with exact redacted remediation; doctor/runbook and the bounded support file cover command-line escalation. |
| 073 UI action audit | Implemented | `UI_ACTION_AUDIT.md`. |
| 074 Endpoint usage audit | Implemented | `API_USAGE_AUDIT.md`. |
| 075 Documentation truthfulness | Implemented | Demo/live/external limits are stated explicitly. |
| 076 Technical debt register | Implemented | Audit risks plus `ENHANCEMENT_FINDINGS.md`. |
| 077 Bug hunt log | Implemented | Worklog, tests, and existing enhancement findings. |
| 078 Red-team loop one | Partial | Adversarial local review completed; independent review pending. |
| 079 Red-team loop two | Partial | Security regression review completed; external penetration test pending. |
| 080 Red-team loop three | Partial | Release-boundary review completed; live infrastructure review pending. |
| 081 Non-technical simulation | Partial | Operational UI flows exercised; clean-user study pending. |
| 082 Autonomy-first review | Implemented | Routine analysis automated; consequential writes remain human-approved. |
| 083 Value review | Partial | Critical outcome defined; measured user-value study pending. |
| 084 Product realism | Partial | Real adapters/code exist; authorized live acceptance remains external. |
| 085 Requirements traceability | Implemented | This matrix maps every phase to evidence or a gate. |
| 086 Task graph | Implemented | `TASK_GRAPH.md`. |
| 087 Worklog/checkpoints | Implemented | `CODEX_WORKLOG.md`, `CODEX_CHECKPOINTS.md`. |
| 088 Context-loss resume | Implemented | Baseline, checkpoints, explicit pending gates, deterministic commands. |
| 089 Stabilization gates | Implemented | Focused, full, security, installer, and fresh-clone gates. |
| 090 No vanity work | Implemented | Changes target operability, safety, evidence, and delivery. |
| 091 Feature definition of done | Implemented | Status requires wiring, reachability, tests, docs, and evidence. |
| 092 Fresh-clone run | Implemented | Exact 2.3.38 source `8d510d20a7617dab5c82e88a758518b24f1661af` passed GitHub run `31770300777`; both Node 24 quality and Windows installer jobs completed successfully, and artifact `9207912643` was independently downloaded and verified. |
| 093 Manual evidence | Partial | The 2.3.13 live disposable-workspace form flow and 2.3.14 demo help flow verify recovery, presets, contextual search, workflow handoff, narrow stacking, viewport containment, and zero current console errors; packaged runtime and live-provider/clean-VM evidence retain their separate gates. |
| 094 No-excuses search | Implemented | No shipped TODO/FIXME/HACK, dynamic-code, child-process, or secret-pattern finding. |
| 095 Completion matrix | Implemented | This file, with partial/external states retained. |
| 096 Verification report | Implemented | Final commands, clean-checkout result, installer hash, browser QA, and packaged Windows QA are recorded. |
| 097 Final response | Pending | Produced after push and remote verification. |
| 098 Maintenance plan | Implemented | Existing feature plan plus audit risks and runbook. |
| 099 Roadmap/blocked items | Implemented | External and partial gates named here and in technical audit. |
| 100 Provider cleanup/account safety | Partial | Revoke/stop process documented; owner account execution external. |
| 101 Support/debug bundle | Implemented | Redacted `support:bundle` plus a desktop setup action; no environment values, credentials, tokens, connection strings, logs, or user data. |
| 102 Retention/archive | Implemented | Invitation PII redaction plus owner-controlled, opt-in, bounded workspace retention cover terminal operations, snapshots, performance history, finalized notification receipts, and revoked credentials while preserving audit/provider-action/current-work evidence. |
| 103 Prototype-to-production migration | Partial | Workspace migration exists; hosted production migration rehearsal pending. |
| 104 Safety stop/emergency | Implemented | Audited global provider-write stop and workspace action pauses. |
| 105 Onboarding/first run | Implemented | First run guides demo/live selection, persists only the mode, shows live runtime/remediation checks, links to connectors, and offers a desktop redacted support file. |
| 106 Role settings/permissions | Implemented | Viewer/operator/manager/admin/owner/service permissions. |
| 107 Quality/confidence | Implemented | Risk, health, forecast confidence, evidence, sync quality surfaced. |
| 108 Human decision minimization | Implemented | Exception queues, defaults, automation, safe internal follow-ups. |
| 109 Exception dashboard | Implemented | Decision, risk, stale, failed, and reconciliation views. |
| 110 Safe retries/recovery | Implemented | Bounded read retries; no blind retry of ambiguous provider writes. |
| 111 Ambiguous external actions | Implemented | Claimed state, partial-step evidence, manual reconciliation. |
| 112 Version/changelog | Implemented | Semantic package release and `CHANGELOG.md`. |
| 113 Regression baseline | Implemented | Full Jest/lint/evaluation commands and CI. |
| 114 Maintenance/refactor review | Partial | Form persistence, contextual help, localization, connector account-selection, workspace, and approval rendering are isolated behind bounded modules. Deferred modules are retry-safe, guarded mutations remain in the controller, and view-specific Dutch catalogs load with their views; broader controller decomposition remains backlog. |
| 115 Human operator readiness | External | Requires signed clean-VM install and authorized live Trello acceptance. |

## Honest completion boundary

Repository implementation can close code, test, documentation, and packaging phases. It cannot fabricate provider consent, production data, owner credentials, a signing identity, deployment infrastructure, independent certification, or a human acceptance result. Those items remain visible above.
## 2.3.20 Work Signals continuation

| Requirement | State | Evidence |
| --- | --- | --- |
| Frontend/backend wiring | Verified locally | Work Signals starts its deferred renderer and four versioned API reads concurrently; guarded controller callbacks own graph detail, recommendation queueing, and dependency review. |
| Database/provider safety | Preserved | Renderer has no database, API, session, credential, or provider-write capability; consequential paths retain permission, policy, approval, audit, and exact-payload controls. |
| Resource efficiency | Improved | Initial app plus localization reduced by 23,776 raw, 4,684 gzip, and 3,359 Brotli bytes; view code and Dutch copy are paid only when needed. |
| Browser experience | Verified | English/Dutch rendering, filtering, exact evidence, shared fingerprint, no overlay, no document overflow, and zero console warnings/errors passed in the in-app Browser. |
| Deep regression/security | Verified locally | 110 suites/824 tests, lint, 5/5 safety evaluation, two zero-vulnerability audits, five-secret release validation, and syntax/diff checks passed. |
| Windows 11 standalone | Verified locally | Packaged 2.3.20 demo boot, diagnostics, HAI boundary, secret redaction, normal close, and port release passed; installer metadata and archive contents were inspected. |
| Live production acceptance | External | Requires authorized Trello/ngrok/HAI accounts, production-like Mongo restore/deployment, signing certificate, clean VM, and accessibility review. |

## 2.3.21 Forecasts and Reports continuation

| Requirement | State | Evidence |
| --- | --- | --- |
| Frontend/backend wiring | Verified locally | Forecasts and Reports start their deferred renderer and bounded versioned API read concurrently; all writes and downloads remain guarded controller actions. |
| Database/provider safety | Preserved | Renderers have no database, API, session, credential, persistence, approval, or provider-write capability; exact-payload approval and audit controls are unchanged. |
| Resource efficiency | Improved | Initial app plus localization reduced by 14,902 raw, 3,391 gzip, and 2,579 Brotli bytes; 31,512 raw bytes of view code are paid only when the relevant views open. |
| Browser experience | Verified | English/Dutch Forecasts and Reports, exact operational evidence, shared fingerprint, no overlay, no document overflow, and zero console warnings/errors passed in the in-app Browser. |
| Deep regression/security | Verified locally | 111 suites/830 tests, lint, 5/5 safety evaluation, two zero-vulnerability audits, five-secret release validation, and syntax/diff/source-boundary checks passed. |
| Windows 11 standalone | Verified locally | Packaged 2.3.21 demo boot, diagnostics, HAI boundary, secret redaction, normal close, port release, installer metadata, and deferred archive contents passed. |
| Live production acceptance | External | Requires authorized Trello/ngrok/HAI accounts, production-like Mongo restore/deployment, signing certificate, clean VM, and accessibility review. |

## 2.3.24 worker-response mapping continuation

| Requirement | State | Evidence |
| --- | --- | --- |
| Frontend/backend wiring | Verified locally | Connected-account mapping markup and transient search state are deferred; encoded API reads, exact saves, post-commit refreshes, and session authority remain in the controller. |
| Database/provider safety | Preserved | Existing server-side workspace, account, member/card assignment, identifier, 100-item, rollback, and audit-evidence checks remain authoritative; provider writes remain approval-gated. |
| Resource efficiency | Improved | Initial app plus localization reduced by 9,524 raw, 1,920 gzip, and 1,556 Brotli bytes; the expanded Connector module remains demand-loaded. |
| Browser experience | Verified | English/Dutch catalog loading, shared fingerprint, 117 entries, containment, and zero current console errors passed; seeded DOM tests cover the connected-account-only editor. |
| Deep regression/security | Verified locally | 111 suites/838 tests, lint, 5/5 safety evaluation, two zero-vulnerability audits, five-secret validation, startup and real-Mongo scale profiles passed. |
| Windows 11 standalone | Verified locally | Packaged 2.3.24 health, eight diagnostics, HAI boundary, secret redaction, source-identical bundled assets, normal close, port release, and installer metadata passed. |
| Live production acceptance | External | Requires authorized Trello/ngrok/HAI/provider accounts, production-like Mongo restore/deployment, signing certificate, clean VM, and accessibility review. |

## 2.3.25 notification-policy continuation

| Requirement | State | Evidence |
| --- | --- | --- |
| Frontend/backend wiring | Verified locally | Policy markup and transient locks are deferred; exact body construction, encoded API routes, authenticated writes, refreshes, and encrypted destination authority remain in the controller. |
| Database/provider safety | Improved | Partial updates preserve daily brief schedules, active transitions require explicit server confirmation, and test delivery remains an explicit confirmation-gated external action with audit evidence. |
| Resource efficiency | Improved | Initial app plus localization reduced by 12,974 raw, 2,071 gzip, and 1,731 Brotli bytes; the expanded Approval module remains demand-loaded. |
| Browser experience | Verified | English/Dutch Approval loading, shared fingerprint, read-only demo boundaries, containment, and zero current console errors passed; seeded DOM tests cover protected policy forms. |
| Deep regression/security | Verified locally | 111 suites/843 tests, lint, 5/5 safety evaluation, two zero-vulnerability audits, five-secret validation, startup and real-Mongo scale profiles passed. |
| Windows 11 standalone | Verified locally | Packaged 2.3.25 health, eight diagnostics, HAI boundary, secret redaction, source-identical bundled assets, normal close, port release, and installer metadata passed. |
| Live production acceptance | External | Requires authorized Trello/ngrok/HAI/provider accounts, production-like Mongo restore/deployment, signing certificate, clean VM, and accessibility review. |
