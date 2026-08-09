# Final Verification Report

This report is updated from executed commands at release time. A passing local suite proves repository behavior under tests; it does not prove live provider authorization or production deployment.

## Baseline

- Branch: `main`
- Starting commit: `de76a7decbe3a713a8b590419ac9544950bd826d`
- Release under verification: `2.3.6`
- Default remote: `origin`

## Verification ledger

| Check | Result |
| --- | --- |
| Focused integrity/migration tests | Pass; dry-run, confirmation, permission, atomic-drift, audit, review-only, CLI, and all-workspace Trello-index migration boundaries covered |
| ESLint | Pass |
| Doctor | Pass with expected local warnings for absent MongoDB/Trello configuration; no errors; ngrok disabled locally |
| Full regression | Pass: 88 suites, 711 tests |
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
| Integrity API performance sample | Pass: 30 live requests measured 14.01 ms p50 and 23.71 ms p95; server working set 119.5 MB after browser QA |
| Browser QA | Pass via local Playwright fallback after the in-app Browser webview failed twice: 1440x1000 and 390x844, zero console warnings/errors, two faults scanned, confirmation opened, 2/2 repaired, zero-finding rescan |
| Windows UI automation | The installed Windows-control package did not expose its required guidance interface; no undocumented input was attempted and visual evidence is not inferred from HTTP or window metadata |
| Packaged Windows QA | Pass: 2.3.6 served readiness/version/integrity/HAI checks, retained `never_direct`, closed normally, and released port 3198; unavailable live MongoDB kept the port closed |
| Packaged idle sample | Pass: four processes settled from 405.6/366.2 MB to 399.5/359.5 MB working/private memory over 30 seconds; CPU advanced 1.54 seconds |
| Windows installer | Pass: local build 109,433,640 bytes, unsigned, SHA-256 `D703178EE0E7A6AC1E853997FF3052EFE11082E550F95B673B05041043244948`; executable metadata reports 2.3.6 and archive contains integrity UI/API plus Windows x64 ngrok binding |
| Fresh clone | Pass: source commit `2e1f767b287ff572962d583b19f74b676a84718d` completed GitHub run `31302533822` from clean runners |
| GitHub CI | Pass with zero failures/annotations: Node.js 24 quality in 1m12s and Windows installer in 2m17s |
| GitHub installer artifact | Pass: artifact `9034945692` (`sneup-windows-installer-unsigned`), archive digest `sha256:dcf6f2d80ef6ced46bcc097d11cda4dd2fe5ead71331cd9c46657fe89866ccad`; downloaded executable 109,433,841 bytes, unsigned, version 2.3.6, SHA-256 `6863CE73CB0DD66E024E6C2C2ECF1E028556251E9156354069F3E0A5B96F8AD7` |

## External gates

Live Trello critical-path acceptance, live ngrok/HAI credential acceptance, production database restore, hosted multi-instance lease observation, hosted canary/rollback, OAuth consent reviews, Windows publisher signing, and assistive-technology certification require owner-controlled accounts or infrastructure and are not reported as complete.
