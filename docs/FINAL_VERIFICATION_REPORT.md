# Final Verification Report

This report is updated from executed commands at release time. A passing local suite proves repository behavior under tests; it does not prove live provider authorization or production deployment.

## Baseline

- Branch: `main`
- Starting commit: `a22d9323b18bc0c948f670b8890462577236a1a8`
- Release under verification: `2.3.39`
- Default remote: `origin`

## Verification ledger

| Check | Result |
| --- | --- |
| Focused integrity/migration tests | Pass; dry-run, confirmation, permission, atomic-drift, audit, review-only, CLI, and all-workspace Trello-index migration boundaries covered |
| Focused retention tests | Pass: owner permissions, policy bounds, dry-run exclusions, exact confirmation, pre-delete audit failure, distributed worker lease, UI wiring, and rotation across bounded workspace batches |
| ESLint | Pass |
| Doctor | Pass with expected local warnings for absent MongoDB/Trello configuration; no errors; ngrok disabled locally |
| Full regression | Pass: 131 suites, 947 tests, including authoritative connector disconnect/reconnect, durable connector recovery, exact webhook approval payloads, ngrok-aware startup ordering, low-level provider-write denial, worker-response ownership, revision-safe review decisions, active-work draining, provider failure, API validation, and ledger compatibility |
| Recommendation evaluation | Pass: 5/5 scenarios, score 100% |
| Production and full dependency audit | Pass: 0 vulnerabilities after lockfile remediation |
| Release security positive check | Pass: five purpose-separated production secrets, no values exposed |
| Secret-pattern/source search | Pass: no high-confidence credential, TODO/FIXME/HACK, dynamic-code, or child-process finding |
| Distributed job lease | Pass: disposable MongoDB 7 simultaneous race produced one winner; exact-token renew/release, clean reacquisition, expiry takeover, and private-field exclusion passed |
| API contract | Pass: strict `/api/v1` success/error envelopes, correlated request IDs, legacy compatibility, raw HAI OpenAPI, streamed-response compatibility, and static-asset request-ID exclusion |
| Demo runtime smoke | Pass: 12-route HTTP matrix covered HTML, legacy/versioned metadata, security, mission control, jobs, operations ledger, connector catalog, HAI manifest/OpenAPI/snapshot, and a versioned 404 |
| Production database outage | Pass: packaged live mode kept port 3197 closed and displayed a stable, non-secret Windows recovery dialog with explicit demo or close choices |
| HAI HTTP smoke | Pass: versioned manifest/OpenAPI paths, capabilities `snapshot,propose`, provider writes `never_direct`, structured demo snapshot with stable board/card identifiers |
| ngrok packaging/safety | Pass: official Windows x64 native binding bundled; missing, weak, or placeholder remote credentials fail closed; unsafe listener URLs are rejected and closed; concurrent starts share one tunnel; runtime exact-origin CORS admission and restart cleanup are covered |
| Real MongoDB integrity repair | Pass: 40 collections migrated; two safe derived-state findings repaired with two audits; ambiguous Trello attempt remained review-only; provider writes false |
| Real MongoDB data retention | Pass: six eligible categories deleted, six protected records retained, six pre/post audit pairs stored, seven query indexes verified, provider writes false |
| Retention performance sample | Pass: six-category preview 35.09 ms, six audited category batches 936.39 ms, verifier RSS 94.1 MB; seven supporting indexes verified |
| Integrity API performance sample | Pass: 30 live requests measured 14.01 ms p50 and 23.71 ms p95; server working set 119.5 MB after browser QA |
| Authentication activity profile | Pass: 100 real-Mongo session resolutions retained 100 credential reads and reduced token/user activity writes from 200 to two; the five-minute boundary produced the next exact pair of active-only atomic touches |
| MongoDB pool profile | Pass: 100 concurrent reads completed in 115.5 ms; active driver options reported 20 maximum sockets, zero idle minimum, two simultaneous connection establishments, 60-second idle retirement, and five-second wait queue; peak checkout 17, listeners stable through reconnect, disposable database dropped |
| Review-concurrency profile | Pass: disposable real MongoDB raced approve/reject and approve/payload-edit; one winner per revision, exact active approval, zero orphan approvals, stale open and terminal queue actions blocked, zero Trello attempts, zero provider writes, database dropped |
| Follow-up integrity profile | Pass: simultaneous provider responses produced one owner and one WorkerResponse, exact intervention binding, only the matching follow-up resolved, adjacent same-card work remained due, simultaneous manual resolutions produced one winner, both audits used the authenticated workspace, zero Trello attempts, zero provider writes, database dropped |
| Trello webhook integrity profile | Pass: three boards and four observed webhooks produced exact create/update/delete recommendations, four decisions, four audits, zero attempts, zero provider writes, and zero new decisions on repeated reconciliation; low-level emergency stop denied mutation; database dropped |
| Portfolio-scale profile | Pass: real mission control read 60 boards/300 lists/15,000 cards/100 members plus 180 health snapshots; 1148.2 ms cold, 738.6 ms p50, 780.8 ms p95, 352.2 MB peak verifier RSS, both compound indexes selected, 60 unique current boards, critical-first 20-row cap, 10/12/12 outputs bounded, approval required, provider writes false |
| Bounded-ranking resource sample | Pass: worst-case 15,000-card focus improved 42.8 to 16.2 ms, risks 50.5 to 19.9 ms, commands 90.3 to 43.2 ms, and command peak RSS about 165 to 106 MB while preserving stable rank/evidence behavior |
| Startup profile | Pass: import loaded 254 modules without Mongoose in 304.8 ms at 64.6 MB RSS; Overview remained Mongo-free, completed in 68.2 ms, and sampled 68.6 MB RSS |
| Optional AI resource profile | Pass: loading offline chat did not load OpenAI; loading the deferred SDK afterward added 122 modules, 6.0 MB RSS, and 4.65 seconds in this cold local sample |
| Browser QA | Pass: in-app Browser exercised the Dutch connector marketplace and scope-review modal with no console errors, framework overlay, or horizontal document overflow at desktop and the browser runtime's responsive minimum; exact connected-account disconnect/reconnect states passed jsdom, while demo mode intentionally retained no account credentials |
| HAI HTTP smoke | Pass: manifest/OpenAPI expose only bounded `snapshot` and approval-gated `propose`; provider writes `never_direct`, approval endpoint false, execution endpoint absent |
| Windows UI automation | The installed Windows-control package did not expose its required guidance interface; no undocumented input was attempted and visual evidence is not inferred from HTTP or window metadata |
| Packaged Windows QA | Pass locally: 2.3.39 product metadata, healthy demo state, nine redacted diagnostics, HAI `never_direct`, normal main-window close, loopback port release, six byte-identical changed runtime modules, and a semantically validated builder-transformed manifest |
| Packaged resource sample | Pass: four processes used 360.8 MB working set, 294.9 MB private memory, and 1.812 cumulative CPU seconds in the five-second CI-equivalent probe. |
| Windows installer | Pass locally: 109,500,269 bytes, unsigned, SHA-256 `51E89FB4AB173D053C54441C968EE3ACC04F18A08A878E8B5AA50FEA522B0812`; executable metadata reports 2.3.39 |
| Fresh clone | Pending for exact 2.3.39 source; the last verified remote release remains 2.3.38 source `8d510d20a7617dab5c82e88a758518b24f1661af` |
| GitHub CI | Pending for 2.3.39; last verified run `31770300777` covers 2.3.38 |
| GitHub installer artifact | Pending for 2.3.39; last independently checked artifact `9207912643` covers 2.3.38 |

