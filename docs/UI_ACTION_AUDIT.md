# UI Action Audit

- The 2.3.10 in-app Browser setup flow passed at desktop and narrow mobile breakpoints. All eight runtime checks rendered, **Check again** completed, status rows did not overlap, no horizontal overflow appeared, the shared drawer resolved as a labelled modal dialog, and the console remained free of warnings and errors.

## Method

The command-center HTML and JavaScript were statically searched for controls, event delegation, API calls, loading states, permissions, and demo boundaries. Existing browser regression captures and UI assertions cover the command palette, forecast scenarios, policy controls, notifications, reports, connectors, workspace identity, and operations ledgers.

## Result

- The command center contains 199 button/action/accessible-label declarations and uses stable delegated handlers for dynamic rows.
- Destructive or external actions are permission checked and represented as explicit commands. Trello execution is separated from recommendation approval.
- Demo mode is visible and read-only. Provider connection and write success are not simulated.
- Busy, empty, error, stale, and permission-denied states exist for the major operational views.
- Keyboard command navigation and focused actions are present; compact controls use labels/tooltips where needed.
- Command-center JSON actions route through `/api/v1` and one parser, so surfaced failures share a bounded message and support request ID without exposing logs or route-private context.

## Executed browser and Windows evidence

- In-app browser QA loaded `Sneup Command Center`, opened `Review approvals`, rendered the decision queue, recommendation payload, findings, timeline, action attempts, follow-ups, accountability, outcomes, and audit trail, and opened the read-only card-ledger modal.
- The browser console remained free of errors and warnings during the overview, approval, modal, and responsive checks.
- The browser's constrained responsive viewport reported equal client and scroll widths with no document-level horizontal overflow.
- The final packaged Electron app launched on Windows 11 at device scale factor `1.5`. Renderer-native measurement reported `clientWidth = scrollWidth = 1411`, four stable metric columns, and a main/view right edge inside the viewport.
- Renderer-native capture confirmed all seven metrics, the complete toolbar, Operations Brief, and Job Health render without clipping or overlap.
- The NSIS installer opened as `Sneup Setup`, showed version `2.1.0`, offered current-user/all-user installation scope, and exposed functional `Next` and `Cancel` controls. It was closed without modifying the machine.
- The 2.2.0 packaged executable exposed the real `Sneup Command Center` window, remained available after startup, returned healthy explicit demo state on loopback, and closed normally without leaving port 3197 open. The in-app Browser webview did not attach for the current rendering rerun, so the earlier browser layout evidence is retained as prior-release evidence rather than silently relabelled as 2.2.0 evidence.
- The 2.3.0 workspace control includes an owner-only archived-workspace deletion command, an exact-slug and irreversible-action confirmation modal, disabled live-state boundaries, identity cleanup after success, and a receipt display. Static wiring tests pass, while current visual Browser evidence remains pending because the in-app webview did not attach.
- The 2.3.2 packaged command-center window remained open through metadata, health, readiness, HAI manifest, and corrected HAI snapshot identifier checks and closed without leaving port 3197 open.
- A forced packaged live-database outage opened `Sneup live workspace is unavailable`, exposed `Start demo mode` and `Close Sneup`, displayed only the stable safe explanation, kept port 3197 closed, and exited cleanly.
- Windows exposed the `Sneup Setup` window from `Sneup-Setup-2.3.2.exe`; it was closed normally without installing or changing the machine.
- The 2.3.3 packaged Job Health response exposed zero active/contended leases in explicit demo mode; live Job Health can display active protected runs, skipped contention, and disables a conflicting manual trigger without exposing lease identity.
- The 2.3.3 packaged command center, fail-closed recovery dialog, and `Sneup Setup` window opened and closed normally without leaving a Sneup process or port 3197 listener.
- For 2.3.4, the exact installer and `Sneup Command Center` windows opened, the packaged demo passed legacy/versioned/readiness/jobs/HAI checks, and normal close released every Sneup process and port 3197. A forced live-database outage showed the safe recovery title, did not listen on port 3197, and also closed normally.
- The requested in-app Browser connected on two fresh tabs but its webview did not attach. Computer Use found the exact packaged window but its runtime failed while returning window state. The live 12-route demo HTTP matrix and static UI wiring passed, while current rendered capture remains explicitly pending.
- For 2.3.5, `Sneup Command Center`, the stable live-database recovery window, and the exact `Sneup Setup` dialog opened and closed normally. Packaged readiness, version, four rollout controls, bounded cache metadata, HAI rollout/OpenAPI behavior, fail-closed port state, process cleanup, and port release passed. The in-app Browser again failed to attach on two fresh tabs, and the installed Windows-control package lacked its required guidance interface, so current rendered administration evidence remains pending rather than inferred.
- For 2.3.6, the in-app Browser again failed to attach on two fresh tabs, then the documented local Playwright fallback loaded Workspace Administration at 1440x1000 and 390x844 with zero console warnings/errors. It rendered empty and two-finding integrity states, opened the explicit no-provider-write repair confirmation, repaired both seeded derived-state faults, and rendered the zero-finding result without clipping or horizontal overflow in the integrity panel.
- For 2.3.7, the in-app Browser webview failed to attach, then the connected Chrome browser completed the live retention flow. It previewed two due categories, showed protected evidence at the decision point, required the exact workspace slug, pruned 2/2 disposable records, and rescanned to zero. Desktop and constrained mobile measurements found no retention-panel overflow or policy-modal control overlap, and the browser console had no warnings or errors.
- For 2.3.19, the in-app Browser proved the approval module is absent on Overview and loads once with the shared fingerprint when Approvals opens. English/Dutch queues, exact source evidence, exact payload JSON, Robert filtering, read-only workspace safety, and calibrated compact containment passed with no current console warnings/errors. The subsequent view-specific catalog relocation passed focused DOM and static registration regressions; it was not silently relabelled as a second rendered browser run.
- For 2.3.22, the in-app Browser proved `workspaceView.js` is absent on Overview and loads exactly once with the app fingerprint after Workspaces opens. English and Dutch read-only demo rendering, no mutation controls, zero visible dialogs, no horizontal overflow, and zero current console warnings/errors passed. Seeded DOM tests cover all five protected form variants because demo mode correctly does not fabricate mutation permissions.
- For 2.3.23, the in-app Browser proved `connectorView.js` is absent on Overview and loads exactly once with the app fingerprint after Connectors opens. All 117 entries rendered; English/Dutch chrome, the four explicit catalog-only providers, no horizontal overflow, and zero current console errors passed. Seeded DOM tests cover all ten linked-account selection forms because demo mode correctly does not fabricate provider accounts.
- For 2.3.24, the in-app Browser again proved `connectorView.js` is absent on Overview and loads exactly once with the app fingerprint after Connectors opens. All 117 entries rendered in Dutch, no worker-response form was fabricated without a connected Generic Webhook account, no visible dialog or horizontal overflow appeared, and the console reported zero current errors. Seeded DOM tests cover the protected editor's English/Dutch rendering, escaping, search races, cleanup, validation, duplicate-submit lock, exact body, retry, and post-commit refresh behavior.

