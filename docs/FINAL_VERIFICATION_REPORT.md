# Final Verification Report

This report is updated from executed commands at release time. A passing local suite proves repository behavior under tests; it does not prove live provider authorization or production deployment.

## Baseline

- Branch: `main`
- Starting commit: `470d0a35ca712a3c12473a5c8cccb2118092d3ed`
- Release under verification: `2.3.3`
- Default remote: `origin`

## Verification ledger

| Check | Result |
| --- | --- |
| Focused migration/deletion/export tests | Pass: 3 suites/16 tests; disposable MongoDB detected and backfilled all 39 workspace collections |
| ESLint | Pass |
| Doctor | Pass with expected local warnings for absent MongoDB/Trello configuration; no errors; ngrok disabled locally |
| Full regression | Pass: 84 suites, 686 tests |
| Recommendation evaluation | Pass: 5/5 scenarios, score 100% |
| Production and full dependency audit | Pass: 0 vulnerabilities after lockfile remediation |
| Release security positive check | Pass: five purpose-separated production secrets, no values exposed |
| Secret-pattern/source search | Pass: no high-confidence credential, TODO/FIXME/HACK, dynamic-code, or child-process finding |
| Distributed job lease | Pass: disposable MongoDB 7 simultaneous race produced one winner; exact-token renew/release, clean reacquisition, expiry takeover, and private-field exclusion passed |
| Demo runtime smoke | Pass: `/` HTML, `/api` version 2.3.3 capabilities, `/health` OK; `/ready` HTTP 200, degraded demo, live critical path false; Job Health exposed protected/skipped counters |
| Production database outage | Pass: packaged live mode kept port 3197 closed and displayed a stable, non-secret Windows recovery dialog with explicit demo or close choices |
| HAI HTTP smoke | Pass: manifest `sneup-hai`, capabilities `snapshot,propose`, provider writes `never_direct`, structured demo snapshot with stable board/card identifiers |
| ngrok packaging/safety | Pass: official Windows x64 native binding bundled; missing, weak, or placeholder remote credentials fail closed |
| Browser QA | Prior release pass; the current in-app Browser webview still has no attach evidence, so rendered browser verification remains pending |
| Packaged Windows QA | Pass: 2.3.3 command-center window appeared, metadata/health/readiness/Job Health/HAI endpoints passed, and normal close released port 3197 |
| Packaged resource sample | Pass: four processes used 408.5 MB working set, 340.3 MB private bytes, and 6.30 cumulative CPU seconds after startup plus 30 seconds idle |
| Installer UI | Pass: Windows exposed `Sneup Setup` from the 2.3.3 installer; it closed normally without installing |
| Windows installer | Pass: `Sneup-Setup-2.3.3.exe`, 109,423,235 bytes, unsigned; executable metadata reports Sneup 2.3.3 and Noodzakelijk Online |
| Installer SHA-256 | `CA4B1EF0F34E1EB47BC5EDBE1BA5E77A2BE61070557A5F19D764094EE9D254B6` |
| Fresh clone | Pending: exact 2.3.3 Node.js 24 quality and Windows installer jobs after push |
| GitHub CI | Pending exact 2.3.3 run after push |

## External gates

Live Trello critical-path acceptance, live ngrok/HAI credential acceptance, production database restore, hosted multi-instance lease observation, hosted canary/rollback, OAuth consent reviews, Windows publisher signing, and assistive-technology certification require owner-controlled accounts or infrastructure and are not reported as complete.
