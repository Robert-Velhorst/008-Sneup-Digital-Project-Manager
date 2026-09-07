# Sneup Digital Project Manager

Sneup is a local-first, safety-first digital project manager. It reads work signals from the tools teams already use, turns them into a normalized project graph, detects risk and bottlenecks, prepares recommendations, and keeps consequential external actions behind explicit human approval.

The repository contains the complete Sneup application: an Express/MongoDB backend, a browser command center, an Electron desktop shell, read-only connector adapters, approval and audit systems, HAI integration endpoints, ngrok-aware remote access support, and a Windows 11 installer build.

## Table of contents

- [Who Sneup is for](#who-sneup-is-for)
- [Plain-English overview](#plain-english-overview)
- [What Sneup does](#what-sneup-does)
- [What Sneup deliberately does not do](#what-sneup-deliberately-does-not-do)
- [Main application areas](#main-application-areas)
- [Connector coverage](#connector-coverage)
- [Safety model](#safety-model)
- [Technology stack](#technology-stack)
- [Run Sneup locally](#run-sneup-locally)
- [Install on Windows 11](#install-on-windows-11)
- [Configuration](#configuration)
- [Developer workflow](#developer-workflow)
- [API overview](#api-overview)
- [Architecture](#architecture)
- [Verification and release evidence](#verification-and-release-evidence)
- [Operational docs](#operational-docs)
- [Known external gates](#known-external-gates)

## Who Sneup is for

Sneup is built for:

- Non-technical operators who want one command center for projects, decisions, follow-ups, workload, and risk.
- Project managers who need cross-tool visibility without manually checking every board, issue tracker, chat channel, document space, and reporting tool.
- Delivery leads who want recommendations with evidence instead of untraceable automation.
- Developers who need a real, inspectable Node.js application with tests, route authorization, MongoDB persistence, connector boundaries, and Windows packaging.
- Security-conscious teams that want provider writes, notifications, retention, account linking, and remote access to be explicit, reviewable, and auditable.

## Plain-English overview

Most teams do project management across many places: Trello, Jira, Asana, Slack, GitHub, Google Workspace, Microsoft 365, Notion, spreadsheets, support tools, time tools, and incident tools. A human project manager has to keep checking all of them, connect the dots, ask people for updates, identify blockers, and decide what needs action.

Sneup is designed to be that always-on project operations layer. It connects accounts, imports bounded read-only metadata, builds a shared picture of the work, highlights issues, drafts next actions, and asks for human approval before anything consequential happens outside Sneup.

In short: Sneup can observe broadly, reason locally, and recommend clearly. It does not silently mutate external tools.

## What Sneup does

- Builds a normalized work graph from cards, issues, tasks, projects, people, comments, dependencies, schedules, incidents, reports, and tool metadata.
- Tracks board and project health, stale work, capacity pressure, follow-up status, delivery risk, bottlenecks, and workflow quality.
- Provides a command center with Overview, Connectors, Work Signals, Forecasts, Reports, Enhancements, Approvals, Jobs, Security, Set up, and Workspace Administration.
- Supports English and Dutch operator UI in key command-center flows.
- Runs scheduled sync, analytics, intervention, notification, retention, performance, and health jobs with workspace-scoped leases.
- Keeps external provider writes approval-gated and blocks them entirely in demo mode or when the emergency stop is enabled.
- Stores connector credentials encrypted at rest and excludes secrets from ordinary API responses, support bundles, exports, and logs.
- Provides local browser usage, Electron desktop usage, Windows installer packaging, and optional authenticated ngrok ingress.
- Exposes HAI integration endpoints for bounded snapshots and approval-gated proposals.
- Generates operator-facing diagnostics and support bundles that do not print secrets.

## What Sneup deliberately does not do

- It does not claim live provider acceptance without owner-authorized credentials and tests.
- It does not bypass the Sneup approval ledger for consequential provider actions.
- It does not automatically re-enable paused actions or expired approval payloads.
- It does not silently switch a production live runtime into demo mode when MongoDB is unavailable.
- It does not expose a remote ngrok tunnel without API-key enforcement and a strong API key.
- It does not store arbitrary webhook payloads, chat bodies, provider descriptions, document contents, or credential values as project evidence.
- It does not treat unsigned Windows builds as production-trusted installers.

## Main application areas

### Command center

The browser command center is the main human interface. It surfaces project status, linked accounts, work signals, approvals, forecasts, reports, enhancement findings, diagnostics, and workspace administration from one place.

### Account connections

Sneup includes a connector catalog and account-linking flow for OAuth, API key, personal access token, basic, manual, generic webhook, and generic REST connections. Credential-backed sync is available only where the repository has an implemented bounded read-only adapter.

### Work Signals and graph

Provider-specific records are normalized into common work items, actors, containers, dependencies, evidence references, freshness data, and review outcomes. This lets Sneup compare work across tools without pretending every provider has the same model.

### Analytics and recommendations

Sneup analyzes health, workload, velocity, cycle time, bottlenecks, stale dependencies, response quality, and risk. Recommendations enter a reviewable queue rather than executing directly.

### Approvals and provider-write safety

High-impact actions require human review of the exact payload. Workspace policy can pause action types, raise risk posture, route review to stricter owners, and expire approvals. A global emergency stop rejects provider writes before execution is claimed.

Recommendation decisions and payload reviews retain their original workspace/session context. Stale or detached controls cannot submit, overlapping decisions and payload saves for the same recommendation are suppressed, and late results cannot reopen a dismissed review or replace a newer dialog. Switching workspace clears open payload-review and operating-ledger dialogs. An acknowledged decision or payload save is distinguished from a failed ledger refresh; reopening Approvals then retries the read. These browser safeguards complement the server's exact-revision checks, not replace them, and do not undo a request already accepted by the server.

### Worker responses and follow-ups

For an executed communication with an accountable worker and no recorded response, the ledger offers **Record response**. Supported observations are Acknowledged, Completed, Blocked, Needs help, and Ignored. Recording an observation updates internal evidence; it does not send a message to the worker. The result distinguishes changed follow-ups from an ignored or unmatched response that changed none. It uses the actual backend follow-up result rather than assuming every recorded response resolved something. Already-responded, unexecuted, non-communication, and workerless interventions do not offer the recording control.

Decision snoozing/delegation, manual follow-up resolution/escalation, outcome refreshes, and worker-response forms preserve their opening context and suppress duplicate pending actions. Linked worker recording and manual follow-up changes share a pending-action guard. Recommendation and ledger guards survive switching away and back to the same workspace until their requests settle; they do not block a different workspace's records. These are page-local safeguards, not cross-device locks. The backend's permissions and concurrency checks remain authoritative. Late results cannot replace another dialog, and an acknowledged update with a failed subsequent refresh is reported separately, with a retry available by reopening Approvals.

### Notifications and reports

Sneup can prepare reconciliation alerts, daily operations briefs, and reports through configured delivery policies. Destinations are encrypted and sends are claimed atomically to avoid duplicate delivery.

The Reports screen also downloads weekly status, standup, risk-register, and client-update reports as Markdown or PDF. Downloads use the current authenticated session and selected workspace. The active format is disabled while generating; errors remain retryable, and changing workspace cancels pending downloads. Reports are generated from saved Sneup evidence, not a fresh provider synchronization. Downloads have a 30-second timeout and a 5 MB safety limit; oversized or invalid responses produce an error rather than a partial report. Saving a report does not send it to anyone.

### Workspace administration

Workspace owners can manage users, sessions, invitations, exports, deletion, data integrity repair, and retention policies. Destructive or sensitive workflows require exact confirmations and audit evidence.

Workspace exports cancel when the workspace or session changes, including during file-picker selection, streamed saving, or browser download preparation. Duplicate exports are suppressed while one is pending. A canceled stream is not reported as a completed export.

Switching workspace clears previous administration and primary dashboard records while the new context loads. Administration, security, feature-flag, policy-history, integrity, retention, and ten primary dashboard readers reject stale workspace/session results. The server-resolved workspace is selected before dependent administration reads, and a failed browser-storage write does not prevent switching for the current page. Cached view modules are reused; a late approvals load cannot steal focus, and the current approvals view renders even when its module arrives after the data.

After the workspace catalog has first been opened through **Workspaces**, switching from another view or refreshing it reloads the selector alongside that view. This uses the bounded catalog endpoint, not hidden administration scans. Administration and the standalone selector share request ownership, so an older catalog result cannot overwrite a newer one. Failed catalog reads leave the selector disabled with the error available on the control; Refresh retries.

The scenario, capacity, and project-mapping forms check their original workspace/session before submission and after pending work. Duplicate submissions are suppressed, and switching clears these forecast forms. A dismissed or replaced form cannot later overwrite a newer modal. Scenario results share ownership with ordinary forecast reads. An acknowledged capacity or mapping save is distinguished from a failed subsequent refresh; it is not falsely reported as a failed save. These safeguards do not cancel or undo a request already accepted by the server.

Invitation acceptance and confirmed workspace deletion now clear the previous session's cached records and permissions through the same context-reset path, including acceptance into the same workspace with a new session. Storage failures are distinguished from successful server outcomes. Closing an invitation form does not discard its single-use returned session; closing or reopening a deletion form does not prevent cleanup of the deleted session. Responses cannot replace a newer workspace/session context, and delayed reload errors cannot overwrite a newer dialog. An incomplete deletion receipt is reported as unconfirmed, not completed.

Session lists and revocation confirmations also reject stale workspace, session, and dialog results. Revoking the current session clears cached records and marks the window signed out, even if the confirmation dialog was closed while the request was pending. Refresh and restart do not silently restore local-owner access. On loopback pages, **Use local access** explicitly re-enters the installation's local access mode; a new valid invitation can establish a new authenticated session. A successful revocation followed by a failed list refresh is reported separately.

Database API tokens and user sessions stay bound to their assigned workspace, including on localhost. Invalid, expired, revoked, or malformed supplied credentials never fall back to local-owner access. Intentional no-credential localhost access remains available when API-key enforcement is off; it is not a replacement for authenticated remote deployment. Revocation blocks subsequent authenticated requests, not work that was already authorized and running.

The next protected request after session expiry, revocation elsewhere, or user disabling now clears cached records and permissions when the backend confirms credential rejection. Ordinary provider errors, permission denials, and database outages do not sign out a valid session. Late responses cannot replace a newer session; a successfully accepted single-use invitation is retained even if the old session ends while it is pending. Pending changes are never automatically replayed. There is no background revocation polling, so an idle window learns about revocation on its next request.

Context-transition verification remains incomplete for other forms and detail views, especially same-session workspace changes. This is not a claim of complete application-wide request isolation. The safeguards discard stale browser results; they do not universally cancel server-side work or recover every interrupted invitation flow.

The Data Integrity screen also highlights unconfirmed worker responses and quarantined worker webhooks after 15 minutes, plus broken active approval references. Expand **Technical evidence** to inspect the relevant record identifiers and expected state. These findings are read-only: the repair action changes only list-count and member-assignment caches, not approvals, worker outcomes, or provider delivery state.

The overview is capped. Select an individual category and use **Next records** to continue through its records, including pages with no findings. The active-approval check verifies that the referenced approval belongs to the exact recommendation and workspace and records an approved decision; it does not certify approval expiry, payload freshness, or permission to execute. Recovery still requires operator investigation, not an automatic replay.

### Desktop and remote access

The Electron shell runs the local command center as a desktop app. Optional ngrok support can expose the loopback server through an authenticated HTTPS origin when the environment is configured safely.

## Connector coverage

The catalog currently contains 117 connectors across the tools project managers commonly used from 2015 through 2026. Of those, 113 have credential-backed read-only sync adapters in this repository, and 4 are catalog-only because a bounded read-only contract has not been verified.

Catalog-only means Sneup knows about the tool, but will not accept credentials or pretend a safe sync path exists.

### Project and work management

Trello, Redmine, Backlog, Taiga, Podio, Asana, monday.com, ClickUp, Procore, Wrike, Smartsheet, Kantata OX (Mavenlink), LiquidPlanner New, Productive, Ravetree, Basecamp, Microsoft Project, Microsoft Planner, Teamwork, Zoho Projects, Todoist, MeisterTask, ProofHub, Paymo, Freedcamp, Adobe Workfront, Aha!, Productboard, GanttPRO, TeamGantt, Businessmap (formerly Kanbanize), Scoro, OpenProject, Hive, Taskworld, Taskade, Motion.

Catalog-only in this group: Height, Projectplace.

### Software delivery

Jira Software, Jira Service Management, Rally, YouTrack, Linear, GitHub, GitLab, Azure DevOps, Bitbucket, Shortcut, Jira Align, Planview AdaptiveWork (Clarizen), Plane.

Catalog-only in this group: Pivotal Tracker.

### Docs and knowledge

Notion, Confluence, Coda, Quip.

Catalog-only in this group: Evernote.

### Calendar and email

Microsoft 365, Google Workspace, Calendly, Gmail, Outlook.

### Communication

Slack, Zoom, Microsoft Teams, Discord, Mattermost, Webex, Google Chat.

### Whiteboard and design

Figma, Miro, Lucidchart / Lucidspark, Mural, Canva.

### Files and assets

Dropbox, Box, Adobe Creative Cloud, SharePoint, OneDrive, Google Drive.

### CRM, support, and stakeholders

HubSpot, Salesforce, Intercom, Zendesk, Freshdesk, ServiceNow, Pipedrive.

### Automation, forms, and data

Airtable, Typeform, Google Forms, SurveyMonkey, Zapier, Make, n8n, Power BI, Tableau, Data Studio (formerly Looker Studio), Generic Webhook, Generic REST API.

### Time, finance, and resourcing

Harvest, Lucen Track (Timeneye), Toggl Track, Clockify, Everhour, Float, Resource Guru, QuickBooks Online, Xero.

### Incident, quality, and monitoring

Sentry, Datadog, New Relic, PagerDuty, Opsgenie, TestRail, BrowserStack, Atlassian Statuspage.

## Safety model

Sneup is intentionally conservative around external systems.

- Connector sync is read-only by default and bounded by provider-specific page, item, response-size, timeout, and cursor limits.
- Every adapter must fail visibly when it reaches a configured cap instead of silently skipping data.
- Provider writes go through policy, approval, exact-payload review, execution claim, attempt logging, and outcome follow-up.
- `SNEUP_PROVIDER_WRITES_DISABLED=true` is the emergency stop for all provider writes.
- Demo mode is read-only and cannot perform provider writes.
- Production live mode requires MongoDB and strong purpose-separated secrets.
- OAuth state and connector credentials use separate secrets.
- Runtime logs sanitize authorization headers, cookies, credential-bearing query strings, provider request config, and retained work content.
- Workspace exports stream collection by collection and exclude credentials, hashes, passwords, signing secrets, encrypted destinations, and token material.
- Data repair only updates safe derived state after confirmation and fingerprint recheck.
- Data retention is owner-controlled, bounded, audited, and excludes current project graph data, approvals, audit events, active credentials, pending deliveries, and Trello action attempts.

## Technology stack

- Runtime: Node.js 22+ with Node.js 24 LTS recommended.
- Backend: Express, Mongoose, MongoDB, scheduled workers, structured logging, security middleware.
- Desktop: Electron and electron-builder.
- Data and analysis: normalized work graph models, analytics services, NLP helpers, recommendation evaluation, reporting, PDF generation.
- Integrations: OAuth2, API key, personal access token, generic REST, generic HMAC webhook, Trello API, ngrok.
- Testing: Jest, ESLint, focused verifier scripts, packaged Windows runtime verification, GitHub Actions.

## Run Sneup locally

### Prerequisites

- Windows 11, macOS, or Linux for development.
- Node.js 22.0.0 or newer. Node.js 24 LTS is recommended.
- npm.
- MongoDB 7.0 or newer for live mode.
- Trello credentials if you want Trello sync.
- Optional provider OAuth apps or API tokens for additional connectors.

### Clone

```powershell
git clone https://github.com/Robert-Velhorst/008-Sneup-Digital-Project-Manager.git
cd 008-Sneup-Digital-Project-Manager
```

### Install dependencies

```powershell
npm.cmd ci
```

Use `npm install` when intentionally updating dependencies.

### Configure environment

```powershell
Copy-Item .env.example .env
```

For local demo exploration, keep provider writes disabled and use explicit demo mode from the app when MongoDB is not available.

For live development, set at minimum:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/sneup
PORT=3000
HOST=127.0.0.1
TRELLO_API_KEY=your_trello_api_key
TRELLO_API_TOKEN=your_trello_api_token
CONNECTOR_ENCRYPTION_KEY=use_a_unique_32_plus_character_secret
CONNECTOR_STATE_SECRET=use_a_different_32_plus_character_secret
SNEUP_API_TOKEN_PEPPER=use_a_third_32_plus_character_secret
SNEUP_SESSION_TOKEN_PEPPER=use_a_fourth_32_plus_character_secret
SNEUP_INVITE_TOKEN_PEPPER=use_a_fifth_32_plus_character_secret
SNEUP_PROVIDER_WRITES_DISABLED=true
```

For production, all five secret values above must be strong, unique, non-placeholder values. `npm.cmd run check:release-security` validates that posture without printing the values.

### Start the server

```powershell
npm.cmd start
```

Development autoreload:

```powershell
npm.cmd run dev
```

Open:

```text
http://127.0.0.1:3000
```

### Start the desktop app

```powershell
npm.cmd run desktop
```

## Install on Windows 11

Sneup builds an NSIS Windows installer through Electron Builder.

```powershell
npm.cmd ci
npm.cmd run build:installer
```

The installer is written to:

```text
release\Sneup-Setup-<version>.exe
```

The local release line currently builds `Sneup-Setup-2.3.63.exe`. The generated installer is unsigned unless a publisher certificate is configured in the release environment. Treat unsigned installers as internal test artifacts.

Verify the unpacked Windows app before distributing an installer:

```powershell
npm.cmd run verify:packaged
```

The packaged verifier starts the app, checks loopback health, diagnostics, HAI write posture, process resources, normal window close, and port release.

## Configuration

The complete configuration template is `.env.example`. Important groups are:

- Server: `PORT`, `HOST`, `SNEUP_REQUIRE_API_KEY`, `SNEUP_API_KEY`, `SNEUP_ALLOWED_ORIGINS`.
- MongoDB: `MONGODB_URI`, pool sizing, connection timeout, socket timeout, wait queue timeout.
- Production secrets: `SNEUP_API_TOKEN_PEPPER`, `SNEUP_SESSION_TOKEN_PEPPER`, `SNEUP_INVITE_TOKEN_PEPPER`, `CONNECTOR_ENCRYPTION_KEY`, `CONNECTOR_STATE_SECRET`.
- Provider safety: `SNEUP_PROVIDER_WRITES_DISABLED`, policy rules, approval TTLs, provider-specific caps.
- Trello: `TRELLO_API_KEY`, `TRELLO_API_TOKEN`, webhook secret, board/card limits, sync concurrency.
- Connector OAuth apps: provider-specific `*_CLIENT_ID` and `*_CLIENT_SECRET` variables.
- Connector sync: per-provider timeouts, page sizes, total limits, cursor lookback windows, retry limits, and response-size limits.
- ngrok: `SNEUP_NGROK_ENABLED`, `NGROK_AUTHTOKEN`, `SNEUP_NGROK_DOMAIN`, with API-key enforcement required.
- Notifications and invitations: Resend sender/API key, notification schedules, invite retention.
- AI: optional `OPENAI_API_KEY` and bounded model/context/output settings.
- Retention and repair: workspace retention schedules, invitation retention, repair commands, verification database names.

Run diagnostics after changing configuration:

```powershell
npm.cmd run doctor
npm.cmd run doctor:json
```

## Developer workflow

Useful commands:

```powershell
npm.cmd run lint
npm.cmd test -- --runInBand
npm.cmd run evaluate:recommendations
npm.cmd run check:route-authorization
npm.cmd audit --omit=dev --audit-level=high
npm.cmd audit --audit-level=high
npm.cmd run check:release-security
npm.cmd run check:ci
```

Focused verifier scripts:

```powershell
npm.cmd run verify:workspace-migration
npm.cmd run verify:workspace-deletion
npm.cmd run verify:data-repair
npm.cmd run verify:data-retention
npm.cmd run verify:review-concurrency
npm.cmd run verify:hai-snapshot
npm.cmd run verify:hai-http
npm.cmd run verify:backup-restore
npm.cmd run verify:ledger-acknowledgement
npm.cmd run verify:follow-up-integrity
npm.cmd run verify:trello-webhooks
npm.cmd run verify:trello-list-index
npm.cmd run verify:connector-recovery
npm.cmd run verify:connector-lifecycle
npm.cmd run verify:packaged
```

Some verifier scripts require a dedicated disposable MongoDB URI with an exact guarded database prefix. They refuse broad database names and drop only the guarded verification database.

The follow-up integrity verifier additionally refuses an existing nonempty target, claims an exclusive ownership record before loading models, and verifies its ownership token before cleanup. Competing runs cannot both initialize the same empty target. A failed or uncertain claim does not authorize deletion; use a new disposable name rather than reusing a failed run's database blindly.

For the HAI snapshot/proposal and authenticated HTTP verifiers, see the [disposable database setup and acceptance limits](docs/CLOUD_AND_HAI.md#verification).

For `verify:backup-restore`, see the [native restore drill setup](docs/OPERATOR_RUNBOOK.md#synthetic-native-restore-drill). It checks synthetic data in two new local databases using MongoDB's native tools; it is not a backup of your workspace or proof of production recovery.

For `verify:ledger-acknowledgement`, see [uncertain-write recovery and its test setup](docs/OPERATOR_RUNBOOK.md#uncertain-ledger-writes). The test uses synthetic local database records to check approval preservation, response confirmation, and webhook replay safety. Ambiguous records after an extended outage still require operator reconciliation.

## API overview

Sneup exposes both legacy `/api` routes and versioned `/api/v1` routes. Versioned JSON responses use a stable envelope:

```json
{
  "ok": true,
  "data": {},
  "error": null,
  "meta": {
    "apiVersion": "v1",
    "requestId": "server-generated-id",
    "timestamp": "ISO-8601"
  }
}
```

Important API groups:

- Runtime: `/health`, `/ready`, `/api`, diagnostics, setup, support bundle.
- Boards and cards: board sync, board context, card detail, card relationships, workflow analysis.
- Analytics: latest health, history, critical boards, bottlenecks, velocity, recommendation feedback.
- Team and accountability: workload, assignments, at-risk cards, follow-ups, outcomes.
- Connectors: catalog, accounts, OAuth callbacks, provider-specific account selection, disconnect lifecycle.
- Work Signals: adapter contracts, read-only account sync, normalized graph, dependency review.
- Approvals and policy: recommendation review, approval ledger, policy rules, paused action types.
- Notifications: reconciliation policies, test sends, daily briefs, delivery health.
- Forecasts and reports: scenario inputs, capacity, generated reports, downloads.
- Jobs: job health, runs, pause/resume, manual triggers.
- Workspaces: users, sessions, invitations, exports, deletion, data repair, retention.
- HAI: manifest, OpenAPI, snapshot, approval-gated proposals.
- Webhooks: Trello, generic work-signal ingestion, generic worker-response ingestion.

See the route files under `src/routes` and `docs/API_USAGE_AUDIT.md` for implementation-level details.

## Architecture

```text
.
|-- desktop/                  Electron main process and desktop runtime helpers
|-- public/                   Browser command center assets and deferred view modules
|-- src/
|   |-- index.js              Express startup and runtime wiring
|   |-- models/               MongoDB/Mongoose domain models
|   |-- routes/               HTTP API and webhook routes
|   |-- services/             Business logic, connectors, analytics, safety, reporting
|   |-- utils/                Security, database, logging, shutdown, workspace helpers
|   `-- workers/              Scheduled and background worker entry points
|-- scripts/                  Migration, verification, profiling, release, and support scripts
|-- tests/                    Jest regression, security, resource, and integration tests
|-- docs/                     Operator, security, release, audit, and acceptance evidence
|-- assets/                   Desktop/installer assets
|-- .github/workflows/        CI quality and Windows packaging workflows
|-- package.json              Runtime scripts, dependencies, Electron Builder config
`-- README.md
```

Core runtime concepts:

- `connectorRegistry` defines catalog metadata, auth requirements, scopes, descriptions, and sync targets.
- `accountConnectorService` owns account storage, OAuth state, encrypted credentials, catalog filtering, and account lifecycle.
- `workSignalAdapterService` maps supported providers to bounded read-only adapters.
- `workSignalService` stores normalized signals and projects them into the work graph.
- `trelloSync` manages Trello board/list/card/member/comment sync, webhook observation, and reconciliation.
- `providerWriteSafetyService`, policy services, approval models, and Trello action attempts enforce mutation safety.
- Worker services use leases and audits so multiple processes do not duplicate scheduled work.
- Desktop runtime settings and startup policy decide whether the app runs live, demo, or fails closed.

## Verification and release evidence

The repository is maintained with explicit evidence rather than assumption. Current verification coverage includes:

- ESLint.
- Full Jest regression suite.
- Route authorization inventory.
- Recommendation evaluation.
- Production and full dependency audits.
- Release secret validation.
- Doctor/readiness checks.
- Real MongoDB safety profiles for review concurrency, follow-up integrity, data retention, repair, Trello webhook reconciliation, connector lifecycle, connector recovery, and portfolio scale.
- Browser command-center checks.
- HAI contract checks.
- ngrok safety checks.
- Windows installer build and packaged app runtime checks.
- GitHub Actions quality and Windows packaging/runtime jobs.
- Independent installer artifact download and hash verification for released builds.

Detailed evidence is intentionally kept in docs rather than repeated in the README:

- `docs/FINAL_VERIFICATION_REPORT.md`
- `docs/GOAL_COMPLETION_MATRIX.md`
- `docs/TECHNICAL_AUDIT.md`
- `docs/UI_ACTION_AUDIT.md`
- `docs/CLOUD_AND_HAI.md`
- `docs/ENHANCEMENT_FINDINGS.md`
- `docs/ACCEPTANCE_TESTS.md`

## Operational docs

- `docs/OPERATOR_RUNBOOK.md`: startup, release checks, emergency stop, diagnostics, repair, retention, backup, restore, rollback, Windows build.
- `docs/SECURITY.md`: security model, supported reporting scope, secret handling, provider-write posture.
- `docs/MULTI_WORKSPACE_IDENTITY.md`: workspace selection, sessions, invitations, and identity migration.
- `docs/CLOUD_AND_HAI.md`: Windows, ngrok, HAI, and shutdown flow.
- `docs/IMPLEMENTATION_REPORT.md`: release implementation notes.
- `docs/FEATURE_IMPROVEMENT_PLAN.md`: feature improvement backlog and rationale.
- `docs/TASK_GRAPH.md`: normalized task graph context.

## Known external gates

These items require owner-controlled accounts or infrastructure and are not claimed as complete by local tests:

- Live Trello acceptance with the owner's real boards and webhook configuration.
- Live OAuth acceptance for every third-party connector the owner wants to activate.
- Live ngrok ingress with the owner's token and optional reserved domain.
- Live HAI integration acceptance from the consuming HAI system.
- Production MongoDB restore rehearsal and hosted deployment/canary/rollback.
- Windows publisher signing and trusted update-channel configuration.
- Clean Windows VM installation acceptance.
- Keyboard-only and assistive-technology certification.

## License

MIT. See `LICENSE` when present in the repository.

## Support

Use GitHub issues for questions, bugs, and feature requests. Include the redacted support bundle from `npm.cmd run support:bundle` when reporting runtime configuration issues.
