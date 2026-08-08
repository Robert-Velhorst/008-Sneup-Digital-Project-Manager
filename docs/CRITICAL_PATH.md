# Critical Path

## Human outcome

An authorized project manager connects Trello, synchronizes selected work, sees evidence-backed risks, approves a protected action payload, observes one auditable Trello change, and verifies the resulting outcome without duplicate writes.

## Path and gates

1. Configure MongoDB and Trello credentials. `npm run doctor` must have no errors; a live release additionally requires `liveCriticalPathReady: true`.
2. Start Sneup and require `/ready` to return `ready: true`, `mode: live`, and `criticalPathReady: true`.
3. Create or select a workspace and authenticate with a role that has connector and sync permissions.
4. Connect Trello through the connector flow. Credentials are encrypted and never returned by the API.
5. Run bounded sync. Verify boards, cards, comments/checklists represented by the supported Trello adapter, and visible sync health.
6. Run analysis. Confirm a finding includes source evidence and creates an internal recommendation, not a provider action.
7. Review the recommendation payload, risk, expiry, owner, and policy. Approval stores the exact payload snapshot.
8. Execute the approved recommendation. Immediately before the atomic claim Sneup checks the deployment emergency stop and workspace policy.
9. Verify exactly one `TrelloActionAttempt`, provider result, audit event, follow-up, and reconciled state. Ambiguous multi-step writes stay claimed and require operator reconciliation.
10. Verify outcome against later synced evidence. Outcome evaluation never sends a provider write.

## Smoke evidence

- `tests/interventionDetection.test.js`
- `tests/approvalExpiry.test.js`
- `tests/recommendationLearning.test.js`
- `tests/outcomeRefreshWorker.test.js`
- `tests/security.test.js` section `approved Trello action execution safety`
- `tests/runtimeDiagnostics.test.js`

## Stop conditions

Do not execute when `/ready` is not ready, doctor reports errors, the action policy is paused, the payload differs from its approval snapshot, approval expired, an unresolved action attempt exists, or `SNEUP_PROVIDER_WRITES_DISABLED=true`.