## External gates

Live Trello critical-path acceptance, live ngrok/HAI credential acceptance, production database restore, hosted multi-instance lease observation, hosted canary/rollback, OAuth consent reviews, Windows publisher signing, and assistive-technology certification require owner-controlled accounts or infrastructure and are not reported as complete.

## 2.3.39 continuation evidence

| Check | Result |
| --- | --- |
| Scope | Exact-confirmation, revision-aware connector disconnect; local authority purge; authoritative disabled state; in-place reconnect |
| Full quality gate | Pass: lint, 131 suites/947 tests, and 5/5 recommendation scenarios at 100% |
| Dependency security | Pass: production audit reports 0 vulnerabilities |
| Release secrets | Pass: five independent production-style values accepted; values not printed or exposed |
| Real-Mongo connector lifecycle | Pass: inexact confirmation rejected, credentials and refresh lease absent after disconnect, sync blocked before feature/provider work, same account reconnected, zero provider reads/writes |
| Recovery compatibility | Pass: 2 initial failures, 0 immediate retries, 1 due recovery, permanent account attempted once, compound index present, zero provider writes |
| Startup and portfolio scale | Pass: 304.8 ms/64.6 MB Mongo-free import; 68.2 ms/68.6 MB Overview; 15,000-card p95 780.8 ms and peak RSS 352.2 MB |
| Browser QA | Pass: connector marketplace and scope-review interaction, Dutch rendering, contained responsive layout, and zero console warnings; exact connected-account lifecycle states passed jsdom |
| HAI | Pass: only `snapshot` and approval-gated `propose`; `never_direct`; no approval or execution endpoint |
| Packaged Windows QA | Pass locally: version 2.3.39, nine diagnostics, no exposed secrets, HAI `never_direct`, four processes, normal close, port released, six runtime modules byte-identical and manifest semantics preserved |
| Packaged resource sample | Pass: 360.8 MB working set, 294.9 MB private bytes, and 1.812 cumulative CPU seconds after five seconds |
| Windows installer | Pass locally: 109,500,269 bytes, version 2.3.39, unsigned, SHA-256 `51E89FB4AB173D053C54441C968EE3ACC04F18A08A878E8B5AA50FEA522B0812` |
| Fresh-clone GitHub CI | Pending publication |
| GitHub installer artifact | Pending publication and independent download |
| External gates | Hosted OAuth/credential lifecycle, provider-side revocation, owner-authorized provider/ngrok/HAI acceptance, deployment/restore, signing, clean VM, and assistive technology remain external |

## 2.3.38 continuation evidence

