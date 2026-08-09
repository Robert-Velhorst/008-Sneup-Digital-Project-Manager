# Final Verification Report

This report is updated from executed commands at release time. A passing local suite proves repository behavior under tests; it does not prove live provider authorization or production deployment.

## Baseline

- Branch: `main`
- Starting commit: `543bb6deb977469be716ceb4fe0cfc2af4cc1df2`
- Release under verification: `2.3.19`
- Default remote: `origin`

## Verification ledger

| Check | Result |
| --- | --- |
| Focused integrity/migration tests | Pass; dry-run, confirmation, permission, atomic-drift, audit, review-only, CLI, and all-workspace Trello-index migration boundaries covered |
| Focused retention tests | Pass: owner permissions, policy bounds, dry-run exclusions, exact confirmation, pre-delete audit failure, distributed worker lease, UI wiring, and rotation across bounded workspace batches |
| ESLint | Pass |
| Doctor | Pass with expected local warnings for absent MongoDB/Trello configuration; no errors; ngrok disabled locally |
| Full regression | Pass: 109 suites, 817 tests, including demand-loaded connector/workspace/approval rendering and action delegation, complete renderer and consequential form/modal localization, lazy-catalog safety, guarded callback presence, exact evidence preservation, per-asset fingerprint mutation, portfolio-scale bounded ranking, provider failure, API validation, and ledger-compatibility paths |
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
| Startup profile | Pass: current samples import 251 modules without Mongoose before Overview. Compared with 2.3.18, initial app-plus-localization is 21,649 raw, 3,876 gzip, and 3,008 Brotli bytes smaller; connector, workspace, and approval renderers stay deferred until opened. Absolute startup timings varied under concurrent machine load and are not presented as a controlled regression claim |
| Optional AI resource profile | Pass: loading offline chat did not load OpenAI; loading the deferred SDK afterward added 122 modules, 6.0 MB RSS, and 4.65 seconds in this cold local sample |
| Browser QA | Pass: in-app Browser verified the approval module is absent on Overview, loads once with the shared asset fingerprint, restores English/Dutch, preserves exact source evidence and payload JSON, filters Robert decisions, keeps workspace demo controls read-only, stays contained at calibrated 480px width, and emits zero current console warnings/errors. Focused DOM/source tests cover the final view-local catalog relocation |
| Windows UI automation | The installed Windows-control package did not expose its required guidance interface; no undocumented input was attempted and visual evidence is not inferred from HTTP or window metadata |
| Packaged Windows QA | Pass: repeatable verifier confirmed 2.3.19 product metadata, healthy demo state, eight redacted diagnostics, HAI `never_direct`, normal main-window close, and loopback port release |
| Packaged resource sample | Pass: four processes used 359.9 MB working set, 294.2 MB private memory, and 1.531 cumulative CPU seconds in the repeatable probe. This is directional local evidence rather than a production-scale budget. |
| Windows installer | Pass: local build 109,475,145 bytes, unsigned, SHA-256 `0C38644685A321F887C9B3FF1887EABBDED41723792D72882859AEBF0BC31CB8`; executable metadata reports 2.3.19 |
| Fresh clone | Pass: GitHub checked out exact source `e0a0cbbc17c33a47bdbd12adbfe3991d07ffce07`, installed the lockfile with Node.js 24, and completed quality plus Windows package jobs |
| GitHub CI | Pass: run `31321936184`; quality completed in 1 minute 10 seconds and Windows installer in 2 minutes 22 seconds; both jobs succeeded |
| GitHub installer artifact | Pass: artifact `9040446117`, `sneup-windows-installer-unsigned`, 109,472,305-byte archive, digest `sha256:eff8d19d6f47a6702bd628d806fe090ac937e5dea179923730e0576f78b5bc97`; its single downloaded installer is 109,466,331 bytes, unsigned, version 2.3.18, SHA-256 `4646153D37417799D93565801AFB637273E193861D592F951FFACB6143806B9C` |

## External gates

Live Trello critical-path acceptance, live ngrok/HAI credential acceptance, production database restore, hosted multi-instance lease observation, hosted canary/rollback, OAuth consent reviews, Windows publisher signing, and assistive-technology certification require owner-controlled accounts or infrastructure and are not reported as complete.
