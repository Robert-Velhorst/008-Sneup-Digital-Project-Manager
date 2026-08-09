# Final Verification Report

This report is updated from executed commands at release time. A passing local suite proves repository behavior under tests; it does not prove live provider authorization or production deployment.

## Baseline

- Branch: `main`
- Starting commit: `70d792c8ae68528269f0d8d2320c45ca83535512`
- Release under verification: `2.3.9`
- Default remote: `origin`

## Verification ledger

| Check | Result |
| --- | --- |
| Focused integrity/migration tests | Pass; dry-run, confirmation, permission, atomic-drift, audit, review-only, CLI, and all-workspace Trello-index migration boundaries covered |
| Focused retention tests | Pass: owner permissions, policy bounds, dry-run exclusions, exact confirmation, pre-delete audit failure, distributed worker lease, UI wiring, and rotation across bounded workspace batches |
| ESLint | Pass |
| Doctor | Pass with expected local warnings for absent MongoDB/Trello configuration; no errors; ngrok disabled locally |
| Full regression | Pass: 94 suites, 738 tests |
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
| Browser QA | Pass: after the in-app Browser webview did not attach, connected Chrome previewed two due retention categories, confirmed the exact workspace, pruned 2/2 disposable records, rescanned to zero, and reported no console warnings/errors, overflow, or mobile modal overlap |
| Windows UI automation | The installed Windows-control package did not expose its required guidance interface; no undocumented input was attempted and visual evidence is not inferred from HTTP or window metadata |
| Packaged Windows QA | Pass: 2.3.9 served healthy versioned metadata, retained HAI `never_direct`, returned the Trello connector query, closed through its main window, and released port 3209 |
| Packaged idle sample | Pass: the four-process build settled to 370.9 MB working set, 323.0 MB private memory, and 3.156 cumulative CPU seconds after 30 seconds. This is a local sample rather than a production-scale benchmark. |
| Windows installer | Pass: local build 109,440,956 bytes, unsigned, SHA-256 `F011C6F19BEA4C8489FBADA0B70E25CBFD402390730FDE0871799FBF7BE19EFB`; executable metadata reports 2.3.9, the 65,856,376-byte archive includes the canonical Trello dependency path, and the installer opened and cancelled normally |
| Fresh clone | Pass: GitHub checked out exact source `8a430c30ecfb1cd5cda729a5fb0689d508b8e1df`, installed the lockfile with Node.js 24, and completed quality plus Windows package jobs |
| GitHub CI | Pass: run `31308308438`; quality in 49 seconds and Windows installer in 2 minutes 17 seconds; both checks succeeded with zero annotations |
| GitHub installer artifact | Pass: artifact `9036645854`, `sneup-windows-installer-unsigned`, 109,446,471-byte archive, digest `sha256:f7e5b0c33ae74fc530deb824ccc321eea2702daf6157cf95a59ba10985fdcf9c`; its single downloaded installer is 109,440,523 bytes, unsigned, version 2.3.9, SHA-256 `50BFA7B5D711E1FD4BBC3A363BDF1BF9CFFBC6D52697AC013A995A9902D8208E` |

## External gates

Live Trello critical-path acceptance, live ngrok/HAI credential acceptance, production database restore, hosted multi-instance lease observation, hosted canary/rollback, OAuth consent reviews, Windows publisher signing, and assistive-technology certification require owner-controlled accounts or infrastructure and are not reported as complete.
