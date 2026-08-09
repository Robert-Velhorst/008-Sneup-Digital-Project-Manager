# Codex Checkpoints

| Gate | Evidence | State |
| --- | --- | --- |
| Source understood | 124 pages, phases 000-115, appendix artifacts | Complete |
| Baseline preserved | Started at `470d0a35ca712a3c12473a5c8cccb2118092d3ed`; unrelated untracked files untouched | Complete |
| Operational controls | Doctor, readiness, support bundle, emergency stop | Complete |
| Focused verification | Runtime/security tests and lint | Complete |
| Traceability | Required document set and completion matrix | Complete |
| Full regression | 78 suites/656 tests, lint, 5/5 evaluation, and dependency audit | Complete |
| Windows package | NSIS build, installer UI, packaged app, native ngrok binding, and SHA-256 | Complete, unsigned |
| Fresh clone | Clean Linux quality and Windows installer runners for `e61c77d` | Complete |
| Browser and Windows UI | Prior approval/modal/responsive pass; current packaged startup/health/clean-close pass | Partial: 2.2.0 Browser webview attach pending |
| HAI and ngrok | Least-privilege HAI contract, HTTP smoke, fail-closed ngrok adapter | Complete locally; live credentials external |
| GitHub CI | Linux quality and Windows installer artifact run `31291606435` | Complete |
| Live providers | Organization-owned Trello/provider acceptance | External blocker |
| Production deployment | Hosting, secrets, backup restore, canary, rollback | External blocker |
| Signed installer | Publisher certificate | External blocker |
