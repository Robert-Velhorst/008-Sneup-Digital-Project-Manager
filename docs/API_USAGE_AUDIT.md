# API Usage Audit

## Surface

The Express application exposes its 28 route modules through backward-compatible `/api` paths and a strict `/api/v1` contract. All application routes pass through request authentication, rate limiting, response timing, workspace resolution, and per-handler permissions. Webhook, OAuth callback, and public invitation exceptions are narrowly matched.

## Reachability

The browser command center routes JSON calls through `/api/v1` and unwraps them in one parser. Workspace export uses an owner-only streamed response instead of the JSON envelope. Archived-workspace deletion uses a separate owner-only exact-confirmation flow and invalidates the current workspace identity. Secondary routes are used by connector OAuth callbacks, workers, webhooks, CLI/operator flows, and detailed board/card views.

## External writes

- Trello writes: only `POST /api/recommendations/:id/execute-approved`, via the operations ledger.
- Connector sync adapters: read-only and bounded; they do not share the Trello write executor.
- Notification delivery: requires an active workspace policy and explicit provider configuration.
- Invitation email: explicit identity-admin action with production URL validation.

## Contract

- Versioned JSON responses use `{ ok, data, error, meta }`. Errors contain a bounded code/message and do not copy arbitrary route context.
- `meta.requestId` matches `X-Sneup-Request-Id` and sanitized request logs. Request IDs are not generated for static assets.
- Existing `/api` routes remain available for compatibility. External webhook signatures retain established unversioned paths.
- The HAI integration publishes raw OpenAPI 3.1 at `/api/v1/integrations/hai/openapi.json`; it intentionally omits approval and execution operations.
- Workspace rollout reads use `GET /api/v1/feature-flags`; history requires `audit:read`, and updates require `feature-flags:manage` plus the expected revision.
- Rollout controls cover optional workloads only. They cannot replace authentication, approval, audit, emergency-stop, workspace, or provider-write authorization.

The new `/ready` endpoint reports operational state only and never returns secret values or connection strings.
