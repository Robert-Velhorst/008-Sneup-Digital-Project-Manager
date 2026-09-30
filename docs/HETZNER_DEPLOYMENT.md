# Hetzner Cloud Deployment

Hetzner Cloud is the current cloud target. ngrok is not required or enabled in this deployment. Existing optional ngrok code is retained for backwards compatibility, not as a production requirement.

## Topology

`Internet -> Caddy HTTPS (80/443) -> Sneup (private network) -> authenticated MongoDB (separate internal network)`

The repository provides `Dockerfile`, a deny-by-default `.dockerignore`, and `deploy/hetzner/compose.yaml`. The app runs as non-root with a read-only filesystem, bounded writable temporary storage, dropped capabilities, a process limit, persistent bounded logs, a 1 GiB memory limit, and a 30-second shutdown allowance. MongoDB has a 1 GiB memory limit and a 0.25 GiB WiredTiger cache. These starting limits are adjustable configuration, not validated capacity guarantees. Neither app nor MongoDB publishes a host port. Only Caddy publishes 80 and 443; MongoDB is not on the proxy network.

The dedicated MongoDB app user has `readWrite` only on `sneup`; the root credential is separate. Credentials in Compose environment variables are accessible to host administrators and Docker administrators. Keep the deployment `.env` outside shared access, use mode 0600, and restrict SSH/Docker access. Do not print interpolated `docker compose config` output into tickets or logs.

## Before Deployment

Use an owner-authorized existing or newly provisioned Hetzner host with Docker Engine and Compose v2. No server, domain, firewall, paid resource, or live secret is provisioned by these files. Inspect existing services first: this configuration owns ports 80/443 and must not displace an existing reverse proxy. If the host already uses Caddy/Traefik/nginx, adapt the app's private upstream and trusted IP to that existing proxy instead of starting a second proxy.

