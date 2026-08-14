const PRIORITY_ORDER = {
  P0: 0,
  P1: 1,
  P2: 2,
  P3: 3
};

const connectorCoverageEvidence = () => {
  const connectorRegistry = require('./connectorRegistry');
  const workSignalAdapterService = require('./workSignalAdapterService');
  const catalogCount = connectorRegistry.getConnectors().length;
  const adapterCount = workSignalAdapterService.listAdapters()
    .filter(adapter => adapter.capabilities?.credentialBackedSync)
    .length;
  return `Sneup currently has ${adapterCount} read-only credential-backed adapters across ${catalogCount} catalog tools in work management, delivery, communication, resourcing, incident response, CRM, and automation.`;
};

const enhancements = [
  {
    id: 'ENH-001',
    priority: 'P0',
    area: 'connectors',
    title: 'Build provider sync adapters from linked accounts',
    evidence: 'Connector accounts can be linked and stored, normalized WorkSignal records exist, and `/api/work-signals/contracts` exposes adapter contracts. Sneup currently has 111 read-only credential-backed adapters across work management, delivery, communication, resourcing, incident response, CRM, and automation. Each live client decrypts credentials only in process, enforces provider-specific request and item limits with cursor lookback where metadata permits it, performs no provider content writes, and records scheduled sync retry and pacing evidence in Job Health. Scheduled passes use a bounded two-workspace pool by default (maximum four when explicitly configured), while one process-wide provider queue serializes the full pacing and retry cycle for each provider across workspaces. Procore adds an OAuth-only construction-project connection that validates one selected company before capped active-project metadata sync, excluding budgets, contracts, RFIs, submittals, drawings, people, addresses, descriptions, attachments, URLs, and writes. Kantata OX uses an administrator-registered OAuth application to read bounded workspace project metadata from a fixed endpoint, redacting email addresses and URLs in titles while excluding stories, people, schedules, resources, budgets, financials, attachments, comments, custom fields, provider URLs, and writes. LiquidPlanner New uses an administrator-created API token and an explicit numeric workspace ID to read bounded active-project metadata with documented continuation-token pagination, retaining only redacted names, opaque IDs, lifecycle state, and dates. Productive uses a personal API token and an explicit numeric organization ID to read bounded JSON:API project metadata, retaining only redacted names, opaque IDs, archive state, and timestamps. The Generic REST API and n8n adapters reject private-network targets, redirects, oversized responses, raw payload retention, and pagination guessing; Everhour retains only bounded recent time-entry utilization metadata, never descriptions, notes, budgets, expenses, invoices, rates, or profile data.',
    impact: 'Turns the connector marketplace from account linking into cross-tool project ingestion.',
    effort: 'XL',
    status: 'in-progress',
    nextStep: 'Collect production evidence for the selected-company Procore connection and prioritize the next catalog-only provider only when its bounded read-only API contract can be verified.',
    acceptanceCriteria: [
      'Each adapter exposes list, fetchDelta, normalize, and applyAction methods.',
      'A scheduled job syncs connected accounts with retries and per-provider rate limits.',
      'Mission control can show external work signals with source attribution.'
    ]
  },
  {
    id: 'ENH-002',
    priority: 'P0',
    area: 'autonomy',
    title: 'Add a human approval queue for autonomous actions',
    evidence: 'Autopilot commands are queued into the durable recommendation and decision queue with approve, reject, change, snooze, delegate, and action-specific payload-review paths. Reviewers cannot alter the action type, Trello target, provider routing, or execution flags; every saved revision returns to pending for a fresh approval, and move/reassign targets are verified against the current board/workspace. Workspace managers can configure bounded per-risk decision ownership and escalation windows for internal queues. High and critical items remain Robert-owned, overdue VA and team items are atomically escalated with audit evidence, and neither routing nor escalation prepares or performs a provider write.',
    impact: 'Allows Sneup to become more autonomous while preserving human control over risky project changes.',
    effort: 'L',
    status: 'done',
    nextStep: 'Collect live operator evidence before adjusting per-risk ownership or escalation windows.',
    acceptanceCriteria: [
      'Every automatable command can be approved, rejected, snoozed, or delegated.',
      'Approvals are auditable with actor, timestamp, target, and source evidence.',
      'Execution is blocked unless approval policy allows it.'
    ]
  },
  {
    id: 'ENH-003',
    priority: 'P0',
    area: 'security',
    title: 'Add real users, workspaces, RBAC, and audit logs',
    evidence: 'The API resolves request identity and workspace context, supports hashed database API tokens and hashed per-user session tokens, Workspace/User/ApiToken/SessionToken models exist, consequential write endpoints require explicit role permissions, audit-bearing mutating routes discard supplied actor aliases and derive attribution only from the authenticated request identity, and workspace identity administration is restricted to the authenticated workspace unless a local or explicitly approved cross-workspace context is present. Workspace/user/session management APIs exist, and the dashboard lets an administrator inspect issued sessions, create/revoke time-bound invitations, retry failed email invitations, and explicitly revoke active sessions with immediate server refresh. A retry revokes the original link atomically, issues a fresh one-time token, retries delivery, and keeps both records in the audit ledger. Terminal invitation records now retain lifecycle evidence only: a workspace-scoped, bounded scheduled job redacts invitee personal data, token material, and delivery failure text after the configured retention period, with aggregate-only audit evidence. Workspace migration preflight reports only aggregate duplicate-key counts and blocks all backfill/index changes until future PolicyRule and JobControl workspace-unique keys are clean; a connected migration conflict fails closed instead of starting demo mode. Job runs and operator pause controls are workspace-scoped, with the legacy global job-control uniqueness index migrated before a shared deployment creates the composite control index. Identity administrators can explicitly send invitations through Resend or create manual one-time links; production invite links require a clean non-local HTTPS origin and delivery blocks redirects. Multi-workspace identity operations are documented, and boards/cards/connector accounts plus core operations-ledger, analytics, chat, team, list/member/comment, intervention, learning, performance, and job collections are workspace-scoped. Database credentials are still revalidated on every request, while non-audit last-used and last-seen metadata uses active-record-only atomic touches at a bounded five-minute cadence instead of one or two blocking writes per request.',
    impact: 'Required before Sneup can safely run as a shared or internet-facing project-management control plane.',
    effort: 'XL',
    status: 'in-progress',
    nextStep: 'Capture the bounded migration preflight and invitation-retention job evidence from a live workspace before exposing Sneup remotely.',
    acceptanceCriteria: [
      'Every API request resolves a user or service identity.',
      'Connector accounts and project data are workspace-scoped.',
      'Sensitive actions emit immutable audit events.'
    ]
  },
  {
    id: 'ENH-004',
    priority: 'P1',
    area: 'trust',
    title: 'Attach evidence and source citations to every recommendation',
    evidence: 'Recommendations preserve sourceEvidence, `/api/recommendations/:recommendationId/evidence` returns source refs plus decisions, approvals, Trello attempts, audit events, follow-ups, worker responses, and related findings, mission-control command/focus/risk/chat payloads carry sourceEvidence, and card-specific completed, blocked, and needs-help chat updates become worker-response evidence only when they match one already-executed communication intervention for the same workspace, worker, and card. Trello source activity timestamps remain distinct from Sneup sync times, persisted card dwell time plus list averages detect genuine stale and stuck work, and card-member sync atomically reconciles each worker workload index when ownership changes or a card closes. Explicit client/vendor waits remain distinct external-follow-up findings rather than being double-counted as internal blockers or Robert decisions; genuine blocker labels and legal, contract, payment, or other decision signals retain their stricter routing. Due follow-ups expose an operator response form that records a classified observed response against that exact executed intervention, derives its workspace/card/member/recommendation links server-side, and never sends a provider message. Notification deliveries retain only validated HTTPS source links, deduplicate their compact preview, and expose the complete local evidence set in a read-only drilldown. The dashboard renders validated HTTPS source links, response-text-free worker accountability, and minimum-evidence outcome verification wherever an upstream card or provider object exposes one.',
    impact: 'Makes Sneup defensible: humans can inspect why a recommendation exists before trusting it.',
    effort: 'M',
    status: 'done',
    nextStep: 'Collect live operator evidence on source coverage and add additional providers only where gaps are confirmed.',
    acceptanceCriteria: [
      'Each recommendation links to source cards, comments, commits, messages, documents, or analytics snapshots.',
      'The dashboard shows source count and newest evidence timestamp.',
      'API consumers can fetch the evidence bundle for a recommendation.'
    ]
  },
  {
    id: 'ENH-005',
    priority: 'P1',
    area: 'forecasting',
    title: 'Upgrade forecasting with capacity calendars and confidence ranges',
    evidence: 'Sneup now stores workspace-scoped capacity profiles with weekly hours, allocation, focus time, planned time off, skills, and explicit provider IDs. Analysis-only portfolio and board forecasts use those profiles plus historical effort, ownership, overdue work, and risk to return P50/P80 ranges, confidence, assumptions, and delivery risks. Capacity managers can also explore a bounded one-to-ten-person temporary scenario without changing live capacity profiles, provider data, work items, or decisions; Sneup records only the analysis event and a count of changed members in the audit ledger. Bounded Harvest, Everhour, Toggl Track, and Clockify time-entry metadata, mapped Float allocations or approved Resource Guru bookings, and mapped Google Workspace or Microsoft 365 organizer metadata calibrate confidence, expose matched weekly evidence in the Capacity view, and flag modeled-capacity mismatches without changing provider data. Toggl and Clockify evidence requires an explicit opaque user-ID mapping and never retains a provider profile. Human-confirmed Float or Resource Guru project IDs now map to one exact board, are audited, reject cross-board duplication, and expose board-scoped scheduling evidence without reducing capacity. Calendar evidence ignores event text, attendees, locations, all-day events, cancelled events, overlong events, and overlapping-time double counting.',
    impact: 'Improves delivery predictions and prevents false certainty in project dates.',
    effort: 'L',
    status: 'in-progress',
    nextStep: 'Tune capacity and meeting-load mismatch thresholds from reviewed production evidence before considering any calibrated, explicitly approved capacity-reduction model.',
    acceptanceCriteria: [
      'Forecasts return P50/P80 date ranges instead of single dates.',
      'Forecasts explain capacity assumptions and known blockers.',
      'Predictions degrade gracefully when evidence is incomplete.'
    ]
  },
  {
    id: 'ENH-006',
    priority: 'P1',
    area: 'desktop',
    title: 'Add first-run setup and signed desktop release polish',
    evidence: 'The Windows installer works and first run now persists a non-secret demo/live preference in Electron user data, then relaunches before Sneup initializes so a live selection attempts the database-backed runtime. Setup shows nine live, redacted runtime and write-safety checks with exact remediation, including graceful restart configuration, and the desktop can create a configuration-only support file directly in its user-data folder. A branded icon, publisher certificate, and update channel still require release infrastructure.',
    impact: 'Reduces installation friction and improves trust for Windows 11 users.',
    effort: 'M',
    status: 'in-progress',
    nextStep: 'Configure installer icon assets, publisher signing, and update feed credentials in the release environment, then validate the installed first-run restart and support-file paths on a clean Windows 11 VM.',
    acceptanceCriteria: [
      'First run explains demo mode versus live mode.',
      'Installer shows a branded icon and signed publisher when a certificate is configured.',
      'The app can check for updates without blocking startup.'
    ]
  },
  {
    id: 'ENH-007',
    priority: 'P1',
    area: 'operations',
    title: 'Add job observability and controls',
    evidence: 'JobRun and JobControl models track scheduled/manual/skipped runs, stale/failed/paused health, dashboard Job Health controls, and allowlisted pause, resume, and manual trigger endpoints. Scheduled, startup, worker, API, and manual runs now acquire one expiring MongoDB lease per workspace and job, heartbeat while active, release only with the exact private token, recover after process loss, and retain skipped contention evidence. Webhook events remain independently concurrent.',
    impact: 'Makes Sneup operable for real teams and reduces blind spots when sync or analytics jobs fail.',
    effort: 'M',
    status: 'done',
    nextStep: 'Collect representative multi-instance lease duration and contention evidence before changing the five-minute recovery window.',
    acceptanceCriteria: [
      'Each job run records start, finish, duration, status, and error summary.',
      'Operators can pause, resume, and manually trigger safe jobs.',
      'Mission control shows stale data warnings when jobs fail.',
      'Two Sneup instances cannot run the same protected workspace job concurrently.'
    ]
  },
  {
    id: 'ENH-008',
    priority: 'P2',
    area: 'dashboard',
    title: 'Move dashboard CSS and JavaScript into external assets',
    evidence: 'Dashboard CSS and JavaScript now live in external static assets and Helmet no longer allows inline scripts or styles. The HTML stays revalidatable while the JavaScript, CSS, and icon URLs are content-fingerprinted at startup and served with immutable one-year caching, so a changed asset gets a fresh URL without asking operators to clear cache.',
    impact: 'Improves browser hardening and makes the UI easier to test and maintain.',
    effort: 'M',
    status: 'done',
    nextStep: 'Keep cache-header regression coverage whenever dashboard assets or static delivery change.',
    acceptanceCriteria: [
      'CSP no longer needs `unsafe-inline` for scripts.',
      'Dashboard behavior is unchanged in browser smoke tests.',
      'Static assets are cacheable with explicit versioning.'
    ]
  },
  {
    id: 'ENH-009',
    priority: 'P2',
    area: 'ai-quality',
    title: 'Add an evaluation harness for AI recommendations',
    evidence: 'The executable `npm run evaluate:recommendations` suite now covers overdue blockers, overloaded owners, client commitments, VA-ready work, and ambiguous requests. It requires evidence, concrete Yes/No framing, policy-aligned risk and owners, exact payloads for provider writes, and rejects hidden autonomous execution flags. The Enhancements view exposes the current suite score.',
    impact: 'Prevents regressions as Sneup becomes more autonomous.',
    effort: 'M',
    status: 'done',
    nextStep: 'Add approved, de-identified production recommendations to the scenario corpus after human review.',
    acceptanceCriteria: [
      'Evaluation scenarios cover blockers, overload, overdue work, stakeholder updates, and ambiguous requests.',
      'Every model/prompt change runs the evaluation suite.',
      'Unsafe autonomous-action suggestions fail the suite.'
    ]
  },
  {
    id: 'ENH-010',
    priority: 'P2',
    area: 'notifications',
    title: 'Add multi-channel notification delivery',
    evidence: 'Workspace-scoped Slack, Teams, generic webhook, and Resend email policies store destinations encrypted, require explicit activation, limit delivery to reconciliation evidence gaps, ledger every delivery, prevent duplicate alert delivery within a day, defer warning alerts through auditable bounded UTC quiet hours while critical evidence remains immediate, and can group warning evidence into a bounded daily digest with validated source links. Policies can independently schedule a capped read-only daily operations brief or weekly status report, each deduplicated per policy/occurrence with observable scheduler health. Every queued or deferred external delivery is atomically claimed before sending; a concurrent worker reports the existing claim instead of issuing a duplicate request, and stranded sending claims remain visible for operator evidence rather than being blindly retried. Digest source deliveries are only marked digested after the external destination accepts the bundle.',
    impact: 'Moves Sneup from dashboard-only visibility into the places project managers and teams already work.',
    effort: 'L',
    status: 'done',
    nextStep: 'Add bounded delivery-age alerting only after collecting representative production evidence for sending claims.',
    acceptanceCriteria: [
      'Users can choose channel, severity threshold, digest cadence, and quiet hours.',
      'Notifications link back to source evidence and the approval queue.',
      'Delivery failures are visible in job observability.'
    ]
  },
  {
    id: 'ENH-011',
    priority: 'P2',
    area: 'data-model',
    title: 'Introduce a normalized cross-tool work graph',
    evidence: 'Work signals now project into normalized WorkItem, WorkActor, WorkContainer, WorkComment, WorkDependency, and WorkEvent graph models, provider-native dependencies are extracted from Jira, Asana, GitHub, Trello, and generic dependency fields, and Trello card short-link aliases resolve linked-card edges across full and short provider identifiers. Core blocker detection uses only exact linked-card evidence instead of matching card titles in descriptions. Unresolved cross-provider dependency edges persist even before the target work item syncs, old dependency edges are marked stale when provider syncs stop observing them, stale edges remain visible but stop boosting active blocker scoring, stale graph edges can be confirmed, refreshed, or dismissed from Sneup without provider writes, connector sync defers stale-edge processing until each provider batch finishes, and persistent JobRun metadata records bounded per-provider stale-edge counts and failures for Job Health. `/api/work-signals/graph` summarizes graph dependency counts, freshness, review outcomes, and connector-level stale-edge quality for the dashboard, graph items can produce dependency-aware Robert/VA/team decision candidates that rank into mission control as review-only commands/risks, queue approval-gated draft recommendations, appear in the read-only daily operations brief with source/provider evidence, can be inspected in Signals through graph item drilldowns showing source item state, dependency edges, freshness, review state, recent graph events, and queued recommendation history, and now enrich board/card operating ledgers with Trello-linked graph context, direct source links, dependency freshness, and provider/type/direction filters.',
    impact: 'Allows Sneup to reason across projects without forcing every provider into Trello-specific schemas.',
    effort: 'XL',
    status: 'in-progress',
    nextStep: 'Use durable stale-edge telemetry to tune connector-specific freshness thresholds after reviewing the bounded Job Health regression watch in a live workspace.',
    acceptanceCriteria: [
      'Trello data can be projected into the normalized graph without losing Trello-specific fields.',
      'At least three non-Trello providers can sync into the graph.',
      'Mission control can read from the graph rather than Trello-only collections.',
      'Provider-native dependency extraction is implemented for supported tools.',
      'Queued graph decisions appear in the daily operations brief.'
    ]
  },
  {
    id: 'ENH-012',
    priority: 'P3',
    area: 'reporting',
    title: 'Generate stakeholder-ready exports',
    evidence: 'The command center now exports weekly status, standup, risk register, and client update reports in Markdown and PDF from the same live or demo operating context, with owners, dates, risks, decisions, and source evidence.',
    impact: 'Saves project managers recurring reporting time and creates visible value quickly.',
    effort: 'M',
    status: 'done',
    nextStep: 'Add scheduled delivery policies after notification channels are configured.',
    acceptanceCriteria: [
      'Reports can export to Markdown and PDF.',
      'Each report includes risks, decisions needed, owners, dates, and source evidence.',
      'Reports can be generated from live data or demo data.'
    ]
  },
  {
    id: 'ENH-013',
    priority: 'P2',
    area: 'connectors',
    title: 'Finalize the PM connector catalog baseline',
    evidence: 'Connector registry coverage now includes Trello, Jira Software/Service Management, Asana, monday.com, ClickUp, Slack, GitHub, Google, Microsoft, and a broad set of planning, comms, docs, files, finance, incident, and stakeholder tools.',
    impact: 'Gives PM teams a practical starting point for mixed-tool adoption and reduces onboarding friction.',
    effort: 'M',
    status: 'done',
    nextStep: 'Add provider-specific adapter implementations and production-ready sync workers for each newly added catalog item.',
    acceptanceCriteria: [
      'Connector catalog metadata remains valid and validated across OAuth, API-key, manual, and webhook auth types.',
      'Provider sync jobs can be enabled in a controlled rollout without schema churn.',
      'Connector health reports include onboarding state and last sync result.'
    ]
  },
  {
    id: 'ENH-014',
    priority: 'P2',
    area: 'resource',
    title: 'Bound in-memory API rate limiting state',
    evidence: 'The API rate bucket map had a fixed cleanup cutoff but no bound on total bucket cardinality under sustained high-cardinality traffic.',
    impact: 'Prevents avoidable memory pressure while preserving request rate enforcement semantics.',
    effort: 'S',
    status: 'done',
    nextStep: 'Expose metrics for rate-bucket counts and tune `SNEUP_RATE_LIMIT_MAX_BUCKETS`/`SNEUP_RATE_LIMIT_PRUNE_SLACK` per deployment profile.',
    acceptanceCriteria: [
      'Rate limiter memory growth is capped even under attack-like path diversity.',
      'Rate limiting behavior stays stable while stale bucket cleanup and LRU-style pruning run.',
      'Operational docs explain tuning values and their safety envelope.'
    ]
  },
  {
    id: 'ENH-015',
    priority: 'P1',
    area: 'connectors',
    title: 'Require explicit scope review before linking provider accounts',
    evidence: 'Every connector exposes a safety profile, signals are read-only, provider writes are blocked, and a user must acknowledge requested provider scopes before Sneup opens OAuth or accepts provider credentials. Non-secret consent evidence is retained on the linked account and workspace audit ledger. Google Calendar, Zoom, Miro, and Google Chat use documented read-only scopes.',
    impact: 'Makes account linking legible and prevents a convenience connection flow from silently requesting broad provider permissions.',
    effort: 'M',
    status: 'done',
    nextStep: 'Credential rotation keeps token-based connector accounts in place, renews scope evidence, records secret-free audit history, and exposes a bounded read-only rotation deadline. Collect operator evidence before changing rotation intervals or consent retention.',
    acceptanceCriteria: [
      'Connector catalog displays requested scopes and safety posture.',
      'OAuth and credential flows require an explicit scope-review acknowledgement.',
      'Connector ingestion does not perform provider writes.'
    ]
  },
  {
    id: 'ENH-016',
    priority: 'P0',
    area: 'autonomy',
    title: 'Make approved Trello action execution single-claim and fail-safe',
    evidence: 'Approved Trello writes atomically claim the recommendation from approved to executing, reject forged no-approval write records, remain claimed if post-write ledger finalization fails, and expose an operator-only reconciliation path that records observed provider evidence without issuing another Trello request. The Trello SDK now uses a validated 1-60 second timeout, bounded request/response sizes, and no redirects. Timeouts, resets, HTTP 408/5xx responses, local post-write snapshot faults, and partially created checklists retain the claim with exact confirmed/uncertain step evidence instead of becoming retryable failures.',
    impact: 'Prevents duplicate comments, moves, assignments, labels, and other consequential provider writes under concurrent requests or partial internal failures.',
    effort: 'M',
    status: 'done',
    nextStep: 'Collect live provider acceptance evidence for timeout and reset handling before tuning the 15-second default.',
    acceptanceCriteria: [
      'Only one executor can claim an approved provider write.',
      'Provider writes cannot be executed from a record that disables required approval.',
      'Post-write internal failures cannot relabel a successful provider action as failed or retry it automatically.',
      'An operator can reconcile a claimed action with evidence without another provider write.'
    ]
  },
  {
    id: 'ENH-017',
    priority: 'P1',
    area: 'autonomy',
    title: 'Add workspace-scoped Trello action safety controls',
    evidence: 'Workspace managers can inspect and configure the effective safety posture for every supported Trello write action. Rules may pause an action, raise its risk, or route it to a stricter owner, but cannot disable approval. Optional pause review times become visibly overdue without ever re-enabling a provider write, the workspace safety history can be filtered by policy and bounded time window, and the operations ledger rechecks policy before its atomic execution claim.',
    impact: 'Lets humans immediately stop or tighten specific autonomous action types without bypassing the approval ledger or disabling the broader system.',
    effort: 'M',
    status: 'done',
    nextStep: 'Add bounded retention controls for policy evidence after collecting live operator requirements.',
    acceptanceCriteria: [
      'Each workspace has an independent action policy for every supported Trello write type.',
      'A policy cannot lower the baseline risk, weaken the baseline decision owner, or disable provider-write approval.',
      'A paused action type is rejected by the executor before a provider request can start.',
      'Relaxing an existing policy requires an explicit confirmation and produces an audit record.'
    ]
  },
  {
    id: 'ENH-018',
    priority: 'P1',
    area: 'autonomy',
    title: 'Suppress repeated scheduled intervention candidates',
    evidence: 'Scheduled board, follow-up, and escalation scans reuse an equivalent pending, approval-gated, executing, or recently executed intervention using one workspace-scoped policy lookup per scan. Each scheduled signal can retain the 24-hour baseline or extend it to 168 hours; manual requests remain separate, and cooldowns never prepare or perform a provider write.',
    impact: 'Prevents recurring signals from filling Robert\'s approval queue or repeatedly proposing the same worker communication.',
    effort: 'S',
    status: 'done',
    nextStep: 'Add filterable cooldown-policy history and retention controls after collecting live operator evidence.',
    acceptanceCriteria: [
      'Equivalent scheduled card, follow-up, escalation, and team signals reuse their active or recent intervention with one policy read per scan.',
      'Each scheduled signal can only retain or extend the 24-hour cooldown baseline, up to 168 hours.',
      'The suppression window never executes a provider write or relaxes approval requirements.',
      'Manual requests remain distinct from scheduled signal suppression.'
    ]
  },
  {
    id: 'ENH-019',
    priority: 'P1',
    area: 'operations',
    title: 'Make scheduled follow-up transitions durable and auditable',
    evidence: 'The scheduled worker atomically moves overdue workspace-scoped follow-up plans from scheduled to due and writes an audit event. Workspace timing policies set the internal no-response follow-up baseline from 24 to 168 hours and escalation baseline from 48 to 168 hours, while requiring escalation to remain at or after follow-up. Scheduled scans load that policy once per pass, and approved action follow-up plans inherit it. Candidate paths remain approval-gated and never contact a provider.',
    impact: 'Gives operators a durable lifecycle trail while preventing one workspace from processing another workspace\'s queued work or a transient failure from silently suppressing a retry.',
    effort: 'S',
    status: 'done',
    nextStep: 'Add filterable timing-policy history and retention controls after collecting live operator evidence.',
    acceptanceCriteria: [
      'Overdue scheduled follow-up plans transition to due once and include audit evidence.',
      'Scheduled intervention follow-up and escalation scans stay within the requested workspace.',
      'Workspace timing can retain or extend the follow-up and escalation baselines without placing escalation before follow-up.',
      'Scheduled scans load workspace timing once per pass and approved actions schedule follow-ups from the same policy.',
      'A failed candidate path leaves the original intervention eligible for a later safe retry.',
      'Overdue internal VA and team decisions move to Robert exactly once with audit evidence and no provider write.'
    ]
  },
  {
    id: 'ENH-020',
    priority: 'P2',
    area: 'resource',
    title: 'Load command-center data only when its view is opened',
    evidence: 'The initial overview no longer fans out to every hidden dashboard view. Sneup loads the overview, operations brief, and job health immediately, then loads each ledger, connector, signal, forecast, report, and workspace surface on demand. Server routes, database services, connector engines, and background workers now load only when the selected runtime or requested endpoint needs them; health and the complete demo overview avoid MongoDB entirely. Mission control reads every open board and card using exact field projections and plain objects, preserving whole-workspace coverage while excluding descriptions, comments, attachments, histories, checklist text, label metadata, and document wrappers that its summary never uses. It groups analytics in MongoDB to retain only the latest snapshot per board instead of hydrating every historical record. Full and incremental Trello syncs use a bounded two-board pool by default, capped at four, preserving per-board failure isolation while exposing board count and worker capacity in Job Health. The approval ledger also collapses 12 separately authenticated workspace reads into one audit-scoped aggregate request while preserving bounded section limits and section-level availability evidence. That aggregate opts into Mongoose plain-object reads for its serialized evidence, avoiding document hydration while leaving existing detail and mutation paths unchanged. Repeated navigation or refresh clicks share an in-progress view load, and a newer connector catalog request cancels the superseded request before it can consume more work or render stale results. Jobs without any recorded run now render as awaiting their first run and do not inflate stale-alert counts, so a new workspace or local setup does not create false operational alarms. Explicit refreshes and workspace changes invalidate the cache so operators always receive fresh scoped data. Database session and API-token identity is still checked on every request, but activity timestamps are coalesced into atomic five-minute touches; a 100-request real-Mongo profile reduced identity activity writes from 200 to two without weakening revocation, role, or workspace checks. The shared MongoDB client now defaults to 20 application sockets per server instead of the driver default of 100, retains no idle minimum, closes idle sockets, bounds connection establishment, and fails a saturated wait queue after five seconds; every limit is validated and configurable per process. A repeatable startup profiler verifies the health and initial overview contract while reporting import time, response time, memory, module count, and whether MongoDB was loaded.',
    impact: 'Cuts avoidable initial API, authentication, transport, and whole-workspace dashboard-read memory work while keeping every board and card represented in the command view.',
    effort: 'S',
    status: 'done',
    nextStep: 'Add bounded threshold alerts only after collecting representative live workspace baselines.',
    acceptanceCriteria: [
      'Initial overview loading avoids requests for hidden feature views.',
      'Opening a navigation view loads its data exactly when needed.',
      'Refresh and workspace changes invalidate cached view data.',
      'The approval ledger loads its bounded workspace sections through one audit-scoped request without hiding a partial failure.'
    ]
  },
  {
    id: 'ENH-021',
    priority: 'P0',
    area: 'security',
    title: 'Reject predictable token-hashing secrets in live production',
    evidence: 'Live production startup now requires separate, non-placeholder 32+ character peppers for database API tokens, desktop sessions, and workspace invitations. Each token model also rejects an absent or weak production pepper at hash time. The `npm run check:release-security` gate verifies all persisted-token and connector secrets are present, strong, and distinct by purpose without printing their values, while loopback-only demo mode remains credential-free.',
    impact: 'Prevents persisted access and invitation tokens from depending on shared or predictable development fallback values.',
    effort: 'S',
    status: 'done',
    nextStep: 'Add the release-security command to the production deployment workflow once release infrastructure is configured.',
    acceptanceCriteria: [
      'A non-demo production runtime refuses missing, weak, or placeholder token peppers.',
      'API token, session token, invitation token, connector encryption, and OAuth state each use an independent configured secret.',
      'Demo mode remains usable without production secrets.'
    ]
  },
  {
    id: 'ENH-022',
    priority: 'P0',
    area: 'security',
    title: 'Sanitize runtime logs before they leave the application boundary',
    evidence: 'The shared Winston boundary now redacts secrets, authorization headers, cookies, credential-bearing query parameters, request payloads, retained work content, and raw Error request configuration. Worker chat processing records only opaque IDs and channel metadata, never a message excerpt or username.',
    impact: 'Prevents debug and failure telemetry from becoming a second copy of provider credentials or private worker/project content.',
    effort: 'S',
    status: 'done',
    nextStep: 'Review production log retention and transport access controls before introducing external log aggregation.',
    acceptanceCriteria: [
      'Provider credentials and request configuration are redacted before Winston serializes them.',
      'Chat message content is not written to application logs.',
      'Diagnostic error name, status, and code remain available without raw request content.'
    ]
  },
  {
    id: 'ENH-023',
    priority: 'P1',
    area: 'operations',
    title: 'Capture matched worker chat updates in the operating ledger',
    evidence: 'Completed, blocked, and needs-help chat updates now become bounded WorkerResponse records only when they match an unanswered executed comment, follow-up, or escalation for the same workspace, worker, and card. The linked recommendation, intervention, follow-up outcome, and audit trail update without any provider write; generic or ambiguous chat remains unlinked. A signed Generic Webhook inbound bridge now accepts only an administrator-audited source-worker/source-card mapping to a workspace member already assigned to the mapped card, and records matched or unmatched intake without retaining response text in webhook evidence.',
    impact: 'Closes the accountability loop automatically while preventing generic worker conversation from silently resolving unrelated follow-ups.',
    effort: 'S',
    status: 'done',
    nextStep: 'Collect reviewed production evidence for inbound source-to-worker/card mappings before adding provider-native event parsers.',
    acceptanceCriteria: [
      'A card-specific chat update can update the matching executed intervention and follow-up evidence.',
      'Unmatched or context-free chat does not close a ledger item.',
      'Chat ingestion never sends a provider write.'
    ]
  },
  {
    id: 'ENH-024',
    priority: 'P1',
    area: 'resource',
    title: 'Batch board performance snapshots without increasing worker load',
    evidence: 'Daily, weekly, and monthly board performance runs now read the board member set once, then create one bounded board-scoped snapshot of assigned-card, intervention, and comment evidence for all members. The tracker reuses that snapshot for every member record, excludes other-board work from the board score, skips data reads for boards without members, and recalculates board ranks once after the snapshot is persisted. Scheduled board processing remains serial, so the read reduction does not increase database concurrency.',
    impact: 'Reduces repeated database reads and background runtime for multi-member boards while keeping the same performance records, workload metrics, and operator-facing features.',
    effort: 'S',
    status: 'done',
    nextStep: 'Collect Job Health duration and database-read telemetry from representative live boards before changing the scheduled board-processing concurrency.',
    acceptanceCriteria: [
      'A board run reads member, card, intervention, and comment evidence once per board rather than once per member.',
      'Board metrics exclude cards and interventions from another board.',
      'Boards without members avoid unnecessary collection reads.',
      'The optimization does not increase scheduled board worker concurrency.'
    ]
  },
  {
    id: 'ENH-026',
    priority: 'P1',
    area: 'api',
    title: 'Version the API and standardize response diagnostics',
    evidence: 'All dashboard JSON traffic now uses `/api/v1`, whose strict envelope exposes only `ok`, `data`, `error`, and bounded request metadata. Every API and readiness response receives a server-generated request ID shared by its response header, envelope, and sanitized request log. Legacy `/api` routes remain compatible, streamed reports/exports stay unwrapped, external webhook signatures stay on their established paths, and the HAI manifest/OpenAPI contract advertises versioned snapshot and proposal endpoints without exposing approval or execution.',
    impact: 'Makes frontend and HAI failures predictable, traceable, and compatible with future API changes.',
    effort: 'M',
    status: 'done',
    nextStep: 'Keep new public integrations on `/api/v1` and introduce a later API version only for an intentional breaking contract change.',
    acceptanceCriteria: [
      'Versioned JSON responses use one success and error envelope.',
      'Request IDs correlate response metadata, headers, and sanitized logs.',
      'The command center and HAI contract use versioned endpoints.',
      'Legacy API routes and non-JSON protocol responses remain compatible.'
    ]
  },
  {
    id: 'ENH-027',
    priority: 'P1',
    area: 'operations',
    title: 'Add workspace-scoped optional workload rollouts',
    evidence: 'Workspace managers can pause or percentage-roll out connector synchronization, capacity scenarios, work-graph decisions, and HAI proposals. Evaluation is deterministic per declared workspace or actor subject, uses one shared bounded 30-second workspace cache, fails closed in live mode when storage is unavailable, and retains a bounded reviewable revision history. These controls cannot grant permissions, approve recommendations, execute provider writes, disable audits, or weaken workspace isolation.',
    impact: 'Makes hosted canaries, incident rollback, and optional workload resource control immediate without introducing a second authorization system.',
    effort: 'M',
    status: 'done',
    nextStep: 'Capture manager acceptance and staged hosted rollout evidence before changing any capability below its 100% default.',
    acceptanceCriteria: [
      'Every persisted control is scoped by workspace and protected by optimistic revision checks.',
      'Live storage failure pauses optional capabilities while explicit demo mode remains usable.',
      'Rollout changes retain bounded history and create ordinary audit events.',
      'No rollout key can bypass authentication, approval, audit, emergency-stop, workspace, or provider-write controls.'
    ]
  },
  {
    id: 'ENH-030',
    priority: 'P0',
    area: 'security',
    title: 'Keep authenticated ngrok browser ingress lifecycle-safe',
    evidence: 'Sneup validates the ngrok listener as one root HTTPS origin before publishing it, closes an unsafe listener, shares concurrent startup calls, and automatically admits the discovered origin through the existing CORS boundary. Tunnel-owned public and Trello callback URLs are refreshed after an ephemeral restart and restored on close without replacing an operator-owned callback. API authentication, invitation acceptance, workspace sessions, loopback binding, and approval-gated provider writes remain unchanged.',
    impact: 'Makes the documented remote browser and invitation workflow actually usable without broadening origin trust or leaving stale cloud callback URLs after shutdown.',
    effort: 'S',
    status: 'done',
    nextStep: 'Run authorized reserved-domain and ephemeral-domain acceptance through an owner ngrok account before exposing a production workspace.',
    acceptanceCriteria: [
      'The discovered ngrok origin passes the real command-center CORS preflight without manual duplicate configuration.',
      'An invalid, credential-bearing, non-root, or non-HTTPS tunnel URL is closed and never published.',
      'Concurrent startup calls create one tunnel and a restarted ephemeral tunnel receives fresh owned callback URLs.',
      'Shutdown restores prior environment configuration and does not overwrite a callback changed by the operator.'
    ]
  },
  {
    id: 'ENH-031',
    priority: 'P0',
    area: 'operations',
    title: 'Make every scheduler and shutdown path lifecycle-safe',
    evidence: 'Trello sync, analytics, connector sync, interventions, performance, notifications, invitation retention, data retention, and workspace-deletion maintenance now have one owned runtime lifecycle. Repeated initialization does not duplicate schedules, stop clears future work for restart, invalid cron schedules fail startup, and every node-schedule error event is observed without becoming an uncaught process exception. Partial-startup and ordinary shutdown attempt every component in order, then close HTTP and MongoDB even if an earlier stop fails. Job-history failure text is bounded and credential-sanitized before persistence.',
    impact: 'Prevents duplicate background work, orphaned timers, avoidable process crashes, leaked database connections, and credential-bearing provider errors in the operations dashboard.',
    effort: 'M',
    status: 'done',
    nextStep: 'Observe graceful stop and restart under two hosted instances while a bounded scheduled job is active.',
    acceptanceCriteria: [
      'Every recurring scheduler is idempotent, cancellable, restartable, and rejects an invalid schedule.',
      'A failed scheduled callback records evidence without raising an unhandled EventEmitter error.',
      'Partial-startup cleanup closes HTTP and MongoDB even when another component fails to stop.',
      'Persisted job errors are bounded and redact provider credentials before they reach Job Health.',
      'Windows CI launches and closes the packaged app successfully before uploading the installer.'
    ]
  },
  {
    id: 'ENH-032',
    priority: 'P0',
    area: 'operations',
    title: 'Drain active work before restart teardown',
    evidence: 'Shutdown marks readiness unavailable, closes the HTTP listener, cancels future schedules, and waits for active HTTP requests, node-schedule callbacks, connector synchronization, retention, and workspace-deletion maintenance while MongoDB remains connected. One validated 100-120000 millisecond grace window bounds each drain; an overlong HTTP connection is force-closed, a stuck component is reported by stable code and name, and all remaining cleanup still runs. Doctor and Windows setup validate the same setting before startup.',
    impact: 'Prevents restart-time partial writes, abandoned job evidence, database teardown races, and indefinitely hung Windows or cloud shutdowns.',
    effort: 'M',
    status: 'done',
    nextStep: 'Capture a two-instance hosted rolling restart while one bounded job and one authenticated request are active.',
    acceptanceCriteria: [
      'Future schedules are cancelled before the drain, while already-running callbacks remain observable until they settle.',
      'MongoDB disconnect begins only after active background and HTTP work finishes or its bounded deadline is reported.',
      'An overlong HTTP request is force-closed without retaining request content or blocking later cleanup.',
      'Malformed shutdown configuration fails doctor and startup with stable non-secret remediation.',
      'The packaged Windows app still closes normally and releases its loopback port.'
    ]
  },
  {
    id: 'ENH-033',
    priority: 'P0',
    area: 'dashboard',
    title: 'Keep every board visible in latest health evidence',
    evidence: 'Daily brief, approval ledger, reports, notifications, and HAI now share one bounded latest-per-board health query. It selects each board newest snapshot before applying a result cap, ranks critical and at-risk boards first, uses the existing workspace/board/time compound index through an explicit hint, limits database execution time, and populates only the board identity fields the operator needs. A disposable 60-board profile with 180 historical snapshots returns 60 unique boards and retains the critical board in a 20-row cap.',
    impact: 'Prevents repeated history from one board or a pre-deduplication limit from hiding a critical board in Robert dashboard, notifications, reports, or HAI evidence.',
    effort: 'S',
    status: 'done',
    nextStep: 'Review representative hosted board-health history before changing the 100-board brief or 20-board approval/HAI display caps.',
    acceptanceCriteria: [
      'Health evidence contains at most one newest snapshot per board.',
      'Result limits are applied only after newest-per-board selection.',
      'Critical and at-risk boards sort ahead of healthy boards under a bounded cap.',
      'The query uses the workspace, board, and generated-at compound index with a bounded execution time.',
      'Daily brief, workspace ledger, notifications, reports, and HAI consume the same query contract.'
    ]
  },
  {
    id: 'ENH-034',
    priority: 'P0',
    area: 'autonomy',
    title: 'Make review decisions race-safe and terminal states irreversible',
    evidence: 'Approve, reject, change, and exact-payload edits now compare and increment the recommendation revision atomically. The winning approval is bound by ID on the recommendation, losing approval records are removed, execution resolves only that active approval, and expiry clears the binding. Decision queue resolve, snooze, and delegate actions accept only an open item; linked snooze/delegate transitions require a still-pending recommendation and roll back if the queue claim is lost. Terminal items render without stale action controls. A disposable real-Mongo verifier races approve against reject and payload editing, confirms one winner with no orphan approval, and proves stale queue calls cannot revive an executed recommendation or create a Trello attempt.',
    impact: 'Prevents simultaneous reviewers or stale browser requests from reopening an executed recommendation and causing a duplicate provider write.',
    effort: 'M',
    status: 'done',
    nextStep: 'Observe review-conflict rates in a multi-operator hosted workspace before changing user-facing retry guidance.',
    acceptanceCriteria: [
      'Only one simultaneous review transition can win for a recommendation revision.',
      'Execution resolves the exact active approval rather than the newest loosely related approval record.',
      'Snooze, delegate, and resolve cannot mutate terminal decision queue items.',
      'A stale queue item cannot change an approved, executing, executed, failed, rejected, or cancelled recommendation.',
      'Losing review races create no provider write and leave no orphan approval authority.'
    ]
  },
  {
    id: 'ENH-035',
    priority: 'P0',
    area: 'operations',
    title: 'Keep worker responses and follow-up outcomes exact and irreversible',
    evidence: 'Worker responses now claim one executed communication intervention atomically and bind the winning response ID to it; a losing concurrent response is removed. Follow-up resolution uses recommendation identity first, then intervention identity, then card/member fallback, so one answer cannot close unrelated work on the same card. Manual follow-up resolution accepts only scheduled or due records and compares the exact revision. Terminal follow-ups render without stale response, resolve, or escalate controls. A disposable real-Mongo verifier races duplicate responses and conflicting manual outcomes while proving an adjacent same-card follow-up remains open and no Trello action occurs.',
    impact: 'Prevents duplicate accountability evidence and avoids silently marking a different worker obligation complete.',
    effort: 'M',
    status: 'done',
    nextStep: 'Observe hosted duplicate-response and conflict rates before changing operator retry guidance.',
    acceptanceCriteria: [
      'Only one concurrent response can bind to an executed intervention.',
      'A losing response race leaves no duplicate WorkerResponse record.',
      'Recommendation-linked responses resolve only that recommendation follow-up.',
      'Terminal follow-ups cannot be overwritten by stale manual actions.',
      'Response and follow-up integrity checks perform no provider write.'
    ]
  },
  {
    id: 'ENH-036',
    priority: 'P0',
    area: 'security',
    title: 'Make Trello webhook configuration approval-gated and ngrok-aware',
    evidence: 'Startup now waits for the local listener and ngrok callback before observing Trello webhook state. Missing, stale, and duplicate webhooks become deduplicated Robert-owned recommendations with exact protected payloads; create, update, and delete run only through approval, attempt, ambiguity, and audit handling. The provider emergency stop is also enforced inside every low-level Trello card and webhook mutator. A guarded real-Mongo verifier proves repeated reconciliation creates no duplicate decisions, no action attempt, and no provider write.',
    impact: 'Restores real-time ngrok readiness without allowing startup or a direct client call to silently change Trello provider configuration.',
    effort: 'L',
    status: 'done',
    nextStep: 'Capture owner-authorized live Trello and ngrok acceptance for one create, one callback rotation, and one duplicate cleanup decision.',
    acceptanceCriteria: [
      'Webhook observation starts only after the final ngrok-managed callback URL exists.',
      'Missing, stale, and duplicate provider state creates exact approval-gated recommendations instead of direct writes.',
      'Repeated reconciliation reuses existing non-executed decisions.',
      'Every Trello mutator enforces demo mode and the provider emergency stop at the client boundary.',
      'Webhook reconciliation records internal evidence and performs no provider write.'
    ]
  },
  {
    id: 'ENH-037',
    priority: 'P0',
    area: 'operations',
    title: 'Keep connector synchronization recoverable and bounded',
    evidence: 'Transient provider and network failures now persist a bounded exponential retry deadline, remain eligible for later scheduled passes, and clear their failure state after recovery. Permanent authorization and configuration failures stop automatic retries and require operator reconnection. Scheduled and manual synchronization share one distributed workspace lease, while the account API exposes only bounded recovery status instead of raw connector metadata. A disposable real-Mongo verifier proves retry deferral, due recovery, permanent-failure isolation, index coverage, and zero provider writes.',
    impact: 'Prevents one temporary provider outage from silently disabling an account forever while avoiding busy loops and repeated calls with invalid credentials.',
    effort: 'M',
    status: 'done',
    nextStep: 'Observe hosted retry and reconnect rates before changing the default 30-minute to 24-hour backoff window.',
    acceptanceCriteria: [
      'Transient failures remain eligible only after their durable retry deadline.',
      'Permanent authorization and configuration failures require reconnection and are not scheduled automatically.',
      'Manual and scheduled connector synchronization cannot overlap for the same workspace.',
      'Successful recovery clears prior failure metadata and restores connected status.',
      'Recovery verification uses a disposable real database and performs no provider write.'
    ]
  },
  {
    id: 'ENH-038',
    priority: 'P0',
    area: 'security',
    title: 'Make connector disconnect and disabled states authoritative',
    evidence: 'Connector disconnect now requires the exact account name, an explicit provider-authorization acknowledgement, and the current account revision. It shares the workspace synchronization lease, removes local credentials and OAuth refresh leases, preserves prior read-only evidence, records a secret-free audit event, and restores the prior state if audit persistence fails. Disabled and reconnect-required accounts are rejected before feature evaluation, OAuth refresh, provider pacing, or adapter reads; signed Generic Webhook intake already requires connected status. OAuth and credential reconnection reactivate the existing account and clear stale recovery state without a provider write.',
    impact: 'Lets an operator reliably stop Sneup access without erasing evidence or implying that provider-side authorization was revoked.',
    effort: 'M',
    status: 'done',
    nextStep: 'Capture hosted operator evidence for one OAuth and one credential-backed disconnect/reconnect, and revoke provider authorization separately where access must end at the provider.',
    acceptanceCriteria: [
      'Disconnect requires exact confirmation, provider-side acknowledgement, and a current account revision.',
      'Disconnect cannot overlap connector synchronization in the same workspace.',
      'Stored credentials and refresh leases are removed while historical read-only evidence remains.',
      'Disabled and reconnect-required accounts cannot reach OAuth refresh or provider adapters.',
      'Audit failure restores the prior account state, and verification performs no provider write.'
    ]
  }
];

