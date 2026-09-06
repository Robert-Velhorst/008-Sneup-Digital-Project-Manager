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

## Uncertain ledger writes

If a database write loses its acknowledgement, Sneup tries one exact-identity readback from the primary. Review decisions carry `lastReviewDecisionId` plus a revision; worker claims carry `response.workerResponseId`. Matching a similar status or another review is not sufficient. Recovery has a five-second caller deadline and a five-second driver operation timeout; a late read cannot resume downstream writes. The installed driver's [`timeoutMS` option](https://mongodb.github.io/node-mongodb-native/6.19/interfaces/FindOneOptions.html#timeoutMS) covers the client operation, separately from server execution limits.

An unconfirmed outcome returns HTTP 503 with retained evidence instead of deleting the approval/response or claiming success. Refresh the recommendation and inspect its approval history, exact `currentApprovalId`, `lastReviewDecisionId`, intervention response reference, and audit trail. Do not infer execution permission from an unlinked approval-history record. Only the existing exact current approval and protected payload can authorize execution.

New intervention-bound worker responses remain `claimState: pending` until their claim is confirmed. Pending rows stay in recommendation evidence but are excluded from normal response lists, accountability counts, and outcome evaluation. Historical records without this field retain their existing behavior; this change does not certify historical records or silently rewrite them.

Generic worker-response webhooks durably reserve each delivery before matching an intervention. An interrupted or uncertain delivery stays `reconciliation_required`, is not automatically retried, and has no TTL expiry that could permit a delayed replay. Duplicate delivery requests return HTTP 409 until operator reconciliation. Successful processing restores normal delivery retention. Ordinary inbound work-signal retry behavior is unchanged.

Keep uncertain records for investigation. Do not delete a reserved delivery, change it to `failed`, resend it with a new delivery ID, or confirm a pending response merely to clear an error: that can associate one message with another intervention. Review the exact source event, workspace, member/card, response/intervention references, follow-ups, and audits first. Automated recovery after an extended database outage or process loss is not implemented for these ambiguous records; operator reconciliation remains required. These records may accumulate during outages and must be monitored; they are deliberately excluded from routine expiry.

Run the synthetic database test with:

```powershell
$env:SNEUP_LEDGER_ACK_MONGO_URI = 'mongodb://127.0.0.1:27017'
npm.cmd run verify:ledger-acknowledgement
```

It accepts only the explicit loopback host and port, generates a fresh random database, refuses an existing nonempty database, and checks cleanup. It saves real MongoDB writes before injecting confirmation failures, verifies all three review decisions, response claims, pending-response outcome exclusion, reconnect evidence, and webhook replay isolation. Two explicitly synthetic successful action-attempt fixtures support outcome evaluation; no provider is contacted and no additional action attempt is created. This is not live provider, network-failover, power-loss, or hosted acceptance.

## Read-only recovery findings

Workspace Administration's Data Integrity scan includes pending worker-response claims and quarantined worker webhooks older than 15 minutes, plus invalid active approval references. Technical evidence is collapsed by default and includes only identifiers and the small current/expected state projection, not response bodies or delivery payloads. Do not treat a clear scan as approval to execute: approval expiry and exact payload freshness remain execution-time checks.

The overview prioritizes review-required findings before cache repairs but is bounded. Select a category to scan that category alone, then continue with **Next records** until there is no continuation. Healthy approval records can produce an empty page with a next-page control. **First records** starts that category again; **Scan** returns to the overview. Concurrent workspace/category changes supersede earlier responses. This is a live paginated view, not a transactional snapshot: records can change during a scan.

`GET /api/v1/integrity` requires `audit:read`. Its optional `category` must be one of the returned `categories`; `afterId` requires a category and a 24-character hexadecimal record ID. `nextAfterId` advances in ascending record-ID order. `limit` defaults to 200 and is clamped to 1-500. Derived-state repair requests must preserve the report's `category`, `afterId`, and `limit` with its fingerprints and exact confirmation; they still require `integrity:repair`. None of the recovery categories is repairable by this endpoint.

The ledger acknowledgement verifier additionally checks the real authenticated HTTP path, category continuation beyond healthy approvals, recent-versus-aged recovery records, workspace-header isolation, read-only credential restrictions, and unchanged recovery evidence after skipped repairs. It starts a temporary loopback HTTP listener without runtime initialization or workers, then closes it before database cleanup. This provides visibility and diagnostics, not automatic outage reconciliation.

## Data retention

Workspace owners configure retention in Workspace Administration. Keep the policy disabled until its four windows have been reviewed. The preview and each scheduled or manual pass are bounded; manual pruning additionally requires the exact workspace slug. `SNEUP_DATA_RETENTION_CRON` controls the daily worker schedule.

