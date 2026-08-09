# Changelog

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
