# Codex Checkpoints

| Gate | Evidence | State |
| --- | --- | --- |
| Source understood | 124 pages, phases 000-115, appendix artifacts | Complete |
| Baseline preserved | Started at `470d0a35ca712a3c12473a5c8cccb2118092d3ed`; unrelated untracked files untouched | Complete |
| Operational controls | Doctor, readiness, support bundle, emergency stop | Complete |
| Focused verification | Runtime/security tests and lint | Complete |
| Traceability | Required document set and completion matrix | Complete |
| Full regression | 83 suites/677 tests, lint, 5/5 evaluation, and two zero-vulnerability dependency audits | Complete |
| Windows package | 2.3.2 NSIS build, installer window, demo and fail-closed live startup, native ngrok binding, metadata, and SHA-256 | Complete, unsigned |
| Fresh clone | 2.3.2 Node 24 quality and Windows installer jobs | Pending exact GitHub run |
| Browser and Windows UI | Prior approval/modal/responsive pass; current packaged demo, fail-closed recovery, metadata, health, HAI, and clean-close pass | Partial: current Browser webview attach pending |
| HAI and ngrok | Least-privilege HAI contract, HTTP smoke, fail-closed ngrok adapter | Complete locally; live credentials external |
| GitHub CI | Local release gates pass; exact 2.3.2 quality and installer artifact run | Pending push |
| Live providers | Organization-owned Trello/provider acceptance | External blocker |
| Production deployment | Hosting, secrets, backup restore, canary, rollback | External blocker |
| Signed installer | Publisher certificate | External blocker |