The policy can remove only terminal job history, old board-health snapshots, performance history, finalized notification receipts, and revoked or expired credentials. Audit events, approvals, recommendations, Trello action attempts, active credentials, pending deliveries, and current project/work-graph records are excluded. A failed pre-delete audit blocks the category batch. Validate the boundary against a dedicated disposable database with:

```powershell
$env:SNEUP_DATA_RETENTION_VERIFICATION_MONGO_URI='mongodb://127.0.0.1:27017/sneup_data_retention_verification_local'
npm.cmd run verify:data-retention
```

## Backup and restore

Use MongoDB-native, encrypted, access-controlled backups. Before a release, restore the backup into an isolated database, run workspace migration preflight, compare collection counts and critical indexes, and execute read-only acceptance checks. Never use a production restore target for rehearsal.

### Synthetic native restore drill

Install the [MongoDB Database Tools](https://www.mongodb.com/try/download/database-tools), then run this repeatable local rehearsal from the repository:

```powershell
$env:SNEUP_BACKUP_RESTORE_MONGO_URI = 'mongodb://127.0.0.1:27017'
npm.cmd run verify:backup-restore
```

`mongodump` and `mongorestore` must be on `PATH`. Alternatively, set `SNEUP_MONGODUMP_PATH` and `SNEUP_MONGORESTORE_PATH` to their full executable paths. They are operator/developer tools, not bundled into the Windows installer. The drill accepts only an explicit loopback host and port, without credentials, database names, query options, or remote hosts; it does not read `MONGODB_URI` or `.env`. Use a local disposable MongoDB instance matching your deployment's major version. CI also runs this drill using its isolated MongoDB service.

The drill creates two random `sneup_restore_drill_<16 hex characters>_source/target` databases, refuses nonempty targets, and claims each with an ownership marker. It initializes the workspace collection registry and seeds synthetic boards, cards, pending decisions, exact-payload approvals, unresolved action attempts, audit evidence, encrypted credentials, and a second workspace. No provider account is contacted and no worker or app server starts.

Both the application driver and native tools enforce `directConnection=true` internally, so the accepted loopback seed cannot redirect the drill to discovered replica-set hosts. Uncertain marker writes are rechecked during cleanup, never treated as permission to delete by name. Independent cleanup continues after one resource fails; a still-pending model initializer blocks database deletion, while archive and connection cleanup are still attempted. Native-tool deadlines use forced termination rather than relying on a cooperative termination handler.

It uses a compressed native archive with one collection worker, then restores into the second database without `--drop`. The checks compare collection options, every index definition including compound-key order, document counts, and streamed raw-BSON hashes. Restored reads verify approval/reconciliation state, credential decryption, workspace preflight, and HAI snapshot isolation; they must not change the restored data. Each native command is bounded to two minutes. A successful result requires both owned databases and the temporary synthetic archive to be removed. If cleanup cannot be confirmed, inspect only the isolated drill resources; do not delete an existing database on the basis of its name alone.

This is a small, synthetic, quiescent-data rehearsal, not a backup of your workspace, production restore acceptance, an encrypted backup service, or a throughput benchmark. The temporary archive is compressed, not encrypted. It contains only the drill's synthetic data and is removed afterward. MongoDB documents the archive/index behavior in [mongodump](https://www.mongodb.com/docs/database-tools/mongodump/) and the namespace-remapping restore options in [mongorestore](https://www.mongodb.com/docs/database-tools/mongorestore/).

### Production recovery requirements

- Keep the original `CONNECTOR_ENCRYPTION_KEY` and identity-token peppers in a separate protected recovery store. A database backup does not contain the environment's encryption key; losing it prevents decryption of restored connector credentials. Do not put these secrets into Git, support files, or the backup command line.
- Use a supported consistent backup procedure for the actual standalone, replica-set, sharded, or managed deployment. A plain dump of a changing database is not automatically a point-in-time snapshot. Stop writers or use the topology-appropriate snapshot/oplog mechanism; do not assume this quiescent drill proves concurrent-backup consistency.
- Keep provider writes disabled in every restored app instance. Restoring old data can restore still-valid approval records while losing evidence of later provider actions. Reconcile against current provider state and preserve post-backup audit/attempt evidence before considering any retry or re-enabling writes.
- Rehearse with the actual encrypted backup, recovered secrets, production-like volume, access controls, migration/rollback path, and recovery time/data-loss targets in an isolated environment. Verify indexes and read paths before admitting users. The synthetic drill does not close these operator-controlled gates.

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
