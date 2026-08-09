# Final Verification Report

This report is updated from executed commands at release time. A passing local suite proves repository behavior under tests; it does not prove live provider authorization or production deployment.

## Baseline

- Branch: `main`
- Starting commit: `95fb6440757918d40a817ac5362147b0b2eb1c8f`
- Release under verification: `2.3.16`
- Default remote: `origin`

## Verification ledger

| Check | Result |
| --- | --- |
| Focused integrity/migration tests | Pass; dry-run, confirmation, permission, atomic-drift, audit, review-only, CLI, and all-workspace Trello-index migration boundaries covered |
| Focused retention tests | Pass: owner permissions, policy bounds, dry-run exclusions, exact confirmation, pre-delete audit failure, distributed worker lease, UI wiring, and rotation across bounded workspace batches |
| ESLint | Pass |
| Doctor | Pass with expected local warnings for absent MongoDB/Trello configuration; no errors; ngrok disabled locally |
| Full regression | Pass: 105 suites, 799 tests, including English/Dutch static-shell and help-catalog completeness, accessibility-label restoration, evidence preservation, portfolio-scale bounded ranking, provider failure, provenance, API validation, lazy-load, and ledger-compatibility paths |
| Recommendation evaluation | Pass: 5/5 scenarios, score 100% |
| Production and full dependency audit | Pass: 0 vulnerabilities after lockfile remediation |
| Release security positive check | Pass: five purpose-separated production secrets, no values exposed |
| Secret-pattern/source search | Pass: no high-confidence credential, TODO/FIXME/HACK, dynamic-code, or child-process finding |
| Distributed job lease | Pass: disposable MongoDB 7 simultaneous race produced one winner; exact-token renew/release, clean reacquisition, expiry takeover, and private-field exclusion passed |
| API contract | Pass: strict `/api/v1` success/error envelopes, correlated request IDs, legacy compatibility, raw HAI OpenAPI, streamed-response compatibility, and static-asset request-ID exclusion |
| Demo runtime smoke | Pass: 12-route HTTP matrix covered HTML, legacy/versioned metadata, security, mission control, jobs, operations ledger, connector catalog, HAI manifest/OpenAPI/snapshot, and a versioned 404 |
| Production database outage | Pass: packaged live mode kept port 3197 closed and displayed a stable, non-secret Windows recovery dialog with explicit demo or close choices |
| HAI HTTP smoke | Pass: versioned manifest/OpenAPI paths, capabilities `snapshot,propose`, provider writes `never_direct`, structured demo snapshot with stable board/card identifiers |
| ngrok packaging/safety | Pass: official Windows x64 native binding bundled; missing, weak, or placeholder remote credentials fail closed |
| Real MongoDB integrity repair | Pass: 40 collections migrated; two safe derived-state findings repaired with two audits; ambiguous Trello attempt remained review-only; provider writes false |
| Real MongoDB data retention | Pass: six eligible categories deleted, six protected records retained, six pre/post audit pairs stored, seven query indexes verified, provider writes false |
| Retention performance sample | Pass: six-category preview 35.09 ms, six audited category batches 936.39 ms, verifier RSS 94.1 MB; seven supporting indexes verified |
| Integrity API performance sample | Pass: 30 live requests measured 14.01 ms p50 and 23.71 ms p95; server working set 119.5 MB after browser QA |
| Portfolio-scale profile | Pass: real mission control read 60 boards/300 lists/15,000 cards/100 members/60 analytics records; 1,264.9 ms cold, 613.0-1,111.0 ms repeated, 353.5 MB peak verifier RSS, exact compound card index selected, 10/12/12 outputs bounded, approval required, provider writes false |
| Bounded-ranking resource sample | Pass: worst-case 15,000-card focus improved 42.8 to 16.2 ms, risks 50.5 to 19.9 ms, commands 90.3 to 43.2 ms, and command peak RSS about 165 to 106 MB while preserving stable rank/evidence behavior |
| Startup profile | Pass: current demo sample imported 251 modules in 226.5 ms at 70.8 MB RSS, served health plus the complete initial overview in 65.9 ms at 74.3 MB RSS, and never loaded MongoDB; localization adds no server module and hidden help DOM remains deferred until first open |
| Optional AI resource profile | Pass: loading offline chat did not load OpenAI; loading the deferred SDK afterward added 122 modules, 6.0 MB RSS, and 4.65 seconds in this cold local sample |
| Browser QA | Pass: in-app Browser verified English/Dutch restoration, translated static shell, help search/topic/action routing, setup diagnostics, accessible language labels, desktop and compact viewport containment, intentional verbatim provider evidence, and zero current console warnings/errors |
| Windows UI automation | The installed Windows-control package did not expose its required guidance interface; no undocumented input was attempted and visual evidence is not inferred from HTTP or window metadata |
| Packaged Windows QA | Pass: repeatable verifier confirmed 2.3.16 product metadata, healthy demo state, eight redacted diagnostics, HAI `never_direct`, normal main-window close, and loopback port release |
| Packaged idle sample | Pass: the four-process build settled to 360.6 MB working set, 292.6 MB private memory, and 1.859 cumulative CPU seconds after 30 seconds. This is a directional local sample rather than a production-scale benchmark. |
| Windows installer | Pass: local build 109,462,200 bytes, unsigned, SHA-256 `33F959504DAE00AE5F8ED4D5DAB5FC2CA21FDA3B7CAB40BAF1554DE49E6587E5`; executable metadata reports 2.3.16 |
| Fresh clone | Pass: GitHub checked out exact source `49af27f6fab19c2bf4e9da6f4da50fd49fbf7044`, installed the lockfile with Node.js 24, and completed quality plus Windows package jobs |
| GitHub CI | Pass: run `31318682009`; quality completed in 1 minute 1 second and Windows installer in 2 minutes 36 seconds; both jobs succeeded |
| GitHub installer artifact | Pass: artifact `9039544372`, `sneup-windows-installer-unsigned`, 109,468,258-byte archive, digest `sha256:27d1e1214d8272ad6257d9b757a1f43702c0c4372d4a1803546c8c76713f4eb3`; its single downloaded installer is 109,462,310 bytes, unsigned, version 2.3.16, SHA-256 `7719761E182506337CAA71737C6312479B94552CEF65DA128F892C8EA48943C9` |

## External gates

Live Trello critical-path acceptance, live ngrok/HAI credential acceptance, production database restore, hosted multi-instance lease observation, hosted canary/rollback, OAuth consent reviews, Windows publisher signing, and assistive-technology certification require owner-controlled accounts or infrastructure and are not reported as complete.
