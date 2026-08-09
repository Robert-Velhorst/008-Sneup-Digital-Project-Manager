# Windows, ngrok, and HAI operation

## Runtime paths

Sneup supports the same application core in three forms:

1. Windows 11 desktop through the current `Sneup-Setup-2.3.5.exe` release target.
2. Local or server Node runtime through `npm start`.
3. Authenticated ngrok ingress layered over either runtime.

The desktop and Node modes both bind the Sneup server to loopback by default. Enabling ngrok does not change that bind address.

Packaged production live mode fails closed before opening the loopback listener when MongoDB is unavailable. Windows then offers an explicit restart into labelled, read-only demo mode or a clean exit; it never silently changes an operator-selected live process into demo mode.

When multiple Sneup cloud processes share MongoDB, startup, scheduled, worker, API, and manual jobs acquire one expiring lease for the exact workspace and job. Active runs heartbeat that lease and release it only with their private token; another process records a skipped run instead of duplicating work. Process loss recovers through expiry. Webhook events remain independently concurrent because their delivery-level idempotency is separate.

## ngrok setup

Configure these environment variables before startup:

```dotenv
SNEUP_NGROK_ENABLED=true
NGROK_AUTHTOKEN=replace_with_your_ngrok_auth_token
SNEUP_REQUIRE_API_KEY=true
SNEUP_API_KEY=replace_with_a_unique_random_value_of_at_least_32_characters
SNEUP_NGROK_DOMAIN=
```

Run `npm run doctor` before starting. `ngrok_ingress` must report `OK`. Sneup then opens one tunnel after the local HTTP listener is ready, sets its runtime public URL, and uses that origin for connector callbacks and invitation links. A reserved domain is optional.

Sneup refuses to create public ingress when the ngrok token, API-key enforcement, or strong API key is absent. On graceful shutdown it closes the tunnel before stopping the HTTP server and database connection.

## Remote browser access

Create a workspace invitation from a locally authenticated Sneup session and share only that one-time invitation URL with the intended user. Invitation acceptance creates a short-lived, revocable workspace session. Do not put `SNEUP_API_KEY` in a browser URL or share it with browser users.

## HAI connector

Create a dedicated workspace API token for HAI. Use only these scopes:

- `integrations:hai:read`
- `integrations:hai:propose` when HAI should be allowed to submit recommendations

Discover the live contract at:

```text
GET /api/v1/integrations/hai/manifest
GET /api/v1/integrations/hai/openapi.json
```

HAI can read a bounded operating snapshot with stable public record, board, and card identifiers and submit an idempotent proposal keyed by `externalId`. Versioned JSON responses include one bounded envelope and request ID for support correlation. Sneup hashes the external ID, strips unapproved action fields, and converts the request into its existing recommendation and decision-queue flow.

The manifest advertises `hai_proposals` as the optional proposal rollout control. A workspace manager can pause or percentage-roll out HAI proposal intake without changing the HAI token. A paused control returns a bounded 503 response; a live rollout-storage failure also fails closed. Snapshot access remains separately permissioned and is not disabled by the proposal control.

The HAI API does not expose approval or execution endpoints. HAI cannot mark its own proposal approved, and it cannot directly write to Trello or another provider through this connector. Human approval remains tied to the exact protected action payload inside Sneup.

## Verification

Run:

```powershell
npm.cmd run doctor
npm.cmd run check:ci
npm.cmd audit --audit-level=high
```

Provider acceptance still requires a real MongoDB workspace, Trello credentials, an ngrok account token, and a separately issued HAI API token. Keep those credentials outside Git and release artifacts.
