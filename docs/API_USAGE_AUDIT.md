# API Usage Audit

## Surface

The Express application mounts 27 route modules with 168 declared route handlers. All application routes pass through request authentication, rate limiting, response timing, workspace resolution, and per-handler permissions. Webhook and public invitation exceptions are narrowly matched.

## Reachability

The browser command center directly calls workspace, security, operations-ledger, forecast, jobs, notification, policy, report, work-graph, enhancement, and autopilot endpoints. Workspace export uses an owner-only streamed response instead of the ordinary JSON helper. Secondary routes are used by connector OAuth callbacks, workers, webhooks, CLI/operator flows, and detailed board/card views.

## External writes

- Trello writes: only `POST /api/recommendations/:id/execute-approved`, via the operations ledger.
- Connector sync adapters: read-only and bounded; they do not share the Trello write executor.
- Notification delivery: requires an active workspace policy and explicit provider configuration.
- Invitation email: explicit identity-admin action with production URL validation.

## Contract risks

- Legacy routes do not yet use one universal JSON error envelope; status codes and sanitized messages are consistent, but response shapes differ.
- API versioning is not namespaced. A hosted public API should introduce `/api/v1` before compatibility promises.
- The general Sneup API remains route-and-test documented. The bounded HAI integration additionally publishes a dedicated OpenAPI 3.1 contract at `/api/integrations/hai/openapi.json`; it intentionally omits approval and execution operations.

The new `/ready` endpoint reports operational state only and never returns secret values or connection strings.
