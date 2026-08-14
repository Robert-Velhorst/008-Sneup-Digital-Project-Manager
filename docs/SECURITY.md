# Security

## Trust boundaries

Sneup separates browser/API identity, workspace-scoped persistence, encrypted connector credentials, read-only provider ingestion, notification delivery, and the approval-gated Trello write executor. Demo mode is a separate read-only boundary.

## Controls

- CSP, Helmet, bounded JSON/form/webhook bodies, origin controls, request throttling, and capped in-memory rate-limit cardinality.
- ngrok returns one validated root HTTPS origin, which is admitted dynamically without wildcard CORS; unsafe listeners close, concurrent starts share one tunnel, and tunnel-owned public/callback URLs are restored on shutdown.
- Role permissions and workspace ownership on API tokens, sessions, invitations, connectors, jobs, policies, recommendations, actions, and audit reads.
- Independent 32+ character production peppers; separate connector encryption and OAuth-state secrets; placeholder and secret-reuse rejection.
- OAuth state signing, redirect validation, fixed provider hosts, atomic expiring token-refresh leases, encrypted refresh-token rotation, secret-free refresh audits, SSRF/DNS protections where custom hosts are supported, redirect denial, timeouts, bounded pages, and redacted retained fields.
- Exact approval payload snapshot, expiry, action policy, atomic claim, idempotency evidence, timeout/reset/HTTP 408/5xx ambiguity classification, multi-step partial-write evidence, and no automatic retry after ambiguous writes.
- Graceful restart stops request admission and future schedules, drains active work before database teardown, bounds overlong connections, and reports component codes without request or credential content.
- Board-health evidence is matched to the authenticated workspace before newest-per-board aggregation; bounded caps occur after deduplication and cannot mix another workspace current state.
- Deployment emergency stop: set `SNEUP_PROVIDER_WRITES_DISABLED=true` and restart. Denials are audited before policy resolution or execution claim.
- Logs and support bundles exclude secret values. The support bundle also excludes logs and user data entirely.
- Scheduled failures have an explicit `error` observer, and persisted Job Health failure text passes through bounded credential redaction before storage or display.
- Graceful and partial-startup cleanup attempts every scheduler, ngrok, HTTP, and MongoDB boundary even when an earlier component fails to stop.

## Incident response

1. Activate the emergency stop and restart all instances.
2. Revoke affected provider tokens and API/session tokens.
3. Preserve audit/action/job records and create a redacted support bundle.
4. Inspect unresolved action attempts before any provider write is re-enabled.
5. Rotate secrets by purpose; never reuse a token pepper as a connector secret.
6. Re-enable only after explicit owner review and a bounded canary.

## Known boundaries

The distributed Windows installer is unsigned until a publisher certificate is configured. Live provider consent, production database backups, penetration testing, and deployment configuration remain operator-owned release gates. Security issues should be reported privately to the repository owner and must not include live credentials.