| Check | Result |
| --- | --- |
| Scope | Durable due-only retry for transient connector failures; permanent credential failures stop; manual and scheduled synchronization share one workspace lease |
| Full quality gate | Pass: lint, 130 suites/939 tests, and 5/5 recommendation scenarios at 100% |
| Dependency security | Pass: full and production audits each report 0 vulnerabilities |
| Release secrets | Pass: five independent production-style values accepted; values not printed or exposed |
| Real-Mongo connector recovery | Pass: 2 initial failures, 0 immediate retries, 1 due recovery, permanent account attempted once, compound index present, zero provider writes |
| Startup and portfolio scale | Pass: 222.5 ms/60.2 MB Mongo-free import; 58.4 ms/64.6 MB Overview; 15,000-card p95 538.6 ms and peak RSS 348.8 MB |
| Browser QA | Pass: connector readiness interaction, Dutch connector rendering, and ENH-037 at desktop and 749 CSS-pixel minimum; contained document/buttons and zero console warnings; exact 390 CSS-pixel viewport unavailable in this Browser runtime |
| HAI | Pass: only `snapshot` and approval-gated `propose`; `never_direct`; no approval or execution endpoint |
| Packaged Windows QA | Pass: version 2.3.38, nine diagnostics, no exposed secrets, HAI `never_direct`, four processes, normal close, port released, seven runtime/config modules byte-identical |
| Packaged resource sample | Pass: 371.2 MB working set, 335.9 MB private bytes, and 2.031 cumulative CPU seconds after five seconds |
| Windows installer | Pass: 109,498,183 bytes, version 2.3.38, unsigned, SHA-256 `1A23AEC8A1FF83EE2FE0157D0CD7526F2FED018C96134430B816D3044EC099DC` |
| Fresh-clone GitHub CI | Pass: source `8d510d20a7617dab5c82e88a758518b24f1661af`, run `31770300777`, both jobs green |
| GitHub installer artifact | Pass: artifact `9207912643`; exactly one unsigned version 2.3.38 EXE; 109,498,445 bytes; SHA-256 `CB13929F88B6E99E3C436F139D1A65FD528BF19B181273DA35751B67226C5699` |
| External gates | Owner-authorized live provider/ngrok/HAI acceptance, production-like restore/deployment rollback, code signing, clean-VM scaling, and assistive-technology certification remain external |

## 2.3.37 continuation evidence

| Check | Result |
| --- | --- |
| Scope | Observe webhook state after the final ngrok callback; queue exact protected create/update/delete decisions; perform no startup mutation |
| Full quality gate | Pass: lint, 129 suites/932 tests, and 5/5 recommendation scenarios at 100% |
| Real-Mongo webhook reconciliation | Pass: 3 boards, 4 observed webhooks, 4 exact decisions, 4 audits, zero duplicate decisions on repeat, zero attempts, zero provider writes |
| Emergency stop | Pass: all low-level Trello card and webhook mutators deny writes before client initialization |
| Startup and portfolio scale | Pass: 294.4 ms/63.9 MB Mongo-free import; 54.4 ms/68 MB Overview; 15,000-card p95 587.3 ms and peak RSS 350.8 MB |
| Browser QA | Pass: ENH-036 and approval ledger at desktop and minimum responsive viewport; contained document/buttons and zero console errors; exact 390 CSS-pixel viewport unavailable in this Browser runtime |
| HAI | Pass: only `snapshot` and approval-gated `propose`; `never_direct`; no approval or execution endpoint |
| Packaged Windows QA | Pass: version 2.3.37, nine diagnostics, no exposed secrets, HAI `never_direct`, four processes, normal close, port released, 12 runtime/UI modules byte-identical |
| Packaged resource sample | Pass: 371.2 MB working set, 334.1 MB private bytes, and 1.578 cumulative CPU seconds after five seconds |
| Windows installer | Pass: 109,496,625 bytes, version 2.3.37, unsigned, SHA-256 `C3C9BBE31F1330E1FF4FE304831D343892D418C1B3FB2AD3AF89F671F22953B5` |
| Fresh-clone GitHub CI | Pass: source `68f23c58f96d2e1ae086809e4240a15a25309930`, run `31768820241`, both jobs green |
| GitHub installer artifact | Pass: artifact `9207376171`; exactly one unsigned version 2.3.37 EXE; 109,496,991 bytes; SHA-256 `80C699B0D90063E6063D9E6605852BF34650F77F639EE56DAF001CF731149483` |
| External gates | Owner-authorized live Trello/ngrok/HAI acceptance, production-like restore/deployment rollback, code signing, clean-VM scaling, and assistive-technology certification remain external |

## 2.3.36 continuation evidence

