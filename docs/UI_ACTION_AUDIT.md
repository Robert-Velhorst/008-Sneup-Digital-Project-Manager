# UI Action Audit

## Method

The command-center HTML and JavaScript were statically searched for controls, event delegation, API calls, loading states, permissions, and demo boundaries. Existing browser regression captures and UI assertions cover the command palette, forecast scenarios, policy controls, notifications, reports, connectors, workspace identity, and operations ledgers.

## Result

- The command center contains 199 button/action/accessible-label declarations and uses stable delegated handlers for dynamic rows.
- Destructive or external actions are permission checked and represented as explicit commands. Trello execution is separated from recommendation approval.
- Demo mode is visible and read-only. Provider connection and write success are not simulated.
- Busy, empty, error, stale, and permission-denied states exist for the major operational views.
- Keyboard command navigation and focused actions are present; compact controls use labels/tooltips where needed.

## Open UI evidence

- A full keyboard-only and screen-reader pass has not been certified.
- Dutch localization is not implemented.
- Windows scaling at 125%, 150%, and 200% still needs a clean-VM acceptance pass.
- Live OAuth consent and real provider error pages require authorized accounts.

These gaps are release evidence gaps, not silently accepted conformance claims.
