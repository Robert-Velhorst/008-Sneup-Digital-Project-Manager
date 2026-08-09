# Changelog

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
