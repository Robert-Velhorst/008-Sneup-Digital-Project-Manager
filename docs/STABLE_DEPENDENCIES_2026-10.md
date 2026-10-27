# Stable dependency and runtime review - 2026-10-23

## Current combined review candidate — 27 October 2026

This integration retains both security and dependency/SDK draft histories. Nine
conflicts were resolved while preserving all 178 security-head test payloads
(including the 165 original files), all 64 vendor payloads and all 34 existing
scripts. Subsequent registry hardening changes one already ported production
file and regenerates its private package/provenance; the original vendor cases
and helpers remain byte-identical. Connector authority/redirect boundaries, scalar service and route
filters, Autopilot target validation and original SDK workflows remain present.
The original cloud-case script is unchanged; an independent hosted check validates
the current pinned proxy image. npm and Yarn remain in the runtime image and
remain visible to complete vulnerability scans.

The exact normally generated worker manifest/lock is adopted: Axios 1.21.0,
Natural 8.2.6, OpenAI 7.45.1 and Electron Builder 26.18.1 advance to the observed
public stable targets. That worker resolved/installed normally and its full
unfiltered dependency audit reported zero vulnerabilities. This does not qualify
the whole graph or current source. Gensync beta and Postject alpha remain in the
SDK through current Babel and Windows-signing parent requirements; no prerelease
allowance, downgrade, override or waiver has been applied.

A subsequent ordinary update also produced a zero-finding audit, but selected
older Emnapi versions during deduplication. That graph was not adopted. The SDK
host now explicitly declares current stable Emnapi core/runtime peers within
`@napi-rs/wasm-runtime`'s documented stable peer range. The fresh normal update
now resolves and installs successfully, with zero lower component versions and a
zero-finding full audit. Its exact generated lock is adopted; the two inherited
prerelease rows still fail the stable-only gate. Complete SDK/runtime/source and
application qualification is required at the newly committed head. Every source/case payload and public
catalog is retained by the hosted evidence job; both prerelease and lower-version
graph gates remain strict. No local installation or application/SDK execution
is used for this work.

The scheduler port already uses public Node Schedule 2.1.2, commit
`6d5ad4b31dc5fc530a810489f482dd59cabc9803`. Fresh publisher Git/archive checks
reconcile all 35 source payloads, the unchanged 32 nonported payloads and all
12 original case/helper/fixture payloads. This establishes its current upstream
base, while the private modifications and complete SDK acceptance remain separate.

The combined application, source/image, original SDK and Windows runtime gates
remain unqualified. Known failures include old runtime diagnostic fixtures, a
configuration-parser case under the application runner, and Electron 45's
embedded Node 24.22.0 below the required release floor. No original case,
assertion, fixture, helper, timeout or case selector was changed to clear a gate.
No main merge, manual deployment, live database/data change, billing or permission
change occurred.

## Scheduler registry hardening

The private scheduler registry now defines each job name as an own enumerable,
writable and configurable data property. It keeps the ordinary-object API and
all string job names while avoiding inherited setters such as `__proto__`.
The owned hosted packaging job rebuilt the package from bound source, refreshed
its local-file lock through the normal installer, verified all 36 installed
package payloads and passed 18 independent public registration/rescheduling/
cancellation cases with no skips. Its complete dependency audit reported zero
known vulnerabilities. All 12 original vendor case/helper/fixture payloads and
all 178 existing root test files remain unchanged.

The exact generated private tar, provenance and integrity-only lock change are
adopted for fresh current-head qualification. This is a private source patch,
not a new upstream release. Complete original SDK, source/image, packaged-runtime
and live acceptance gates remain separate and unqualified. No original test,
helper, assertion, fixture, selector or timeout is changed to clear those gates.

## Historical evidence before the combined candidate

The sections below retain dated investigation results and older configurations.
They do not qualify this combined source or supersede the current state above.

## 25 October ordinary-resolution correction

The current candidate removes every dependency override and uses ordinary npm resolution. All22 direct dependency declarations were checked against official stable latest registry tags; node-schedule advances from2.1.1 to2.1.2. No override or prerelease was added. The older override-based evidence below is historical and does not establish acceptance of this graph.

A disposable GitHub-hosted worker retained all application sources, original cases, helpers and gates from the prior frozen draft. Its candidate passed lint, route authorization,1680 tests with10 existing skips, recommendation evaluation, and both production/all-dependency moderate-severity audits. Its full graph gate failed: of822 resolutions,227 were already confirmed different from stable latest tags,2 were prereleases, and227 resolution paths (189 unique package names) still lacked registry data because of HTTP429 responses. These counts can overlap; none is waived. The serialized metadata follow-up and current PR checks must be assessed separately.

Electron45.0.0 still requires actual packaged-runtime qualification; the earlier binary reported embedded Node24.22.0 below the established baseline. No runtime floor, original test or release gate was changed. This source/lock correction does not deploy or migrate operator data. Full transitive/SDK/vendor and live acceptance remain open.


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