## Open UI evidence

- A full keyboard-only and screen-reader pass has not been certified.
- English/Dutch localization covers the shell, setup, command palette, contextual help, primary mission control, connector marketplace, workspace administration, approval ledger, Work Signals, Forecasts, Reports, and consequential workspace form/modal surfaces. Provider, user, audit, free-text, error, identifier, and payload evidence remains verbatim by design.
- Windows 125% and 200% scaling still need a clean-VM acceptance pass; 150% passed locally in the packaged app.
- Live OAuth consent and real provider error pages require authorized accounts.

These gaps are release evidence gaps, not silently accepted conformance claims.
## 2.3.20 Work Signals browser evidence

- In-app Browser opened the real local `Sneup Command Center`, confirmed Overview did not load the Work Signals module, then opened Signals and observed exactly one `workSignalsView.js` request with the same content fingerprint as `app.js`.
- The screen rendered nonblank metrics, the 117-provider adapter contract catalog, local status filtering, and the expected empty normalized-signal state in explicit demo mode.
- Switching to Nederlands reloaded the app and rendered Dutch page, metric, filter, empty-state, and adapter-contract chrome while leaving `Trello` and the provider safe-write evidence sentence byte-for-byte unchanged.
- The interaction pass found no framework error overlay, document-level horizontal overflow, console warning, or console error.
- Focused DOM tests cover seeded graph metrics, provider/type/direction filters, graph detail, guarded decision and dependency delegation, exact evidence, and unsafe-link inertness. The current demo dataset does not invent graph rows for visual testing.

## 2.3.21 Forecasts and Reports browser evidence

- In-app Browser opened the real local command center and confirmed neither deferred module loaded on Overview.
- Opening Forecasts loaded exactly one fingerprinted `forecastView.js`; Dutch and English metrics, cards, modes, and analysis-only notices rendered while risks and assumptions remained verbatim.
- Opening Reports loaded exactly one fingerprinted `reportView.js`; four reports rendered with localized operator chrome and unchanged report labels, and both modules reused the same fingerprint as `app.js`.
- The interaction pass found no framework error overlay, document-level horizontal overflow, console warning, or console error.
- Focused DOM tests cover scenario, capacity, and project-mapping forms plus guarded action/download delegation. Demo mode intentionally exposes no capacity mutation buttons, so those protected forms were not fabricated for visual testing.
