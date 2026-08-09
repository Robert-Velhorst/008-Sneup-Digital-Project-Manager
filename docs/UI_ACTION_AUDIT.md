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

## Open UI evidence

- A full keyboard-only and screen-reader pass has not been certified.
- Dutch localization is not implemented.
- Windows 125% and 200% scaling still need a clean-VM acceptance pass; 150% passed locally in the packaged app.
- Live OAuth consent and real provider error pages require authorized accounts.

These gaps are release evidence gaps, not silently accepted conformance claims.
