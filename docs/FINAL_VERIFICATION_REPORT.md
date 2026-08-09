# Final Verification Report

This report is updated from executed commands at release time. A passing local suite proves repository behavior under tests; it does not prove live provider authorization or production deployment.

## Baseline

- Branch: `main`
- Starting commit: `22a7cb958ff83acc75594a22e28070caaa2d1a2a`
- Release under verification: `2.3.12`
- Default remote: `origin`

## Verification ledger

| Check | Result |
| --- | --- |
| Focused integrity/migration tests | Pass; dry-run, confirmation, permission, atomic-drift, audit, review-only, CLI, and all-workspace Trello-index migration boundaries covered |
| Focused retention tests | Pass: owner permissions, policy bounds, dry-run exclusions, exact confirmation, pre-delete audit failure, distributed worker lease, UI wiring, and rotation across bounded workspace batches |
| ESLint | Pass |
| Doctor | Pass with expected local warnings for absent MongoDB/Trello configuration; no errors; ngrok disabled locally |
| Full regression | Pass: 101 suites, 765 tests, including missing-provider, initialization, authentication, rate-limit, timeout, outage, malformed-output, oversized-output, provenance, API validation, lazy-load, and ledger-compatibility paths |
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
| Startup profile | Pass: repeatable demo profile imported 251 modules in 422.0 ms at 70.6 MB RSS, served health plus the complete initial overview in 112.3 ms at 75.4 MB RSS, and never loaded MongoDB |
| Optional AI resource profile | Pass: loading offline chat did not load OpenAI; loading the deferred SDK afterward added 122 modules, 6.0 MB RSS, and 4.65 seconds in this cold local sample |
| Browser QA | Pass: the in-app Browser opened and refreshed the live 2.3.12 overview, approvals ledger, and 117-card connector marketplace with no visible failure notice, horizontal overflow, console warning, or console error |
| Windows UI automation | The installed Windows-control package did not expose its required guidance interface; no undocumented input was attempted and visual evidence is not inferred from HTTP or window metadata |
| Packaged Windows QA | Pass: repeatable verifier confirmed 2.3.12 product metadata, healthy demo state, eight redacted diagnostics, HAI `never_direct`, normal main-window close, and loopback port release |
| Packaged idle sample | Pass: the four-process build settled to 357.6 MB working set, 290.0 MB private memory, and 1.438 cumulative CPU seconds after 30 seconds. Against 2.3.11 this local sample is 0.4% higher working set, 0.6% lower private memory, and 29.8% lower cumulative CPU. This is a local sample rather than a production-scale benchmark. |
| Windows installer | Pass: local build 109,445,733 bytes, unsigned, SHA-256 `4633D51C277CBF462163A915694D2BC1B1D82A8E2F2D242335A032E1D13D0C60`; executable metadata reports 2.3.12 |
| Fresh clone | Pending for the 2.3.12 source commit; prior 2.3.11 GitHub verification remains green |
| GitHub CI | Pending for the 2.3.12 source commit |
| GitHub installer artifact | Pending for the 2.3.12 source commit |

## External gates

Live Trello critical-path acceptance, live ngrok/HAI credential acceptance, production database restore, hosted multi-instance lease observation, hosted canary/rollback, OAuth consent reviews, Windows publisher signing, and assistive-technology certification require owner-controlled accounts or infrastructure and are not reported as complete.
