# Codex Checkpoints

| Gate | Evidence | State |
| --- | --- | --- |
| Source understood | 124 pages, phases 000-115, appendix artifacts | Complete |
| Baseline preserved | Started at `470d0a35ca712a3c12473a5c8cccb2118092d3ed`; unrelated untracked files untouched | Complete |
| Operational controls | Doctor, readiness, support bundle, emergency stop | Complete |
| Focused verification | Runtime/security tests and lint | Complete |
| Traceability | Required document set and completion matrix | Complete |
| Full regression | 120 suites/893 tests, lint, 5/5 evaluation, two zero-vulnerability dependency audits, and positive five-secret release verification | Complete |
| MongoDB pool | Validated 20-socket per-process cap, zero idle minimum, two connection establishments, idle retirement, five-second wait queue, and listener-stable real-Mongo reconnect | Complete locally |
| Authentication activity | Every request still validates the credential and principal; a 100-request real-Mongo profile reduced non-audit presence writes from 200 to two through active-only atomic five-minute touches | Complete locally |
| Portfolio scale | Real mission-control path over 60 boards/15,000 cards; bounded output/evidence, exact compound index, 1.98 s cold, 1,021.1 ms measured p95, no provider writes | Complete locally |
| Multi-instance jobs | Unit coverage plus disposable MongoDB 7 simultaneous acquisition, token, release, and expiry verification | Complete locally |
| API contract | `/api/v1` envelope, request correlation, dashboard parser, HAI OpenAPI, live demo HTTP matrix, and compatibility tests | Complete locally |
| Feature rollouts | Four optional workloads, deterministic subjects, optimistic revisions, bounded cache/history, manager UI, 40-collection real-Mongo verification, and live fail-closed behavior | Complete locally; hosted manager acceptance pending |
| Data integrity and repair | Bounded dry-run/apply, review-only unsafe findings, all-workspace Trello index migration, audit evidence, and disposable MongoDB verification | Complete locally |
| Data retention | Owner-only opt-in policy, bounded preview/apply, protected evidence, distributed lease, indexed queries, pre/post audits, real MongoDB proof, and live browser flow | Complete locally |
| Windows package | 2.3.32 NSIS build, demo diagnostics/HAI smoke, metadata, SHA-256, 13 source-identical changed runtime modules, repeatable resource sample, and clean close | Complete locally; publisher signing external |
| Fresh clone | 2.3.31 exact source `9c1cacc51f9b8f586a3d6a2aa25bb71813db499e`; Node 24 quality and Windows installer jobs in run `31758359073` | Complete |
| Browser and Windows UI | Demand-loaded English/Dutch operational renderers plus the completed operations backlog; ENH-031 filtering and desktop/390 px containment passed in the in-app Browser | Complete for these flows; screen-reader/clean-VM evidence pending |
| HAI and ngrok | Least-privilege HAI contract, HTTP smoke, fail-closed ngrok adapter, strict listener validation, exact runtime origin admission, and restart-safe URL cleanup | Complete locally; live credentials external |
| GitHub CI | 2.3.31 run `31758359073` passed both jobs; artifact `9203646859` was downloaded and independently checked | Complete |
| Live providers | Organization-owned Trello/provider acceptance | External blocker |
| Production deployment | Hosting, secrets, backup restore, canary, rollback | External blocker |
| Signed installer | Publisher certificate | External blocker |

## 2026-08-14 - Runtime scheduler lifecycle release checkpoint

- Release: 2.3.32
- Scope: make every recurring workload idempotent, restartable, invalid-cron fail-closed, and observable without uncaught scheduler errors; complete partial-startup and ordinary shutdown cleanup across all workers, ngrok, HTTP, and MongoDB.
- Security boundary: scheduler logs and persisted Job Health failures redact bearer/basic credentials, credential-bearing URLs, Trello query keys, and JSON-style secrets while retaining stable job and error-code evidence.
- Verification: lint; 120 suites/893 tests; 5/5 safety evaluation; two zero-vulnerability audits; positive five-secret production validation; cold startup; disposable real-Mongo 15,000-card profile; in-app Browser desktop/390 px acceptance; HAI HTTP contract; and packaged Windows behavior/source parity.
- Installer: `release/Sneup-Setup-2.3.32.exe`, 109,490,159 bytes, unsigned, SHA-256 `6E672DD0AF9EF23A2B52284992217AB37D879285B24B0C2D1749E75BE871E584`.
- External gates remain: live provider/ngrok/HAI acceptance, production deployment and restore, publisher signing, clean-VM scaling, and assistive-technology certification.

