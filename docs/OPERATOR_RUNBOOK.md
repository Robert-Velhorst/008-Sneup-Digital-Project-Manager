# Operator Runbook

## Start

```powershell
npm.cmd ci
npm.cmd run doctor
npm.cmd start
```

Require `GET /health` to return the process state and `GET /ready` to return HTTP 200. Demo mode may be `degraded`; a live release must also show `criticalPathReady: true`.

## Release checks

```powershell
npm.cmd run lint
npm.cmd test -- --runInBand
npm.cmd run evaluate:recommendations
npm.cmd audit --omit=dev --audit-level=high
npm.cmd run check:release-security
npm.cmd run verify:review-concurrency
npm.cmd run verify:follow-up-integrity
npm.cmd run verify:trello-webhooks
npm.cmd run build:installer
npm.cmd run verify:packaged
```

`check:release-security` must run with the real production environment. Do not paste its secrets into logs or tickets. `verify:review-concurrency`, `verify:follow-up-integrity`, and `verify:trello-webhooks` require their corresponding `SNEUP_REVIEW_CONCURRENCY_VERIFICATION_MONGO_URI`, `SNEUP_FOLLOW_UP_VERIFICATION_MONGO_URI`, or `SNEUP_TRELLO_WEBHOOK_VERIFICATION_MONGO_URI` to name a dedicated disposable database with the verifier's exact prefix. They reject other database names, drop only their guarded database, and never contact Trello.

## Emergency stop

Set `SNEUP_PROVIDER_WRITES_DISABLED=true`, restart every Sneup process, and verify `/ready` reports `providerWrites.mode: emergency_stop`. Keep sync/analysis and webhook observation available for investigation. All low-level Trello card and webhook mutators deny writes even if called outside the operations service. Do not re-enable until unresolved action attempts and provider state have been reconciled.

## Diagnostics

Open **Set up** for the fastest non-technical check. It reports nine bounded runtime and write-safety checks with one prioritized next action. In the Windows app, **Support file** writes the redacted configuration report under the Electron user-data `support` folder and opens its location.

```powershell
npm.cmd run doctor:json
npm.cmd run support:bundle
```

The command-line support bundle is written under `output/support`. Both paths contain configuration state only and exclude environment values, credentials, tokens, connection strings, logs, and user data.

## Data integrity

Run a read-only, workspace-scoped integrity scan first:

```powershell
npm.cmd run repair:data -- --workspace default --json
```

Only cached list counts and member assignment/workload state are eligible for automatic repair. Trello action reconciliation, notification delivery claims, executing recommendations, and stale job runs require operator evidence. After reviewing the current scan, apply only its current safe findings with:

```powershell
npm.cmd run repair:data -- --workspace default --apply --confirm repair-derived-state --json
```

Apply mode re-scans, skips changed fingerprints, writes an audit event for each successful internal update, and never contacts a provider or retries a delivery.

## Data retention

Workspace owners configure retention in Workspace Administration. Keep the policy disabled until its four windows have been reviewed. The preview and each scheduled or manual pass are bounded; manual pruning additionally requires the exact workspace slug. `SNEUP_DATA_RETENTION_CRON` controls the daily worker schedule.

The policy can remove only terminal job history, old board-health snapshots, performance history, finalized notification receipts, and revoked or expired credentials. Audit events, approvals, recommendations, Trello action attempts, active credentials, pending deliveries, and current project/work-graph records are excluded. A failed pre-delete audit blocks the category batch. Validate the boundary against a dedicated disposable database with:

```powershell
$env:SNEUP_DATA_RETENTION_VERIFICATION_MONGO_URI='mongodb://127.0.0.1:27017/sneup_data_retention_verification_local'
npm.cmd run verify:data-retention
```

## Backup and restore

Use MongoDB-native, encrypted, access-controlled backups. Before a release, restore the backup into an isolated database, run workspace migration preflight, compare collection counts and critical indexes, and execute read-only acceptance checks. Never use a production restore target for rehearsal.

## Rollback

1. Activate the write emergency stop.
2. Preserve current audit and action-attempt records.
3. Roll application instances back to the prior immutable artifact.
4. Restore data only when the migration is not backward compatible and a tested restore point exists.
5. Run doctor, readiness, read-only sync, and reconciliation before reopening writes.

## Windows

Build with `npm.cmd run build:installer`. The output is `release/Sneup-Setup-<version>.exe`. Treat unsigned builds as test artifacts; production distribution requires publisher signing and a verified update channel.

Normal desktop close, settings restart, and recovery-to-demo restart share the backend cleanup path. Sneup stops scheduling work, drains active jobs and HTTP requests, closes ngrok, and disconnects MongoDB before allowing a successful quit or queuing a relaunch. Repeated close/restart requests share one operation; a second launch cannot reopen a closing window.

Packaged verification requires a confirmed main-process exit code of `0`, no remaining descendants, and a released port after the close request. A nonzero or unavailable exit code fails verification even if the app disappears. The report includes `mainExitCode`; retain failure reports when investigating intermittent shutdown delays.

Desktop readiness accepts only HTTP 200 from the local health endpoint. Failed requests retry sequentially, up to 80 attempts, with a one-second request inactivity timeout and 250 ms between attempts. Closing the application cancels any active readiness request and queued retry. A timeout followed by a socket error counts as one failed attempt, not two.

The wait for pending runtime initialization uses `SNEUP_SHUTDOWN_GRACE_MS` (15 seconds by default); backend components retain their existing individual shutdown bounds. A pending page load does not delay backend cleanup. If initialization cannot settle or cleanup fails, Sneup logs a fixed, non-sensitive error and exits with status 1 without scheduling a relaunch. Inspect diagnostics and reopen manually after addressing the failure. Forced process termination, power loss, and Windows session termination are not proof of graceful cleanup; use the reconciliation and recovery procedures above when work may have been interrupted.

The backend also owns initialization when run without Electron. Concurrent `initApp()` calls share one startup operation. Once `shutdown()` is requested, initialization stops at the next asynchronous boundary and rejects with `SNEUP_STARTUP_CANCELLED`; it cannot open later startup phases or report readiness. Cleanup waits within the configured grace for the current acquisition before draining components. If acquisition exceeds that bound, shutdown reports `SNEUP_SHUTDOWN_INCOMPLETE`. Any later acquisition receives cleanup, but does not erase that failure. An embedded caller must not treat a timeout as successful teardown or attempt to restart that stopped runtime; restart Sneup in a new process after inspecting the failure. These bounds apply to individual phases, not a single total wall-clock deadline.
