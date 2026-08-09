# Codex Checkpoints

| Gate | Evidence | State |
| --- | --- | --- |
| Source understood | 124 pages, phases 000-115, appendix artifacts | Complete |
| Baseline preserved | Started at `470d0a35ca712a3c12473a5c8cccb2118092d3ed`; unrelated untracked files untouched | Complete |
| Operational controls | Doctor, readiness, support bundle, emergency stop | Complete |
| Focused verification | Runtime/security tests and lint | Complete |
| Traceability | Required document set and completion matrix | Complete |
| Full regression | 86 suites/704 tests, lint, 5/5 evaluation, two zero-vulnerability dependency audits, and positive five-secret release verification | Complete |
| Multi-instance jobs | Unit coverage plus disposable MongoDB 7 simultaneous acquisition, token, release, and expiry verification | Complete locally |
| API contract | `/api/v1` envelope, request correlation, dashboard parser, HAI OpenAPI, live demo HTTP matrix, and compatibility tests | Complete locally |
| Feature rollouts | Four optional workloads, deterministic subjects, optimistic revisions, bounded cache/history, manager UI, 40-collection real-Mongo verification, and live fail-closed behavior | Complete locally; hosted manager acceptance pending |
| Windows package | 2.3.5 NSIS build, installer window, demo and fail-closed live startup, native ngrok binding, metadata, SHA-256, idle sample, and clean close | Complete locally; publisher signing external |
| Fresh clone | 2.3.5 Node 24 quality and Windows installer jobs | Pending current GitHub run; 2.3.4 baseline remains green in run 31298559390 |
| Browser and Windows UI | Prior approval/modal/responsive pass; current packaged demo, fail-closed recovery, metadata, health, HAI, and clean-close pass; current Browser and Computer Use capture bridges failed to return rendered state | Partial: current rendered capture pending |
| HAI and ngrok | Least-privilege HAI contract, HTTP smoke, fail-closed ngrok adapter | Complete locally; live credentials external |
| GitHub CI | 2.3.5 source run pending; 2.3.4 source 47e6d5d remains green with artifact 9033774213 | Pending current release proof |
| Live providers | Organization-owned Trello/provider acceptance | External blocker |
| Production deployment | Hosting, secrets, backup restore, canary, rollback | External blocker |
| Signed installer | Publisher certificate | External blocker |
