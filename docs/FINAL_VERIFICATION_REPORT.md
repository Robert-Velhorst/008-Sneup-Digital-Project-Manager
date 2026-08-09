# Final Verification Report

This report is updated from executed commands at release time. A passing local suite proves repository behavior under tests; it does not prove live provider authorization or production deployment.

## Baseline

- Branch: `main`
- Starting commit: `470d0a35ca712a3c12473a5c8cccb2118092d3ed`
- Release under verification: `2.3.4`
- Default remote: `origin`

## Verification ledger

| Check | Result |
| --- | --- |
| Focused migration/deletion/export tests | Pass: 3 suites/16 tests; disposable MongoDB detected and backfilled all 39 workspace collections |
| ESLint | Pass |
| Doctor | Pass with expected local warnings for absent MongoDB/Trello configuration; no errors; ngrok disabled locally |
| Full regression | Pass: 85 suites, 692 tests |
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
| API performance sample | Pass: 400 legacy and 400 versioned metadata requests averaged 1.453/1.588 ms with 2.665/2.841 ms p95 |
| Browser QA | The requested in-app Browser connected on two fresh tabs but its webview did not attach; rendered evidence remains pending |
| Windows UI automation | Computer Use discovered the exact `Sneup Command Center` window, but the installed automation runtime failed while returning window state; visual evidence is not inferred from HTTP or window metadata |
| Packaged Windows QA | Pass: 2.3.4 opened the command-center window, served legacy/versioned/readiness/jobs/HAI checks, correlated request IDs, closed normally, and released port 3197 |
| Packaged idle sample | Pass: four processes used 385.6 MB working set, 307.7 MB private memory, and 3.53 cumulative CPU seconds after load plus idle |
| Installer UI | Pass: exact 2.3.4 `Sneup Setup` window opened and was closed without installing |
| Windows installer | Pass: local build 109,424,462 bytes, unsigned, SHA-256 `6FDB70E399DBD1AEB2A6B669BA370496EAA42478364D50D0056C8B505953B54B`; executable metadata reports 2.3.4 |
| Fresh clone | Pass: exact 2.3.4 source commit completed clean Node.js 24 quality and Windows installer jobs |
| GitHub CI | Pass: run `31298559390`, source `47e6d5d25078590133a066990bc602a40f4ec457`, zero annotations; quality 1m01s, Windows artifact 2m18s |
| GitHub installer artifact | Pass: artifact `9033774213` (`sneup-windows-installer-unsigned`), archive digest `sha256:ee4a4bf8f66b1e975b63fafb67ff22c3563f26f8f64e2e93fe845248f41ca52c`; downloaded installer 109,424,851 bytes, unsigned, SHA-256 `CFC6ADD1B21DDFE5A2B09CDC51DEBC776A7302E07950077A2E337C7465FEE46F` |

## External gates

Live Trello critical-path acceptance, live ngrok/HAI credential acceptance, production database restore, hosted multi-instance lease observation, hosted canary/rollback, OAuth consent reviews, Windows publisher signing, and assistive-technology certification require owner-controlled accounts or infrastructure and are not reported as complete.
