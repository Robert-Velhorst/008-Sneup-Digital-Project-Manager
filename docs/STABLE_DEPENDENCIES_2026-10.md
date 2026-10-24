# Stable dependency and runtime review - 2026-10-23

## 24 October follow-up

New public stable metadata advances Mongoose to 9.11.4, Natural to 8.2.3 and
electron-builder to 26.18.0. Electron 45.0.0 remains the current stable release.
The lock also selects current stable fast-uri 4.2.3 through an explicit override.
Its former 3.1.8 resolution has URI normalization advisories; patched 3.1.9 is
available, but the requested current stable target is 4.2.3.

This is a major override beyond AJV's declared major 3 dependency. Upstream
major 4 removes deprecated type declarations and fixes escaping; this project
has no direct TypeScript fast-uri imports. Existing application, recommendation,
schema, packaging and cloud checks must qualify the change. No assertion,
runtime floor, audit rule, fuse policy or desktop release gate is relaxed.
See the [upstream major release](https://github.com/fastify/fast-uri/releases/tag/v4.0.0).

The refreshed candidate lock audits with zero known vulnerabilities. No local
application suite, desktop execution, provider call or deployment was performed
for this follow-up. Earlier verification below belongs to its dated head and
does not qualify the new dependency graph. The embedded Node mismatch remains
an unresolved release blocker until actual packaged-runtime evidence meets the
established baseline; a newer installer builder does not itself fix that Node.

## Changes

All 25 direct/override declarations were checked against current stable npm metadata and pinned exactly. Existing declarations advance body-parser to 2.4.0, dotenv to 18.0.9, Mongoose to 9.11.3, Natural to 8.2.1, OpenAI SDK to 7.43.0, Electron to 45.0.0, qs to 6.16.1 and the scoped js-yaml override to 5.5.0. The explicit verifier dependency @electron/fuses 2.1.3 is added. Other declared versions already match current stable metadata. The real scoped js-yaml load API parsed the coverage-style YAML fixture correctly.

The server targets patched Node 26.12.1 and npm 12.2.1. Both image stages pin the official Node 26.12.1 Trixie slim digest, advancing the server OS to Debian 13 stable. Runtime OS packages are refreshed; build package managers are removed after dependency installation. CI action releases are pinned to verified commits, and both npm audit gates now reject moderate findings.

MongoDB stays on 9.0.4 with a pinned current official image digest. The Caddy 2.11.7 digest is refreshed. The optional private cloud verifier now validates the exact Caddy image rendered from Compose, with networking disabled and Compose's required capability, instead of a floating caddy:2 image. Operator volume names, provider approval and write-stop controls, secret requirements and workspace authorization remain in place. The Node-only draft #72 and its head are untouched; review overlap before merging either.

## Actual local verification

- Full check:ci passed: lint, route-authorization inventory with zero issues, 164 Jest suites / 1,690 tests and recommendation evaluation. A final lint plus four targeted suites / 29 tests passed after the verifier follow-up.
- Full npm audit: zero known vulnerabilities. All 25 manifest targets match current stable metadata. YAML and JSON parsing and git diff --check passed.
- The unsigned Windows installer compiled with Electron 45.0.0 and electron-builder 26.15.3. SHA-256: 1acc0f2c2ce1509017399804ac27ed4fd12bc2166213a5130e78e73ad2452e21; size 122,673,402 bytes. The archive contains the patched runtime policy and the updated five application libraries. Configured root environment/log/runtime-state paths were absent from the archive. The artifact is local, ignored by Git and not a published release.
- The actual packaged binary reports Electron 45.0.0, Chromium 156.0.8078.48 and Node 24.22.0. Its RunAsNode fuse was read before an isolated Node-only probe. No desktop GUI, installer, provider or operator database was started locally.

## Desktop release gate is blocked

Electron 45.0.0 is the current stable Electron release, but its actual embedded Node is below the established patched Node 24.22.1 / 26.12.1 baseline. The separate packaged-runtime gate correctly exits 1. A passing build or npm audit does not prove that bundled runtime meets this baseline. Electron-specific backport coverage has not been established; the version finding alone is not a claim of a particular exploitable CVE.

The verifier reads only the fixed build artifact, checks the RunAsNode fuse before execution, and launches only the isolated Node probe. It does not change fuses or launch the desktop when that probe is unavailable. Runtime diagnostics reject old Node versions and explain that installing Node separately does not replace the desktop's bundled runtime. No waiver or weaker floor was introduced. A vendor runtime satisfying the baseline, or separately reviewed security evidence, is still required before desktop release acceptance.

## Remaining verification and dependencies

The Debian Trixie backend image, private MongoDB/Caddy fixture, native backup/restore and final Windows GUI acceptance require hosted CI results on the published head. Local disk capacity was insufficient to safely add the MongoDB image plus another complete runtime build, so no local cloud-integration success is claimed. The Windows release job is expected to remain blocked by the verified embedded Node version even if functional checks pass.

Deprecated cron-parser 4.9.0 and glob 7/10 remain transitively under current direct upstream packages; this does not claim every transitive dependency is newest. A scheduler migration must preserve cancellation, async error observation, drain and recurrence/DST behavior. These transitive migrations remain portfolio work. Mongoose validateSync and Jest VM-module warnings were observed. Real provider acceptance, live Hetzner deployment, actual operator data migration/restore, TLS and signing remain unverified.

## Primary sources

- https://releases.electronjs.org/release/v45.0.0
- https://www.debian.org/releases/stable/
- https://registry.npmjs.org/electron/latest
- https://registry.npmjs.org/%40electron%2Ffuses/latest
- https://registry.npmjs.org/mongoose/latest
- https://registry.npmjs.org/openai/latest
- https://hub.docker.com/_/mongo
