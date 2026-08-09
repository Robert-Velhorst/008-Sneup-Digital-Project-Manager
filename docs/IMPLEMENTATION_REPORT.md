# Sneup Implementation Report

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
- English/Dutch localization is a standalone browser module with exact-message translation, local date/number/plural formatting, and one bounded local-storage preference. Its 33,577-byte catalog adds no server module, API request, database work, provider traffic, polling, or runtime dependency, and it never auto-translates provider, user, audit, or source-evidence text.
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
- Current release target: `release/Sneup-Setup-2.3.16.exe`.

The verified local 2.3.16 installer is 109,462,200 bytes with SHA-256 `33F959504DAE00AE5F8ED4D5DAB5FC2CA21FDA3B7CAB40BAF1554DE49E6587E5`. It is intentionally reported as unsigned until an owner-controlled publisher certificate is available. The packaged executable reports product/file version 2.3.16 and retains the Windows x64 native ngrok binding.

The desktop app starts Sneup on `127.0.0.1` and opens the command center in an app window. On first run it starts in demo mode. The workspace choice stores only the non-secret `demo` or `live` startup preference in the Electron user-data directory, then relaunches before Sneup initializes. Production live mode fails closed before opening the HTTP listener when MongoDB is unavailable. The Windows error dialog can persist an explicit read-only demo choice and relaunch, preventing a failed live preference from trapping the user. An explicitly set `SNEUP_DEMO_MODE` environment variable takes precedence over the local preference until the user chooses the recovery action.

## Verification

- Syntax checks passed for changed JavaScript files.
- The final quality gate passed 105 suites/799 tests, lint, and the 5/5 recommendation evaluation.
- The current demo startup profile imported 251 modules at 70.8 MB RSS and served the complete initial overview at 74.3 MB RSS without loading Mongoose.
- The guarded real-Mongo scale profile passed 60 boards and 15,000 cards at 1.26 seconds cold and 0.61-1.11 seconds repeated-read latency; its exact query index was selected and provider writes remained false.
- The in-app Browser passed English/Dutch restoration, localized help search/topic routing, setup diagnostics, the language control's accessible name, desktop and compact responsive containment, and zero current console errors.
- The packaged 2.3.16 demo settled to four processes, 360.6 MB working set, 292.6 MB private memory, and 1.859 cumulative CPU seconds after 30 seconds; normal close released every process and the loopback port.
- Production-only and complete dependency audits both reported zero vulnerabilities; the five-secret production release check passed without exposing values.
- Prior live disposable-workspace draft and preset coverage remains part of the browser acceptance evidence.
