# Final Verification Report

This report is updated from executed commands at release time. A passing local suite proves repository behavior under tests; it does not prove live provider authorization or production deployment.

## Baseline

- Branch: `main`
- Starting commit: `470d0a35ca712a3c12473a5c8cccb2118092d3ed`
- Release under verification: `2.3.5`
- Default remote: `origin`

## Verification ledger

| Check | Result |
| --- | --- |
| Focused rollout/migration/deletion/export tests | Pass; disposable MongoDB detected and backfilled all 40 workspace collections and created the feature-flag workspace/key index |
| ESLint | Pass |
| Doctor | Pass with expected local warnings for absent MongoDB/Trello configuration; no errors; ngrok disabled locally |
| Full regression | Pass: 86 suites, 704 tests |
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
| Rollout API performance sample | Pass: 80 versioned rollout requests averaged 4.016 ms with 5.804 ms p95; an attempted 800-request burst was correctly rate-limited at HTTP 429 |
| Browser QA | The requested in-app Browser connected on two fresh tabs but its webview did not attach; rendered evidence remains pending |
| Windows UI automation | The installed Windows-control package did not expose its required guidance interface; no undocumented input was attempted and visual evidence is not inferred from HTTP or window metadata |
| Packaged Windows QA | Pass: 2.3.5 opened `Sneup Command Center`, served readiness/version/rollout/HAI checks, closed normally, and released port 3197 |
| Packaged idle sample | Pass: four processes settled to 396.0 MB working set, 304.8 MB private memory, and 2.83 cumulative CPU seconds after load plus 30 seconds idle |
| Installer UI | Pass: exact 2.3.5 `Sneup Setup` window opened and was closed without installing |
| Windows installer | Pass: local build 109,429,244 bytes, unsigned, SHA-256 `A158F9FB1AF01F9506670139E817901B3AAA0B2B3C68DCB250340E1665927383`; executable metadata reports 2.3.5 |
| Fresh clone | Pass: exact 2.3.5 source commit completed clean Node.js 24 quality and Windows installer jobs |
| GitHub CI | Pass: run `31300449925`, source `2ae4f982020f1b1cdfa840bf29ee28e281edae1e`, zero annotations; quality 1m08s, Windows artifact 2m20s |
| GitHub installer artifact | Pass: artifact `9034341974` (`sneup-windows-installer-unsigned`), archive digest `sha256:cd8ac5757c553d2714e4b03085405a5927f6d1b8913b92b5691e213633bc91c9`; downloaded installer 109,429,289 bytes, unsigned, SHA-256 `6731019A65C3587E4360D799D66F59D1336DC56740356050782B974A3EAEF8F3` |

## External gates

Live Trello critical-path acceptance, live ngrok/HAI credential acceptance, production database restore, hosted multi-instance lease observation, hosted canary/rollback, OAuth consent reviews, Windows publisher signing, and assistive-technology certification require owner-controlled accounts or infrastructure and are not reported as complete.
