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

### Notifications and reports

Sneup can prepare reconciliation alerts, daily operations briefs, and reports through configured delivery policies. Destinations are encrypted and sends are claimed atomically to avoid duplicate delivery.

### Workspace administration

Workspace owners can manage users, sessions, invitations, exports, deletion, data integrity repair, and retention policies. Destructive or sensitive workflows require exact confirmations and audit evidence.

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

The local release line currently builds `Sneup-Setup-2.3.43.exe`. The generated installer is unsigned unless a publisher certificate is configured in the release environment. Treat unsigned installers as internal test artifacts.

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
npm.cmd run verify:follow-up-integrity
npm.cmd run verify:trello-webhooks
npm.cmd run verify:trello-list-index
npm.cmd run verify:connector-recovery
npm.cmd run verify:connector-lifecycle
npm.cmd run verify:packaged
```

Some verifier scripts require a dedicated disposable MongoDB URI with an exact guarded database prefix. They refuse broad database names and drop only the guarded verification database.

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
