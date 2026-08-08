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