| Check | Result |
| --- | --- |
| Scope | One worker response owns one eligible executed intervention; exact recommendation/intervention identity precedes bounded card fallback; stale terminal transitions are rejected |
| Full quality gate | Pass: lint, 126 suites/915 tests, and 5/5 recommendation scenarios at 100% |
| Dependency security | Pass: full and production audits each report 0 vulnerabilities |
| Release secrets | Pass: five independent production-style values accepted; values not printed or exposed |
| Real-Mongo follow-up races | Pass: one provider-response owner, one retained response, exact binding, only matching follow-up resolved, adjacent same-card work due, one manual winner, authenticated-workspace audits, zero Trello attempts, zero provider writes |
| Startup | Pass: 592.3 ms import, 67.3 MB RSS, 254 modules; Overview 131.4 ms, 71.5 MB RSS; Mongoose remained unloaded |
| Portfolio scale | Pass: 60 boards/15,000 cards/180 health snapshots; 739.7 ms p50, 741.7 ms p95, 352.2 MB peak RSS; bounded output and both exact indexes retained |
| Browser QA | Pass: ENH-035 and approval ledger at desktop and 390 x 844; equal client/scroll width, terminal controls absent, and zero console errors |
| HAI | Pass: only `snapshot` and approval-gated `propose`; `never_direct`; no approval or execution endpoint |
| Packaged Windows QA | Pass: version 2.3.36, nine diagnostics, no exposed secrets, HAI `never_direct`, four processes, normal close, port released, four runtime modules byte-identical |
| Packaged resource sample | Directional pass: 375.4 MB working set, 369.9 MB private bytes, 1.453 cumulative CPU seconds after five seconds |
| Windows installer | Pass: 109,494,173 bytes, version 2.3.36, unsigned, SHA-256 `E496C4BA3E0FD53BAF0B95801C2DC3500A0182956431118151D14355C62F88EB` |
| Fresh-clone GitHub CI | Pass: source `ad7311b5cc036c83432c0994aff2590970b783ca`, run `31767164629`, both jobs green |
| GitHub installer artifact | Pass: artifact `9206772471`; exactly one unsigned version 2.3.36 EXE; 109,494,377 bytes; SHA-256 `8D6E57890FCB080687F670B9E7BA157CDF97B81E688F8533FFA5EF541D43ECD1` |
| External gates | Live provider/ngrok/HAI acceptance, hosted multi-channel observation, production-like restore/deployment rollback, code signing, clean-VM scaling, and assistive-technology certification remain external |

## 2.3.35 continuation evidence

| Check | Result |
| --- | --- |
| Scope | Review decisions compare one exact recommendation revision, bind one active approval, and reject stale queue mutations that could revive terminal work |
| Full quality gate | Pass: lint, 125 suites/910 tests, and 5/5 recommendation scenarios at 100% |
| Dependency security | Pass: full and production audits each report 0 vulnerabilities |
| Release secrets | Pass: five independent production-style values accepted; values not printed or exposed |
| Real-Mongo review races | Pass: one winner for approve/reject and approve/payload-edit, zero orphan approvals, stale and terminal queue calls blocked, zero Trello attempts, zero provider writes |
| Startup | Pass: 447.1 ms import, 68.5 MB RSS, 254 modules; Overview 113 ms, 71.9 MB RSS; Mongoose remained unloaded |
| Portfolio scale | Pass: 60 boards/15,000 cards/180 health snapshots; 888.1 ms p50, 1,022.1 ms p95, 305.6 MB peak RSS; bounded output and both exact indexes retained |
| Browser QA | Pass: ENH-034 and approval ledger at desktop and 390 x 844; equal client/scroll width and zero console errors |
| HAI | Pass: only `snapshot` and approval-gated `propose`; `never_direct`; no approval or execution endpoint |
| Packaged Windows QA | Pass: version 2.3.35, nine diagnostics, no exposed secrets, HAI `never_direct`, four processes, normal close, port released, four runtime modules byte-identical |
| Packaged resource sample | Directional pass: 371.7 MB working set, 335.2 MB private bytes, 1.844 cumulative CPU seconds after five seconds |
| Windows installer | Pass: 109,493,402 bytes, version 2.3.35, unsigned, SHA-256 `91FB8AD4C65BEBDC3357F45D8C5711F8B24F546F3EA2AA08891A0B6A39F93E83` |
| Fresh-clone GitHub CI | Pass: source `2602cef6d7d17e44841e6b7ca9cad1c1f4ea4bed`, run `31765213372`, both jobs green |
| GitHub installer artifact | Pass: artifact `9206071000`; exactly one unsigned version 2.3.35 EXE; 109,493,593 bytes; SHA-256 `2D8686E28567F19087278A93016119FDC8DCC419F1391215CD17F9E1E7209D95` |
| External gates | Live provider/ngrok/HAI acceptance, hosted multi-operator observation, production-like restore/deployment rollback, code signing, clean-VM scaling, and assistive-technology certification remain external |

## 2.3.34 continuation evidence

