# Codex Checkpoints

| Gate | Evidence | State |
| --- | --- | --- |
| Source understood | 124 pages, phases 000-115, appendix artifacts | Complete |
| Baseline preserved | Started at `470d0a35ca712a3c12473a5c8cccb2118092d3ed`; unrelated untracked files untouched | Complete |
| Operational controls | Doctor, readiness, support bundle, emergency stop | Complete |
| Focused verification | Runtime/security tests and lint | Complete |
| Traceability | Required document set and completion matrix | Complete |
| Full regression | 81 suites/670 tests, lint, 5/5 evaluation, and dependency audit | Complete |
| Windows package | 2.3.1 NSIS build, installer window, packaged app, native ngrok binding, metadata, and SHA-256 | Complete, unsigned |
| Fresh clone | Current 2.3.1 Node 24 quality and Windows installer jobs | Pending push |
| Browser and Windows UI | Prior approval/modal/responsive pass; current packaged startup/metadata/health/HAI/clean-close pass | Partial: 2.3.1 Browser webview attach pending |
| HAI and ngrok | Least-privilege HAI contract, HTTP smoke, fail-closed ngrok adapter | Complete locally; live credentials external |
| GitHub CI | Prior run `31293249661` passed; current 2.3.1 push | Pending |
| Live providers | Organization-owned Trello/provider acceptance | External blocker |
| Production deployment | Hosting, secrets, backup restore, canary, rollback | External blocker |
| Signed installer | Publisher certificate | External blocker |
