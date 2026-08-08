# Changelog

## 2.1.0 - 2026-08-08

### Added

- Redacted runtime doctor and support bundle commands.
- Readiness endpoint with explicit demo/live and critical-path state.
- Audited deployment-wide provider-write emergency stop.
- GitHub Actions quality gates and unsigned Windows installer artifact build.
- Production audit, acceptance, security, runbook, traceability, and verification documents.

### Security

- Provider writes can be stopped globally before workspace policy evaluation or execution claim.
- Diagnostics report configuration state without returning credential or connection-string values.