| Check | Result |
| --- | --- |
| Scope | One newest health snapshot per board is selected before risk-first caps shared by brief, approval ledger, reports, notifications, and HAI |
| Full quality gate | Pass: lint, 124 suites/904 tests, and 5/5 recommendation scenarios at 100% |
| Dependency security | Pass: full and production audits each report 0 vulnerabilities |
| Release secrets | Pass: five independent production-style values accepted; values not printed or exposed |
| Startup | Pass: 264.4 ms import, 70.6 MB RSS, 254 modules; Overview 57.7 ms, 74.8 MB RSS; Mongoose remained unloaded |
| Portfolio scale | Pass: 60 boards/15,000 cards/180 health snapshots; 615.2 ms p50, 653.7 ms p95, 357.2 MB peak RSS; latest-health query 17.3 ms, 60 unique boards, critical first, exact index |
| Browser QA | Pass: critical Board Health card and ENH-033 at desktop and 390 x 844; equal client/scroll width |
| HAI | Pass: only `snapshot` and approval-gated `propose`; `never_direct`; no approval or execution endpoint |
| Packaged Windows QA | Pass: version 2.3.34, nine diagnostics, no exposed secrets, HAI `never_direct`, four processes, normal close, port released, four runtime modules byte-identical |
| Packaged resource sample | Directional pass: 371.5 MB working set, 392.4 MB private bytes, 1.484 cumulative CPU seconds after five seconds |
| Windows installer | Pass: 109,492,015 bytes, version 2.3.34, unsigned, SHA-256 `626687D4366379FA97700A8E0ADDA265C328C3619A870F317C9634ACC8EEEA67` |
| Fresh-clone GitHub CI | Pass: run `31763249069` on source `05839483c1df250ea6acb0d265ce0e9b55510e03`; quality completed in 1 minute 19 seconds and Windows package/runtime in 3 minutes 6 seconds |
| GitHub installer artifact | Pass: artifact `9205413905`, archive size 109,498,043 bytes, digest `sha256:6ba5de40098a64796ffd7b386245827794ab0a156e81454fe0cca285abc72a2e`; its single installer is 109,492,086 bytes, unsigned, version 2.3.34, SHA-256 `9107BA108E3F5FD4699717C42C133E984CF16DA69E4B7BCAA62CD78124ECA326` |
| External gates | Live provider/ngrok/HAI acceptance, production-like restore/deployment rollback, code signing, clean-VM scaling, and assistive-technology certification remain external |

## 2.3.33 continuation evidence

| Check | Result |
| --- | --- |
| Scope | Active HTTP requests, scheduled callbacks, connector sync, retention, and deletion maintenance drain before MongoDB teardown within one validated grace window |
| Full quality gate | Pass: lint, 123 suites/902 tests, and 5/5 recommendation scenarios at 100% |
| Dependency security | Pass: full and production audits each report 0 vulnerabilities |
| Release secrets | Pass: five independent production-style values accepted; values not printed or exposed |
| Startup | Pass: 315 ms import, 70.4 MB RSS, 254 modules; Overview 59.5 ms, 73.9 MB RSS; Mongoose remained unloaded |
| Portfolio scale | Pass: 60 boards/15,000 cards; 685.1 ms p50, 741.9 ms p95, 406.3 MB peak RSS, bounded output, exact index, approval required, provider writes false |
| Browser QA | Pass: nine setup diagnostics and ENH-032 at desktop and 390 x 844; equal client/scroll width |
| HAI | Pass: only `snapshot` and approval-gated `propose`; `never_direct`; no approval or execution endpoint |
| Packaged Windows QA | Pass: version 2.3.33, nine diagnostics, no exposed secrets, HAI `never_direct`, four processes, normal close, port released, 15 runtime modules byte-identical |
| Packaged resource sample | Directional pass: 374 MB working set, 383.7 MB private bytes, 1.422 cumulative CPU seconds after five seconds |
| Windows installer | Pass: 109,490,628 bytes, version 2.3.33, unsigned, SHA-256 `F397C644E8EC7BE71CCD72AA1B8F852A4EE7B3A73E7470824B1C34B1D094D32D` |
| Fresh-clone GitHub CI | Pass: run `31761836528` on source `ee83ea53bcf2a019a213cc5b71bd6b2631b5c264`; Node.js 24 quality completed in 58 seconds and Windows packaging/runtime in 2 minutes 34 seconds |
| GitHub installer artifact | Pass: artifact `9204933068`, archive size 109,496,649 bytes, digest `sha256:c6d846baee9551c44de26f87d907eaf7b170ffd2fc57d7d4b2cfea1763165d94`; its single installer is 109,490,671 bytes, unsigned, version 2.3.33, SHA-256 `259C80441889783AD6727B62E44E5112EB2382CD022D24769223FFB7716416A9` |
| External gates | Live provider/ngrok/HAI acceptance, production-like restore/deployment rollback, code signing, clean-VM scaling, and assistive-technology certification remain external |

## 2.3.20 continuation evidence

| Check | Result |
| --- | --- |
| Scope | Work Signals and normalized graph rendering extracted behind a retry-safe deferred module; guarded API and action authority remains in the controller |
| Full quality gate | Pass: lint, 110 suites/824 tests, and 5/5 recommendation scenarios at 100% |
| Dependency security | Pass: full and production audits each report 0 vulnerabilities |
| Release secrets | Pass: five independent production-style values accepted; values not printed or exposed |
| Source/syntax | Pass: JavaScript syntax, diff whitespace, CSP/source-boundary, exact-evidence, unsafe-link, and action-delegation checks |
| Initial payload | Improved from 318,418 to 294,642 raw, 66,622 to 61,938 gzip, and 54,323 to 50,964 Brotli bytes; deferred renderer is 37,369 raw bytes |
| Browser QA | Pass: real in-app Browser, English/Dutch, one shared-fingerprint deferred script, filter interaction, exact provider evidence, no overlay, no horizontal overflow, zero warning/error logs |
| Packaged Windows QA | Pass: version 2.3.20, demo health and eight diagnostics, no exposed secrets, HAI `never_direct`, four processes, normal close, port released |
| Packaged resource sample | Directional pass: 360.8 MB working set, 291.4 MB private bytes, 2.391 cumulative CPU seconds after the repeatable local packaged probe |
| Windows installer | Pass: 109,476,907 bytes, version 2.3.20, unsigned, SHA-256 `3B0E3460D84DAA3BD5CC7E182FA423287C321E4A50B83621E8F0E311450A6D95`; archive contains `public/workSignalsView.js` |
| Fresh-clone GitHub CI | Pass: run `31327523743` on source `0b19b13009bae3523d4cdffa14ea630c923b139f`; Node.js 24 quality completed in 1m01s and Windows packaging/upload in 2m14s |
| GitHub installer artifact | Pass: artifact `9041970725`, archive size 109,483,887 bytes, digest `sha256:7e47e852d4c7a084f5177c2d018aedb4ce5bd949ba9b6a623f6b0ed0d9040cb0`; its single installer is 109,477,917 bytes, unsigned, version 2.3.20, SHA-256 `D245ABBC0D6C6B3D4CDD2DA53DD81A310FA21D798631E05E6A36A0CC7EE8CBDC` |
| External gates | Live provider/ngrok/HAI acceptance, production-like restore/deployment rollback, code signing, clean-VM scaling, and assistive-technology certification remain external |

