# UI Action Audit

## Method

The command-center HTML and JavaScript were statically searched for controls, event delegation, API calls, loading states, permissions, and demo boundaries. Existing browser regression captures and UI assertions cover the command palette, forecast scenarios, policy controls, notifications, reports, connectors, workspace identity, and operations ledgers.

## Result

- The command center contains 199 button/action/accessible-label declarations and uses stable delegated handlers for dynamic rows.
- Destructive or external actions are permission checked and represented as explicit commands. Trello execution is separated from recommendation approval.
- Demo mode is visible and read-only. Provider connection and write success are not simulated.
- Busy, empty, error, stale, and permission-denied states exist for the major operational views.
- Keyboard command navigation and focused actions are present; compact controls use labels/tooltips where needed.

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
- Windows exposed the current `Sneup Setup` window from `Sneup-Setup-2.3.2.exe`; it was closed normally without installing or changing the machine.

## Open UI evidence

- A full keyboard-only and screen-reader pass has not been certified.
- Dutch localization is not implemented.
- Windows 125% and 200% scaling still need a clean-VM acceptance pass; 150% passed locally in the packaged app.
- Live OAuth consent and real provider error pages require authorized accounts.

These gaps are release evidence gaps, not silently accepted conformance claims.