const sortEnhancements = (items) => [...items].sort((left, right) => {
  const priorityDiff = PRIORITY_ORDER[left.priority] - PRIORITY_ORDER[right.priority];
  if (priorityDiff !== 0) return priorityDiff;
  return left.id.localeCompare(right.id);
});

const hydrateEnhancement = (item) => {
  const hydrated = { ...item, acceptanceCriteria: [...item.acceptanceCriteria] };
  if (item.id === 'ENH-001') {
    hydrated.evidence = item.evidence.replace(
      /Sneup currently has \d+ read-only credential-backed adapters across work management, delivery, communication, resourcing, incident response, CRM, and automation\./,
      connectorCoverageEvidence()
    );
  }
  return hydrated;
};

const listEnhancements = (filters = {}) => {
  const filtered = enhancements.map(hydrateEnhancement).filter(item => {
    if (filters.priority && item.priority !== filters.priority) return false;
    if (filters.area && item.area !== filters.area) return false;
    if (filters.status && item.status !== filters.status) return false;
    return true;
  });

  return sortEnhancements(filtered);
};

const getEnhancement = (id) => {
  const enhancement = enhancements.find(item => item.id.toLowerCase() === String(id).toLowerCase());
  return enhancement ? hydrateEnhancement(enhancement) : null;
};

const getSummary = (items = enhancements) => items.reduce((summary, item) => {
  summary.total += 1;
  summary.byPriority[item.priority] = (summary.byPriority[item.priority] || 0) + 1;
  summary.byArea[item.area] = (summary.byArea[item.area] || 0) + 1;
  summary.byStatus[item.status] = (summary.byStatus[item.status] || 0) + 1;
  return summary;
}, {
  total: 0,
  byPriority: {},
  byArea: {},
  byStatus: {}
});

module.exports = {
  getEnhancement,
  getSummary,
  listEnhancements
};