## 2.3.21 continuation evidence

| Check | Result |
| --- | --- |
| Scope | Forecasts, capacity/scenario/project-mapping forms, and Reports extracted behind retry-safe deferred modules; guarded API, persistence, download, and mutation authority remains in the controller |
| Full quality gate | Pass: lint, 111 suites/830 tests, and 5/5 recommendation scenarios at 100% |
| Dependency security | Pass: full and production audits each report 0 vulnerabilities |
| Release secrets | Pass: five independent production-style values accepted; values not printed or exposed |
| Source/syntax | Pass: JavaScript syntax, diff whitespace, CSP/source-authority, exact-evidence, localization-completeness, form-persistence, retry, and action-delegation checks |
| Startup profile | Pass: import 945.9 ms at 53.2 MB RSS; seven-request Overview 187.4 ms at 58.6 MB RSS; 251/263 modules and no Mongoose loaded |
| Initial payload | Improved from 294,642 to 279,740 raw, 61,938 to 58,547 gzip, and 50,964 to 48,385 Brotli bytes; deferred renderers total 31,512 raw bytes |
| Browser QA | Pass: real in-app Browser, English/Dutch, one shared-fingerprint script per view, exact evidence, no overlay, no horizontal overflow, zero warning/error logs |
| Packaged Windows QA | Pass: version 2.3.21, demo health and eight diagnostics, no exposed secrets, HAI `never_direct`, four processes, normal close, port released |
| Packaged resource sample | Directional pass: 360.5 MB working set, 290.1 MB private bytes, 1.688 cumulative CPU seconds after the repeatable local packaged probe |
| Windows installer | Pass: 109,479,199 bytes, version 2.3.21, unsigned, SHA-256 `B9E47D19CFA2C65A5263558953DF92351E6DD53F680E7965B71D9887AD2A1587`; archive contains `public/forecastView.js` and `public/reportView.js` |
| Fresh-clone GitHub CI | Pass: run `31329172266` on source `431e99dbfeef8e11105b079c620f101db338cf83`; Node.js 24 quality completed in 49 seconds and Windows packaging/upload in 2 minutes 15 seconds |
| GitHub installer artifact | Pass: artifact `9042435236`, archive size 109,485,393 bytes, digest `sha256:349a257ffc1cadbdaa37d45cc8e88695fcfa27ecb6fe86c3dc34cd99ef26d79a`; its single installer is 109,479,402 bytes, unsigned, version 2.3.21, SHA-256 `D41A927DDD85B0CC487F092DA3E856ECA4CCD9F6923EB0FE37094D283B023A1F` |
| External gates | Live provider/ngrok/HAI acceptance, production-like restore/deployment rollback, code signing, clean-VM scaling, and assistive-technology certification remain external |

## 2.3.22 continuation evidence

| Check | Result |
| --- | --- |
| Scope | Five workspace policy form renderers moved into the retry-safe deferred Workspace module; exact payload, API, persistence, refresh, and provider authority remains in the controller |
| Full quality gate | Pass: lint, 111 suites/831 tests, and 5/5 recommendation scenarios at 100% |
| Dependency security | Pass: full and production audits each report 0 vulnerabilities |
| Release secrets | Pass: five independent production-style values accepted; values not printed or exposed |
| Source/syntax | Pass: JavaScript syntax, diff whitespace, CSP/source-authority, five-form rendering, localization, fixed-owner, persistence, retry, and action-delegation checks |
| Startup profile | Directional pass: import 297.6 ms at 64.4 MB RSS; Overview 94.6 ms at 68.3 MB RSS; 251/263 modules and no Mongoose loaded |
| Initial payload | Improved from 279,740 to 264,942 raw, 58,547 to 56,407 gzip, and 48,385 to 46,712 Brotli bytes; Workspace remains deferred and combined source after opening is 2,533 raw bytes smaller |
| Browser QA | Pass: real in-app Browser, English/Dutch, Workspace absent on Overview then loaded once with the shared fingerprint, read-only demo controls, no visible dialog or horizontal overflow, zero warning/error logs |
| Packaged Windows QA | Pass: version 2.3.22, demo health and eight diagnostics, no exposed secrets, HAI `never_direct`, four processes, normal close, port released |
| Packaged resource sample | Directional pass: 361.1 MB working set, 292.3 MB private bytes, 1.688 cumulative CPU seconds after the repeatable local packaged probe |
| Windows installer | Pass: 109,479,448 bytes, version 2.3.22, unsigned, SHA-256 `7AEF17707C0B79EE7832C8AB321228172544E3C386529957B28B9E0498923E21`; archive contains updated `public/workspaceView.js` |
| Fresh-clone GitHub CI | Pass: run `31330566354` on source `f5b442e832cae763a33fe6212ed39a91c56024b9`; Node.js 24 quality completed in 1 minute 8 seconds and Windows packaging/upload in 2 minutes 13 seconds |
| GitHub installer artifact | Pass: artifact `9042817428`, archive size 109,485,528 bytes, digest `sha256:2e3f4a2213d97a47435a25cd9baaed11c1fac9bd51f132e59adabf40d6331114`; its single installer is 109,479,490 bytes, unsigned, version 2.3.22, SHA-256 `1791C0DF6CEA5ABD23572DEC33F997400AD13416A957A101DDFAA608709B1F16` |
| External gates | Live provider/ngrok/HAI acceptance, production-like restore/deployment rollback, code signing, clean-VM scaling, and assistive-technology certification remain external |

