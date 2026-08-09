# Codex Checkpoints

| Gate | Evidence | State |
| --- | --- | --- |
| Source understood | 124 pages, phases 000-115, appendix artifacts | Complete |
| Baseline preserved | Started at `470d0a35ca712a3c12473a5c8cccb2118092d3ed`; unrelated untracked files untouched | Complete |
| Operational controls | Doctor, readiness, support bundle, emergency stop | Complete |
| Focused verification | Runtime/security tests and lint | Complete |
| Traceability | Required document set and completion matrix | Complete |
| Full regression | 88 suites/711 tests, lint, 5/5 evaluation, two zero-vulnerability dependency audits, and positive five-secret release verification | Complete |
| Multi-instance jobs | Unit coverage plus disposable MongoDB 7 simultaneous acquisition, token, release, and expiry verification | Complete locally |
| API contract | `/api/v1` envelope, request correlation, dashboard parser, HAI OpenAPI, live demo HTTP matrix, and compatibility tests | Complete locally |
| Feature rollouts | Four optional workloads, deterministic subjects, optimistic revisions, bounded cache/history, manager UI, 40-collection real-Mongo verification, and live fail-closed behavior | Complete locally; hosted manager acceptance pending |
| Data integrity and repair | Bounded dry-run/apply, review-only unsafe findings, all-workspace Trello index migration, audit evidence, and disposable MongoDB verification | Complete locally |
| Windows package | 2.3.6 NSIS build, demo/fail-closed smoke, native ngrok binding, metadata, SHA-256, idle sample, and clean close | Complete locally; publisher signing external |
| Fresh clone | 2.3.6 source `2e1f767b287ff572962d583b19f74b676a84718d`; Node 24 quality and Windows installer jobs in run `31302533822` | Complete |
| Browser and Windows UI | Integrity empty/finding/confirmation/success states passed at desktop/mobile with zero console warnings via Playwright fallback after the in-app webview failed twice | Complete for integrity flow; screen-reader/clean-VM evidence pending |
| HAI and ngrok | Least-privilege HAI contract, HTTP smoke, fail-closed ngrok adapter | Complete locally; live credentials external |
| GitHub CI | Run `31302533822`, zero failures/annotations; artifact `9034945692` and downloaded installer hash recorded | Complete |
| Live providers | Organization-owned Trello/provider acceptance | External blocker |
| Production deployment | Hosting, secrets, backup restore, canary, rollback | External blocker |
| Signed installer | Publisher certificate | External blocker |
