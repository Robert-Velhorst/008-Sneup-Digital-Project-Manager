# Codex Checkpoints

| Gate | Evidence | State |
| --- | --- | --- |
| Source understood | 124 pages, phases 000-115, appendix artifacts | Complete |
| Baseline preserved | Started at `470d0a35ca712a3c12473a5c8cccb2118092d3ed`; unrelated untracked files untouched | Complete |
| Operational controls | Doctor, readiness, support bundle, emergency stop | Complete |
| Focused verification | Runtime/security tests and lint | Complete |
| Traceability | Required document set and completion matrix | Complete |
| Full regression | 111 suites/830 tests, lint, 5/5 evaluation, two zero-vulnerability dependency audits, and positive five-secret release verification | Complete |
| Portfolio scale | Real mission-control path over 60 boards/15,000 cards; bounded output/evidence, exact compound index, 1.26 s cold, 1.11 s measured p95, no provider writes | Complete locally |
| Multi-instance jobs | Unit coverage plus disposable MongoDB 7 simultaneous acquisition, token, release, and expiry verification | Complete locally |
| API contract | `/api/v1` envelope, request correlation, dashboard parser, HAI OpenAPI, live demo HTTP matrix, and compatibility tests | Complete locally |
| Feature rollouts | Four optional workloads, deterministic subjects, optimistic revisions, bounded cache/history, manager UI, 40-collection real-Mongo verification, and live fail-closed behavior | Complete locally; hosted manager acceptance pending |
| Data integrity and repair | Bounded dry-run/apply, review-only unsafe findings, all-workspace Trello index migration, audit evidence, and disposable MongoDB verification | Complete locally |
| Data retention | Owner-only opt-in policy, bounded preview/apply, protected evidence, distributed lease, indexed queries, pre/post audits, real MongoDB proof, and live browser flow | Complete locally |
| Windows package | 2.3.21 NSIS build, demo diagnostics/HAI smoke, metadata, SHA-256, deferred-module archive check, repeatable resource sample, and clean close | Complete locally; publisher signing external |
| Fresh clone | 2.3.21 exact source `431e99dbfeef8e11105b079c620f101db338cf83`; Node 24 quality and Windows installer jobs in run `31329172266` | Complete |
| Browser and Windows UI | Demand-loaded English/Dutch connector, workspace, approval, Work Signals, graph, Forecasts, and Reports renderers; exact evidence/payload preservation; shared asset-version reuse; refresh; filtering; and containment passed in the in-app Browser with zero current console errors | Complete for these flows; screen-reader/clean-VM evidence pending |
| HAI and ngrok | Least-privilege HAI contract, HTTP smoke, fail-closed ngrok adapter | Complete locally; live credentials external |
| GitHub CI | 2.3.21 run `31329172266` passed both jobs; artifact `9042435236` was downloaded and independently checked | Complete |
| Live providers | Organization-owned Trello/provider acceptance | External blocker |
| Production deployment | Hosting, secrets, backup restore, canary, rollback | External blocker |
| Signed installer | Publisher certificate | External blocker |
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