## 2026-08-14 - Ngrok browser-lifecycle release checkpoint

- Release: 2.3.31
- Scope: safely admit the exact runtime ngrok origin for authenticated browser workflows, reject unsafe listener URLs, serialize tunnel starts, and clean up Sneup-owned public/callback URLs across shutdown and restart.
- Verification: lint; 117 suites/884 tests; 5/5 safety evaluation; two zero-vulnerability audits; positive five-secret production validation; cold startup; disposable real-Mongo 15,000-card profile; in-app Browser desktop/390 px acceptance; HAI HTTP contract; and packaged Windows behavior/source parity.
- Installer: `release/Sneup-Setup-2.3.31.exe`, 109,488,324 bytes, unsigned, SHA-256 `73BAEE77A86E9CE26E474DEF8660536167AAAFAAF8B72367E1F8698B79AFBF15`.
- GitHub: source `9c1cacc51f9b8f586a3d6a2aa25bb71813db499e`; run `31758359073`; quality 1 minute 8 seconds; Windows package 2 minutes 10 seconds; independently verified artifact `9203646859`.
- External gates remain: live provider/ngrok/HAI acceptance, production deployment and restore, publisher signing, clean-VM scaling, and assistive-technology certification.

## 2026-08-14 - Ambiguous-Trello-write release checkpoint

- Release: 2.3.30
- Scope: enforce bounded Trello transport settings and preserve exact confirmed, pending, and reconciliation evidence whenever a provider write result is not definitive.
- Safety boundary: ambiguous writes stay claimed for manual reconciliation; Sneup never auto-retries them, while definitive provider validation failures retain the ordinary failed state.
- Verification: lint; 116 suites/878 tests; 5/5 safety evaluation; two zero-vulnerability audits; production-secret separation; cold startup; disposable real-Mongo 15,000-card profile; in-app Browser English/Dutch acceptance; HAI HTTP contract; and packaged Windows behavior/source parity.
- Installer: `release/Sneup-Setup-2.3.30.exe`, 109,487,238 bytes, unsigned, SHA-256 `502DCF6BD59543A9148C3451DAC6FC8CD9E610B156220BBEE41DC6DEBBF5AA27`.
- GitHub: source `eac5a368dba90fcda2a17d63969dc523a5bd4c13`; run `31756362949`; quality 56 seconds; Windows package 2 minutes 52 seconds; independently verified artifact `9202903661`.
- External gates remain: live provider/ngrok/HAI acceptance, production deployment and restore, publisher signing, clean-VM scaling, and assistive-technology certification.

## 2026-08-14 - Bounded database-pool release checkpoint

- Release: 2.3.29
- Scope: bound MongoDB sockets, idle retention, simultaneous connection establishment, wait queues, and connection/listener lifecycle for each standalone or cloud Sneup process.
- Verification: lint; 113 suites/862 tests; 5/5 safety evaluation; two zero-vulnerability audits; production-secret separation; disposable real-Mongo 100-read/reconnect profile; 15,000-card profile; in-app Browser; HAI HTTP contract; and packaged Windows behavior/source parity.
- Installer: `release/Sneup-Setup-2.3.29.exe`, 109,485,792 bytes, unsigned, SHA-256 `CCBC1B7C8A7BA15F5B15DC8DEAAD4EB23A00D9303994379238ABBD88F15D95FA`.
- External gates remain: live provider/ngrok/HAI acceptance, production deployment and restore, publisher signing, clean-VM scaling, and assistive-technology certification.

## 2026-08-14 - Authentication-activity release checkpoint

- Release: 2.3.28
- Scope: eliminate per-request writes for non-audit authentication activity metadata without caching or weakening credential authorization.
- Safety boundary: API/session hashes, expiry, revocation, user status, role, permissions, and workspace are still resolved on every request. Atomic touches require the token/user to remain active.
- Verification: lint; 112 suites/855 tests; 5/5 recommendation evaluation; two zero-vulnerability audits; five-secret production validation; disposable real-Mongo 100-request profile; 15,000-card portfolio profile; in-app Browser desktop/responsive QA; packaged Windows metadata, diagnostics, HAI, resource, clean-close, and source-parity checks.
- Installer: `release/Sneup-Setup-2.3.28.exe`, 109,485,088 bytes, unsigned, SHA-256 `43F1B9587E3293E35FD0BD7C369CFB660063805B72871DF7E9034879EF6B666D`.
- External gates remain: live provider/ngrok/HAI acceptance, production deployment and restore, publisher signing, clean-VM scaling, and assistive-technology certification.

