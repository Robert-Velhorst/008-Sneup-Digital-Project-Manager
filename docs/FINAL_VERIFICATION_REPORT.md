# Final Verification Report

This report is updated from executed commands at release time. A passing local suite proves repository behavior under tests; it does not prove live provider authorization or production deployment.

## Baseline

- Branch: `main`
- Starting commit: `470d0a35ca712a3c12473a5c8cccb2118092d3ed`
- Release under verification: `2.3.0`
- Default remote: `origin`

## Verification ledger

| Check | Result |
| --- | --- |
| Focused deletion/export/desktop/provider-write/security tests | Pass; disposable MongoDB verified all 39 workspace collections |
| ESLint | Pass |
| Doctor | Pass with expected local warnings for absent MongoDB/Trello configuration; no errors; ngrok disabled locally |
| Full regression | Pass: 81 suites, 668 tests |
| Recommendation evaluation | Pass: 5/5 scenarios, score 100% |
| Production and full dependency audit | Pass: 0 vulnerabilities after lockfile remediation |
| Release security positive check | Pass: five purpose-separated production secrets, no values exposed |
| Secret-pattern/source search | Pass: no high-confidence credential, TODO/FIXME/HACK, dynamic-code, or child-process finding |
| Demo runtime smoke | Pass: `/` HTML, `/api` version 2.3.0 capabilities, `/health` OK; `/ready` HTTP 200, degraded demo, live critical path false |
| HAI HTTP smoke | Pass: manifest `sneup-hai`, capabilities `snapshot,propose`, provider writes `never_direct`, structured demo snapshot |
| ngrok packaging/safety | Pass: official Windows x64 native binding bundled; missing, weak, or placeholder remote credentials fail closed |
| Browser QA | Prior release pass; the 2.3.0 in-app Browser webview again failed to attach, so current rendered browser evidence is pending |
| Packaged Windows QA | Pass: 2.3.0 command-center window stayed open, metadata/health/HAI endpoints passed, and normal close released port 3197; four processes used about 408 MB working set after 30 seconds idle |
| Packaged resource sample | Pass: 408 MB working set, 336.2 MB private bytes, and 5.16 cumulative CPU seconds after startup plus 30 seconds idle; prior comparable CPU sample was 14.87 seconds |
| Installer UI | Pass: Windows exposed `Sneup Setup` from the 2.3.0 installer; it closed normally without installing |
| Windows installer | Pass: `Sneup-Setup-2.3.0.exe`, 109,421,276 bytes, unsigned; executable metadata reports Sneup 2.3.0 and Noodzakelijk Online |
| Installer SHA-256 | `360D1045322C8BCC673B36842D61CB56A381A501FA52766C9D3039963810FEF8` |
| Fresh clone | Pass: 2.3.0 Linux quality and Windows installer jobs ran from a clean checkout |
| GitHub CI | Pass: run `31293249661`; Node 24 action runtimes, quality in 1m03s, and Windows installer plus artifact upload in 2m15s |

## External gates

Live Trello critical-path acceptance, live ngrok/HAI credential acceptance, production database restore, hosted canary/rollback, OAuth consent reviews, Windows publisher signing, and assistive-technology certification require owner-controlled accounts or infrastructure and are not reported as complete.
