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
npm.cmd run build:installer
```

`check:release-security` must run with the real production environment. Do not paste its secrets into logs or tickets.

## Emergency stop

Set `SNEUP_PROVIDER_WRITES_DISABLED=true`, restart every Sneup process, and verify `/ready` reports `providerWrites.mode: emergency_stop`. Keep sync/analysis available for investigation. Do not re-enable until unresolved action attempts and provider state have been reconciled.

## Diagnostics

```powershell
npm.cmd run doctor:json
npm.cmd run support:bundle
```

The support bundle is written under `output/support`, contains configuration state only, and excludes environment values, credentials, logs, and user data.

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
