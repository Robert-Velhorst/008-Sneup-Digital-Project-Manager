# Codex Checkpoints

| Gate | Evidence | State |
| --- | --- | --- |
| Source understood | 124 pages, phases 000-115, appendix artifacts | Complete |
| Baseline preserved | Started at `470d0a35ca712a3c12473a5c8cccb2118092d3ed`; unrelated untracked files untouched | Complete |
| Operational controls | Doctor, readiness, support bundle, emergency stop | Complete |
| Focused verification | Runtime/security tests and lint | Complete |
| Traceability | Required document set and completion matrix | Complete |
| Full regression | 111 suites/838 tests, lint, 5/5 evaluation, two zero-vulnerability dependency audits, and positive five-secret release verification | Complete |
| Portfolio scale | Real mission-control path over 60 boards/15,000 cards; bounded output/evidence, exact compound index, 1.11 s cold, 526 ms measured p95, no provider writes | Complete locally |
| Multi-instance jobs | Unit coverage plus disposable MongoDB 7 simultaneous acquisition, token, release, and expiry verification | Complete locally |
| API contract | `/api/v1` envelope, request correlation, dashboard parser, HAI OpenAPI, live demo HTTP matrix, and compatibility tests | Complete locally |
| Feature rollouts | Four optional workloads, deterministic subjects, optimistic revisions, bounded cache/history, manager UI, 40-collection real-Mongo verification, and live fail-closed behavior | Complete locally; hosted manager acceptance pending |
| Data integrity and repair | Bounded dry-run/apply, review-only unsafe findings, all-workspace Trello index migration, audit evidence, and disposable MongoDB verification | Complete locally |
| Data retention | Owner-only opt-in policy, bounded preview/apply, protected evidence, distributed lease, indexed queries, pre/post audits, real MongoDB proof, and live browser flow | Complete locally |
| Windows package | 2.3.24 NSIS build, demo diagnostics/HAI smoke, metadata, SHA-256, source-identical Connector assets, repeatable resource sample, and clean close | Complete locally; publisher signing external |
| Fresh clone | 2.3.24 exact source `7e9400cc48ae42cc7c92a0a3ec9389781833f6e0`; Node 24 quality and Windows installer jobs in run `31333762069` | Complete |
| Browser and Windows UI | Demand-loaded English/Dutch connector and account-selection, workspace and policy-form, approval, Work Signals, graph, Forecasts, and Reports renderers; exact evidence/payload preservation; shared asset-version reuse; refresh; filtering; and containment passed in the in-app Browser with zero current console errors | Complete for these flows; screen-reader/clean-VM evidence pending |
| HAI and ngrok | Least-privilege HAI contract, HTTP smoke, fail-closed ngrok adapter | Complete locally; live credentials external |
| GitHub CI | 2.3.24 run `31333762069` passed both jobs; artifact `9043718997` was downloaded and independently checked | Complete |
| Live providers | Organization-owned Trello/provider acceptance | External blocker |
| Production deployment | Hosting, secrets, backup restore, canary, rollback | External blocker |
| Signed installer | Publisher certificate | External blocker |

## 2026-08-09 - Worker-response mapping release checkpoint

- Release: 2.3.24
- Scope: connected Generic Webhook inbound worker-response mapping moved behind the retry-safe deferred Connector module; post-commit refresh truthfulness fixed across eleven connector save flows.
- Authority boundary: authenticated reads/writes, encoded account IDs, exact bodies, refresh, credentials, and provider authority remain in `public/app.js`; `public/connectorView.js` has no fetch, token, cookie, session, or storage authority.
- Verification: lint; 111 suites/838 tests; 5/5 recommendation evaluation; two zero-vulnerability audits; five-secret production check; real-Mongo portfolio profile; in-app Browser English/Dutch acceptance; Windows package verification.
- Installer: `release/Sneup-Setup-2.3.24.exe`, 109,481,903 bytes, unsigned, SHA-256 `77240C43039263D0C785471BA44148272ABE3E533B4D18AD9041F516DCC21D6E`.
- GitHub: source `7e9400cc48ae42cc7c92a0a3ec9389781833f6e0`; run `31333762069`; quality 1 minute 3 seconds; Windows package 2 minutes 46 seconds; independently verified artifact `9043718997`.
- External gates remain: authorized live Trello/ngrok/HAI/provider acceptance, production-like restore and deployment rollback, publisher signing, clean-VM scaling, and assistive-technology certification.

## 2026-08-09 - Connector selection-form release checkpoint