## 2.3.23 continuation evidence

| Check | Result |
| --- | --- |
| Scope | Ten connector account-selection form renderers moved into the retry-safe deferred Connector module; authenticated reads/writes, exact payloads, refresh, credentials, and provider authority remain in the controller |
| Full quality gate | Pass: lint, 111 suites/835 tests, and 5/5 recommendation scenarios at 100% |
| Dependency security | Pass: full and production audits each report 0 vulnerabilities |
| Release secrets | Pass: five independent production-style values accepted; values not printed or exposed |
| Source/syntax | Pass: JavaScript syntax, diff whitespace, source-authority, all-ten-form rendering, localization, values, exact body, no-draft, empty-choice, duplicate-submit, cancellation, retry, and escaping checks |
| Startup profile | Directional pass: import 480.9 ms at 68.9 MB RSS; Overview 79.3 ms at 72.6 MB RSS; 251/263 modules and no Mongoose loaded |
| Portfolio scale | Pass: 60 boards/300 lists/15,000 cards/100 members; 1,754.9 ms cold, 761.4 ms p50, 966.6 ms p95, 340.1 MB peak RSS, bounded 10/12/12 output, exact index, approval required, provider writes false |
| Initial payload | Improved from 264,942 to 243,449 raw, 56,407 to 54,276 gzip, and 46,712 to 45,102 Brotli bytes; Connector remains deferred |
| Browser QA | Pass: real in-app Browser, English/Dutch, Connector absent on Overview then loaded once with the shared fingerprint, 117 connectors, four catalog-only providers, no horizontal overflow, zero current console errors |
| Packaged Windows QA | Pass: version 2.3.23, demo health and eight diagnostics, no exposed secrets, HAI `never_direct`, four processes, normal close, port released |
| Packaged resource sample | Directional pass: 360.5 MB working set, 290.4 MB private bytes, 2.281 cumulative CPU seconds after the repeatable local packaged probe |
| Windows installer | Pass: 109,480,743 bytes, version 2.3.23, unsigned, SHA-256 `97EE2D6E07D24B187CB2FCF1A223FF9C01AE1D5191FA37880A1B9FF17B1F3871`; archive contains updated `public/connectorView.js` |
| Fresh-clone GitHub CI | Pass: run `31332160310` on source `be0eeb677dbf1049ecfa15d29fe010f44d58f53e`; Node.js 24 quality completed in 1 minute 1 second and Windows packaging/upload in 2 minutes 26 seconds |
| GitHub installer artifact | Pass: artifact `9043260024`, archive size 109,486,755 bytes, digest `sha256:90fc98a6056c933649b977ea894e64369440cac1a53e85ceab735ecffb6a64a1`; its single installer is 109,480,729 bytes, unsigned, version 2.3.23, SHA-256 `EB60DF80CCDC45699A3254A56B48676E91AAE790C624213A8DD3BE449D1C7923` |
| External gates | Live provider/ngrok/HAI acceptance, production-like restore/deployment rollback, code signing, clean-VM scaling, and assistive-technology certification remain external |

## 2.3.25 continuation evidence

