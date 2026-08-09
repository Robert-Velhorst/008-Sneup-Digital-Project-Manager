# Final Verification Report

This report is updated from executed commands at release time. A passing local suite proves repository behavior under tests; it does not prove live provider authorization or production deployment.

## Baseline

- Branch: `main`
- Starting commit: `b2e98d16d08e267342e56ede90425eb83fd0d7b1`
- Release under verification: `2.3.15`
- Default remote: `origin`

## Verification ledger

| Check | Result |
| --- | --- |
| Focused integrity/migration tests | Pass; dry-run, confirmation, permission, atomic-drift, audit, review-only, CLI, and all-workspace Trello-index migration boundaries covered |
| Focused retention tests | Pass: owner permissions, policy bounds, dry-run exclusions, exact confirmation, pre-delete audit failure, distributed worker lease, UI wiring, and rotation across bounded workspace batches |
| ESLint | Pass |
| Doctor | Pass with expected local warnings for absent MongoDB/Trello configuration; no errors; ngrok disabled locally |
| Full regression | Pass: 104 suites, 793 tests, including portfolio-scale bounded ranking, workspace-scoped form storage, contextual help/search/focus/routing, browser bootstrap, provider failure, provenance, API validation, lazy-load, and ledger-compatibility paths |
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
| Startup profile | Pass: current demo sample imported 251 modules in 372.7 ms at 71.1 MB RSS, served health plus the complete initial overview in 126.3 ms at 76.0 MB RSS, and never loaded MongoDB; hidden help DOM is deferred until first open |
| Optional AI resource profile | Pass: loading offline chat did not load OpenAI; loading the deferred SDK afterward added 122 modules, 6.0 MB RSS, and 4.65 seconds in this cold local sample |
| Browser QA | Pass: prior live disposable-workspace draft/preset coverage remains green; the 2.3.14 in-app Browser also verified contextual Forecasts help, local search, Decision Safety, Approvals handoff, focus placement, desktop and narrow viewport containment, and zero current console errors |
| Windows UI automation | The installed Windows-control package did not expose its required guidance interface; no undocumented input was attempted and visual evidence is not inferred from HTTP or window metadata |
| Packaged Windows QA | Pass: repeatable verifier confirmed 2.3.15 product metadata, healthy demo state, eight redacted diagnostics, HAI `never_direct`, normal main-window close, and loopback port release |
| Packaged idle sample | Pass: the four-process build settled to 358.8 MB working set, 287.4 MB private memory, and 2.391 cumulative CPU seconds after 30 seconds. This is a directional local sample rather than a production-scale benchmark. |
| Windows installer | Pass: local build 109,454,208 bytes, unsigned, SHA-256 `EDDC7030114E5D424398ACA79BB8683A6DE08B919F9AC7BD7955F9AF81068FD6`; executable metadata reports 2.3.15 |
| Fresh clone | Pending for the 2.3.15 source commit; prior 2.3.14 fresh-clone evidence remains recorded in repository history |
| GitHub CI | Pending for the pushed 2.3.15 source commit |
| GitHub installer artifact | Pending for the 2.3.15 CI artifact |

## External gates

Live Trello critical-path acceptance, live ngrok/HAI credential acceptance, production database restore, hosted multi-instance lease observation, hosted canary/rollback, OAuth consent reviews, Windows publisher signing, and assistive-technology certification require owner-controlled accounts or infrastructure and are not reported as complete.