- Release: 2.3.23
- Scope: all ten linked-account selection renderers moved behind the existing retry-safe deferred Connector module.
- Authority boundary: authenticated option reads, exact endpoint mapping, encoded account IDs, POST bodies, refresh, credentials, and provider authority remain in `public/app.js`; `public/connectorView.js` has no fetch, token, cookie, session, or storage authority.
- Verification: lint; 111 suites/835 tests; 5/5 recommendation evaluation; two zero-vulnerability audits; five-secret production check; real-Mongo portfolio profile; in-app Browser English/Dutch acceptance; Windows package verification.
- Installer: `release/Sneup-Setup-2.3.23.exe`, 109,480,743 bytes, unsigned, SHA-256 `97EE2D6E07D24B187CB2FCF1A223FF9C01AE1D5191FA37880A1B9FF17B1F3871`.
- GitHub: source `be0eeb677dbf1049ecfa15d29fe010f44d58f53e`; run `31332160310`; quality 1 minute 1 second; Windows package 2 minutes 26 seconds; independently verified artifact `9043260024`.
- External gates remain: authorized live Trello/ngrok/HAI/provider acceptance, production-like restore and deployment rollback, publisher signing, clean-VM scaling, and assistive-technology certification.

## 2026-08-09 - Workspace policy-form release checkpoint

- Release: 2.3.22
- Scope: all five workspace policy form renderers moved behind the existing retry-safe deferred Workspace module.
- Authority boundary: exact payload construction, authentication, API writes, save cleanup, refresh, and provider authority remain in `public/app.js`; `public/workspaceView.js` has no fetch, token, cookie, or storage authority.
- Verification: lint; 111 suites/831 tests; 5/5 recommendation evaluation; two zero-vulnerability audits; five-secret production check; in-app Browser English/Dutch acceptance; Windows package verification.
- Installer: `release/Sneup-Setup-2.3.22.exe`, 109,479,448 bytes, unsigned, SHA-256 `7AEF17707C0B79EE7832C8AB321228172544E3C386529957B28B9E0498923E21`.
- GitHub: source `f5b442e832cae763a33fe6212ed39a91c56024b9`; run `31330566354`; quality 1 minute 8 seconds; Windows package 2 minutes 13 seconds; independently verified artifact `9042817428`.
- External gates remain: authorized live Trello/ngrok/HAI acceptance, production-like restore and deployment rollback, publisher signing, clean-VM scaling, and assistive-technology certification.
## 2026-08-09 - Work Signals renderer release checkpoint

- Release: 2.3.20
- Scope: demand-loaded Work Signals and normalized graph renderer; lazy Dutch catalog; safe evidence links; retry and action-boundary regressions.
- Authority boundary: API/session/credential access and consequential graph actions remain in `public/app.js`; `public/workSignalsView.js` has no fetch or persistence authority.
- Verification: lint; 110 suites/824 tests; 5/5 recommendation evaluation; two zero-vulnerability audits; five-secret production check; in-app Browser English/Dutch and interaction acceptance; Windows package verification.
- Installer: `release/Sneup-Setup-2.3.20.exe`, 109,476,907 bytes, unsigned, SHA-256 `3B0E3460D84DAA3BD5CC7E182FA423287C321E4A50B83621E8F0E311450A6D95`.
- External gates remain: authorized live Trello/ngrok/HAI acceptance, production-like restore and deployment rollback, publisher signing, clean-VM scaling, and assistive-technology certification.

## 2026-08-09 - Forecasts and Reports release checkpoint

- Release: 2.3.21
- Scope: demand-loaded Forecasts and Reports renderers, localized forms and operator chrome, retry recovery, and shared asset fingerprinting.
- Authority boundary: API/session/persistence access, capacity/project-mapping mutations, report downloads, and provider authority remain in `public/app.js`; the renderers have no direct fetch or credential capability.
- Verification: lint; 111 suites/830 tests; 5/5 recommendation evaluation; two zero-vulnerability audits; five-secret production check; in-app Browser English/Dutch acceptance; Windows package verification.
- Installer: `release/Sneup-Setup-2.3.21.exe`, 109,479,199 bytes, unsigned, SHA-256 `B9E47D19CFA2C65A5263558953DF92351E6DD53F680E7965B71D9887AD2A1587`.
- GitHub: source `431e99dbfeef8e11105b079c620f101db338cf83`; run `31329172266`; quality 49 seconds; Windows package 2 minutes 15 seconds; independently verified artifact `9042435236`.
- External gates remain: authorized live Trello/ngrok/HAI acceptance, production-like restore and deployment rollback, publisher signing, clean-VM scaling, and assistive-technology certification.