| Check | Result |
| --- | --- |
| Scope | Notification policy create/edit/status/test controls moved into the retry-safe deferred Approval module; exact bodies, API writes, refreshes, encrypted destinations, and provider authority remain in the controller |
| Correctness fixes | Pass: daily brief schedules survive partial updates; activation requires server-side confirmation; duplicate submissions are blocked; committed saves and delivered tests remain truthful if refresh fails |
| Full quality gate | Pass: lint, 111 suites/843 tests, and 5/5 recommendation scenarios at 100% |
| Dependency security | Pass: full and production audits each report 0 vulnerabilities |
| Release secrets | Pass: five independent production-style values accepted; values not printed or exposed |
| Startup profile | Directional pass: import 325.1 ms at 67.8 MB RSS; Overview 90.1 ms at 72.2 MB RSS; 251/263 modules and no Mongoose loaded |
| Portfolio scale | Pass: 60 boards/300 lists/15,000 cards/100 members; 1,225.4 ms cold, 567.1 ms p50, 604.4 ms p95, 330.6 MB peak RSS, bounded 10/12/12 output, exact index, approval required, provider writes false |
| Initial payload | Improved from 233,925 to 220,951 raw, 52,495 to 50,424 gzip, and 44,254 to 42,523 Brotli bytes; Approval remains deferred |
| Browser QA | Pass: real in-app Browser, Approval absent on Overview then loaded once with the shared fingerprint, English/Dutch read-only demo rendering, no fabricated policy forms, no horizontal overflow, zero current console errors |
| Packaged Windows QA | Pass: version 2.3.25, demo health and eight diagnostics, no exposed secrets, HAI `never_direct`, four processes, normal close, port released |
| Packaged resource sample | Directional pass: 363.3 MB working set, 329.4 MB private bytes, 1.578 cumulative CPU seconds after the repeatable local packaged probe |
| Windows installer | Pass: 109,482,700 bytes, version 2.3.25, unsigned, SHA-256 `E4D290CA4FAFC9762017BF2E370E42549EAE626ED18D464B0FE008CDD908D165`; packaged `app.js`, `approvalView.js`, and `notificationService.js` are byte-identical to verified source |
| Fresh-clone GitHub CI | Pass: run `31335440803` on source `f2c6bc854739ead5d800a471468bc009a6d6604d`; Node.js 24 quality completed in 1 minute 12 seconds and Windows packaging/upload in 2 minutes 11 seconds |
| GitHub installer artifact | Pass: artifact `9044199111`, archive size 109,488,912 bytes, digest `sha256:94e1132dedb095bb16622868116e47334cd86e2bbcb1b0bb4f88c6951f595fc4`; its single installer is 109,482,942 bytes, unsigned, version 2.3.25, SHA-256 `AFCF25284ED347BEAF23A3E5F83D7AC3819FB2F337D457D7137880F5E49F158F` |
| External gates | Live provider/ngrok/HAI acceptance, production-like restore/deployment rollback, code signing, clean-VM scaling, and assistive-technology certification remain external |

## 2.3.24 continuation evidence

| Check | Result |
| --- | --- |
| Scope | Generic Webhook inbound worker-response mapping moved into the retry-safe deferred Connector module; authenticated reads/writes, exact payloads, refresh, credentials, and provider authority remain in the controller |
| Correctness fixes | Pass: encoded account routes; stale member/card searches cancelled and ignored; dependent state reset; inline recoverable errors; exact IDs and 100-item limit; duplicate pair/submit guards; successful-write/failed-refresh truthfulness across eleven connector forms |
| Full quality gate | Pass: lint, 111 suites/838 tests, and 5/5 recommendation scenarios at 100% |
| Dependency security | Pass: full and production audits each report 0 vulnerabilities |
| Release secrets | Pass: five independent production-style values accepted; values not printed or exposed |
| Startup profile | Directional pass: import 8,969.7 ms at 69.8 MB RSS; Overview 563.6 ms at 72.7 MB RSS; 251/263 modules and no Mongoose loaded. Timings were affected by concurrent machine load and are not treated as a controlled regression |
| Portfolio scale | Pass: 60 boards/300 lists/15,000 cards/100 members; 1,107.6 ms cold, 476.8 ms p50, 526 ms p95, 328.3 MB peak RSS, bounded 10/12/12 output, exact index, approval required, provider writes false |
| Initial payload | Improved from 243,449 to 233,925 raw, 54,557 to 52,637 gzip, and 45,810 to 44,254 Brotli bytes; Connector remains deferred |
| Browser QA | Pass: real in-app Browser, Connector absent on Overview then loaded once with the shared fingerprint, 117 connectors, Dutch rendering, no fabricated account state, no visible dialog or horizontal overflow, zero current console errors |
| Packaged Windows QA | Pass: version 2.3.24, demo health and eight diagnostics, no exposed secrets, HAI `never_direct`, four processes, normal close, port released |
| Packaged resource sample | Directional pass: 362.5 MB working set, 347.7 MB private bytes, 1.938 cumulative CPU seconds after the repeatable local packaged probe |
| Windows installer | Pass: 109,481,903 bytes, version 2.3.24, unsigned, SHA-256 `77240C43039263D0C785471BA44148272ABE3E533B4D18AD9041F516DCC21D6E`; packaged `app.js` and `connectorView.js` are byte-identical to verified source |
| Fresh-clone GitHub CI | Pass: run `31333762069` on source `7e9400cc48ae42cc7c92a0a3ec9389781833f6e0`; Node.js 24 quality completed in 1 minute 3 seconds and Windows packaging/upload in 2 minutes 46 seconds |
| GitHub installer artifact | Pass: artifact `9043718997`, archive size 109,488,047 bytes, digest `sha256:12528c7a7d929d6f2d6726cd74e98534af33001231ebd5c0785c3928e3100fed`; its single installer is 109,482,011 bytes, unsigned, version 2.3.24, SHA-256 `04BD2A3D63C29C24E5995FAB79060F68BDC6B3992740ABD634FC3C8BBCC82D14` |
| External gates | Live provider/ngrok/HAI acceptance, production-like restore/deployment rollback, code signing, clean-VM scaling, and assistive-technology certification remain external |