Configure DNS A/AAAA records for the actual domain and verify that every advertised address reaches this host. Restrict SSH to operator networks and allow inbound TCP 80/443 in the Hetzner Firewall. Do not expose 3000, 27017, or a Docker administration socket. Review outbound access required by approved providers. [Hetzner Firewall documentation](https://docs.hetzner.com/cloud/firewalls/overview/).

Check that both `10.255.108.0/24` and `10.255.109.0/24` avoid existing routes and Docker networks, and do not overlap each other. Change `SNEUP_PROXY_SUBNET`, `SNEUP_PROXY_IP`, and `SNEUP_PROXY_DYNAMIC_RANGE` together if needed; the fixed proxy IP must be inside the subnet but outside its automatic allocation range. The default `10.255.108.128/25` allocation range prevents the app taking Caddy's `10.255.108.2` address while starting first. Change `SNEUP_DATA_SUBNET` independently. Explicit subnets avoid relying on Docker's automatic address pool. The app trusts only the proxy's explicit address; Caddy replaces inbound forwarded headers. Blanket proxy trust and numeric hop counts are rejected. Enforced authentication prevents forwarded localhost addresses from granting local-owner bypass. [Caddy reverse-proxy documentation](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy), [Docker networking documentation](https://docs.docker.com/compose/how-tos/networking/).

## Configuration And Startup

From the repository root on the server:

```sh
cp deploy/hetzner/.env.example deploy/hetzner/.env
chmod 600 deploy/hetzner/.env
```

Set `SNEUP_DOMAIN` to the actual domain, without a scheme, port, path, or trailing slash. Generate each of the eight secret values independently using `openssl rand -hex 32`. The app database password must be exactly 64 lowercase hexadecimal characters so it is safe in the MongoDB URI. Do not reuse the root password, app password, API key, peppers, or connector secrets. Preserve the five encryption/hashing secrets securely with encrypted backups; replacing them breaks existing encrypted connector credentials, sessions, invitations, or API tokens.

Trello credentials are optional for initial setup. With no Trello credentials, the live database and administration path can run, but the critical Trello path is not ready. Do not supply example Trello credentials. Keep `SNEUP_PROVIDER_WRITES_DISABLED=true` until the operator has verified accounts, scopes, callbacks, backups, and pending approvals. Disabling this emergency stop never bypasses per-action approval.

For other connector OAuth client settings, notification delivery, optional model settings, or runtime tuning, copy `deploy/hetzner/app.env.example` to ignored `deploy/hetzner/app.env`, restrict it to mode 0600, and set `SNEUP_APP_ENV_FILE=./app.env` in the deployment `.env`. Use the repository-root `.env.example` as the supported setting reference, adding only the settings actually needed. Never put the database root credential or unrelated host secrets in the app file. Core Compose authentication, storage, bind, tunnel, origin, and emergency-stop settings override that file; Trello credentials remain in the deployment `.env`. Restart/recreate the app to apply changes. Optional paid model or notification configuration requires the owner's separate authorization; no account is connected by copying a template.

```sh
docker compose --project-name sneup --env-file deploy/hetzner/.env -f deploy/hetzner/compose.yaml config --quiet
docker compose --project-name sneup --env-file deploy/hetzner/.env -f deploy/hetzner/compose.yaml build app
docker compose --project-name sneup --env-file deploy/hetzner/.env -f deploy/hetzner/compose.yaml up -d --wait --wait-timeout 180
curl --fail https://YOUR-ACTUAL-DOMAIN/ready
```

The cloud entrypoint refuses insecure secrets, reused API authority, demo mode, ngrok, missing MongoDB, untrusted request-host callbacks, or a non-HTTPS/mismatched public origin. It invokes the existing startup, migrations, schedules, and shutdown path; it does not introduce a parallel backend. The container readiness check uses `/ready`, which fails for configuration errors or disconnected live storage. Caddy checks the same endpoint. A deliberately paused provider-write path reports degraded readiness rather than enabling external writes.

For initial owner onboarding, use the existing protected administration API from inside the host/container with the configured service API key: read `GET /api/v1/workspaces/current`, then create an owner invitation through `POST /api/v1/workspaces/{workspaceId}/invitations`. The request body requires the owner's email, display name, and `role: "owner"`; email delivery is a separate explicit action. Open the returned one-time HTTPS link privately. Do not put the service API key in URLs or distribute it to browser users. Subsequent users use workspace-scoped sessions/invitations; HAI uses a separately issued least-privilege token.

When using the service key through the remote proxy, explicitly select the returned workspace ID with `X-Sneup-Workspace-Id` for administration requests. Without selection, the default workspace key can differ from the persisted workspace ID and administration correctly returns HTTP 403. Database user sessions cannot use this header to escape their assigned workspace. Successful invitation acceptance returns HTTP 201 with its single-use session token.

All callback/invitation URLs use the configured domain: Trello `/api/webhooks/trello`, connector-specific OAuth paths, and HAI `/api/v1/integrations/hai`. Register approved OAuth redirect URLs at the providers; the repository cannot do this without account authorization. Trello webhook drift still creates approval-gated recommendations rather than silently changing the provider.

## Operations And Recovery

MongoDB, app logs, and Caddy certificate state persist in separate named volumes. MongoDB init runs only for an empty volume; changing the `.env` password does not rotate an existing MongoDB user. Use an explicit authenticated database credential-rotation procedure, update both sides, and verify after restart. Never use `down --volumes` on production.

Before upgrading, take and verify an encrypted application-consistent backup and retain the previous immutable app image tag/digest. Pin release images for repeatability; defaults in this repository track maintained major image tags. Review database migration compatibility before rollback. Recreating an app container does not undo schema/data changes. Server snapshots alone are not a verified MongoDB restore plan. Use the existing backup/restore and operator runbooks, including preservation of connector encryption keys and token peppers.

Observe `/ready`, protected diagnostics, job history, failed connector syncs, disk usage, and MongoDB/app memory. Logs are under the persistent `app_logs` volume rather than production stdout. Tune limits using representative workload measurements; do not assume one synthetic startup sample establishes production capacity. Caddy's default access log is not enabled here, avoiding invitation-token query strings in access logs.

Stop/restart through Compose so SIGTERM reaches Node and the existing bounded drain finishes before MongoDB is stopped. Provider recovery and action reconciliation remain explicit audited operations.

## Verification And Remaining Gates

```sh
docker build --load -t sneup:hetzner-verification .
npm run verify:cloud-container
npm run check:ci
```

The verifier owns a randomly named disposable Compose project, generates local-only secrets, publishes no ports, validates Caddy configuration, and runs real production-mode app/MongoDB startup, private Caddy HTTP forwarding, authentication, HAI manifest, and shutdown checks. It also creates a manual owner invitation, verifies its configured HTTPS origin, accepts it once, exercises the returned session, revokes that session, and checks immediate access denial through the actual proxy. It verifies ownership before deleting only its own synthetic volumes. It never starts public Caddy/ACME, sends invitation email, connects provider accounts, or deploys to Hetzner. Do not run it as a substitute for actual domain/TLS/firewall, real provider/HAI, restore, load, or failover acceptance. Windows standalone packaging remains a separate supported runtime.
