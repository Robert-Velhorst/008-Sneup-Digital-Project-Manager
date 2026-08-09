# Final Verification Report

This report is updated from executed commands at release time. A passing local suite proves repository behavior under tests; it does not prove live provider authorization or production deployment.

## Baseline

- Branch: `main`
- Starting commit: `470d0a35ca712a3c12473a5c8cccb2118092d3ed`
- Release under verification: `2.2.0`
- Default remote: `origin`

## Verification ledger

| Check | Result |
| --- | --- |
| Focused export/desktop/provider-write/security tests | Pass |
| ESLint | Pass |
| Doctor | Pass with expected local warnings for absent MongoDB/Trello configuration; no errors; ngrok disabled locally |
| Full regression | Pass: 78 suites, 656 tests |
| Recommendation evaluation | Pass: 5/5 scenarios, score 100% |
| Production and full dependency audit | Pass: 0 vulnerabilities after lockfile remediation |
| Release security positive check | Pass: five purpose-separated production secrets, no values exposed |
| Secret-pattern/source search | Pass: no high-confidence credential, TODO/FIXME/HACK, dynamic-code, or child-process finding |
| Demo runtime smoke | Pass: `/health` OK; `/ready` HTTP 200, degraded demo, live critical path false |
| HAI HTTP smoke | Pass: manifest `sneup-hai`, capabilities `snapshot,propose`, provider writes `never_direct`, structured demo snapshot |
| ngrok packaging/safety | Pass: official Windows x64 native binding bundled; missing, weak, or placeholder remote credentials fail closed |
| Browser QA | Prior release pass; the 2.2.0 in-app Browser webview failed to attach twice, so current rendered browser evidence is pending |
| Packaged Windows QA | Pass: 2.2.0 command-center window stayed open, `/health` returned OK in explicit demo mode, normal close released port 3197; four processes used about 410 MB working set after 30 seconds idle |
| Installer UI | Prior 2.1.0 installer UI pass; 2.2.0 metadata verified, current installer-dialog walkthrough pending |
| Windows installer | Pass: `Sneup-Setup-2.2.0.exe`, 109,418,326 bytes, unsigned; executable metadata reports Sneup 2.2.0 and Noodzakelijk Online |
| Installer SHA-256 | `229F9D81398CB3906EC8B5A37EFA17366F2A6920DAA12C5EADDCA1A45F615892` |
| Fresh clone | Prior release pass at `6a02fac`; current 2.2.0 clean-checkout CI is pending push |
| GitHub CI | Prior release pass: run `31289205822`; current 2.2.0 push pending |

## External gates

Live Trello critical-path acceptance, live ngrok/HAI credential acceptance, production database restore, hosted canary/rollback, OAuth consent reviews, Windows publisher signing, and assistive-technology certification require owner-controlled accounts or infrastructure and are not reported as complete.