## 2026-08-13 - Workspace-invitation release checkpoint

- Release: 2.3.27
- Scope: demand-loaded invitation create/resend/revoke/accept UI, inline retry, duplicate-submit guards, secure-link-before-refresh behavior, and truthful separation of server commit, session persistence, and workspace reload outcomes.
- Authority boundary: exact authenticated calls and bodies, session-token storage, and workspace reload verification remain in `public/app.js`; `public/workspaceView.js` has no fetch, credential, cookie, session, storage, or provider authority.
- Verification: lint; 112 suites/854 tests; 5/5 recommendation evaluation; two zero-vulnerability audits; five-secret production check; real-Mongo portfolio profile; in-app Browser English/Dutch acceptance; Windows package verification.
- Installer: `release/Sneup-Setup-2.3.27.exe`, 109,484,457 bytes, unsigned, SHA-256 `6BF9B9918DD5B3B494504964B7620337A530B86B59301BFEE3901857FF53B1E4`.
- GitHub: source `2acbc2bc5aa9e238031db736321c2dc9ff53ebb5`; run `31677406698`; quality 1 minute 12 seconds; Windows package 2 minutes 28 seconds; independently verified artifact `9172127189`.
- External gates remain: authorized live Trello/ngrok/HAI/provider acceptance, production-like restore and deployment rollback, publisher signing, clean-VM scaling, and assistive-technology certification.

## 2026-08-09 - First-run setup release checkpoint

- Release: 2.3.26
- Scope: demand-loaded browser/desktop setup, authoritative startup-mode persistence, retryable failed saves, truthful post-commit restart failure, stale diagnostics cancellation, and duplicate-action guards.
- Authority boundary: diagnostics API access, desktop IPC, local completion state, exact startup preference persistence, and connector navigation remain in `public/app.js`; `public/setupView.js` has no fetch, token, cookie, session, storage, or desktop authority.
- Verification: lint; 112 suites/849 tests; 5/5 recommendation evaluation; two zero-vulnerability audits; five-secret production check; real-Mongo portfolio profile; in-app Browser English/Dutch acceptance; Windows package verification.
- Installer: `release/Sneup-Setup-2.3.26.exe`, 109,483,564 bytes, unsigned, SHA-256 `6A005D09AEB71E6D15D9E1AC460DCA6D0F5405D35E3A4F9A7F0BF675962B6E7C`.
- GitHub: source `02632fd2ddf1fd034c830d61bfbdf2b5833eff71`; run `31336994293`; quality 56 seconds; Windows package 1 minute 59 seconds; independently verified artifact `9044650169`.
- External gates remain: authorized live Trello/ngrok/HAI/provider acceptance, production-like restore and deployment rollback, publisher signing, clean-VM scaling, and assistive-technology certification.

## 2026-08-09 - Notification-policy release checkpoint

- Release: 2.3.25
- Scope: daily brief schedule preservation, server-side activation confirmation, and demand-loaded policy create/edit/status/test controls with duplicate-action and post-commit truthfulness guards.
- Authority boundary: exact request bodies, encoded routes, authenticated writes, encrypted destinations, and provider authority remain in `public/app.js`; `public/approvalView.js` has no fetch, token, cookie, session, or storage authority.
- Verification: lint; 111 suites/843 tests; 5/5 recommendation evaluation; two zero-vulnerability audits; five-secret production check; real-Mongo portfolio profile; in-app Browser English/Dutch acceptance; Windows package verification.
- Installer: `release/Sneup-Setup-2.3.25.exe`, 109,482,700 bytes, unsigned, SHA-256 `E4D290CA4FAFC9762017BF2E370E42549EAE626ED18D464B0FE008CDD908D165`.
- GitHub: source `f2c6bc854739ead5d800a471468bc009a6d6604d`; run `31335440803`; quality 1 minute 12 seconds; Windows package 2 minutes 11 seconds; independently verified artifact `9044199111`.
- External gates remain: authorized live Trello/ngrok/HAI/provider acceptance, production-like restore and deployment rollback, publisher signing, clean-VM scaling, and assistive-technology certification.

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
