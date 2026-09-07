const { spawnSync } = require('node:child_process');
const path = require('node:path');
const Recommendation = require('../src/models/Recommendation');
const Attempt = require('../src/models/TrelloActionAttempt');
const service = require('../src/services/operationsLedgerService');

afterEach(() => jest.restoreAllMocks());

test.each([Recommendation, Attempt])('%s rejects stale document saves', Model => {
  expect(Model.schema.options.optimisticConcurrency).toBe(true);
});

test('reconciliation commit rejects a definite compare-and-set conflict without claiming recovery', async () => {
  const Model = { findOneAndUpdate: jest.fn().mockResolvedValue(null) };
  const recover = jest.spyOn(service, 'recoverLedgerCommit');
  await expect(service.commitReconciliationState(Model, { __v: 1 }, { $set: { status: 'failed' } }, {}))
    .rejects.toMatchObject({ statusCode: 409, code: 'SNEUP_RECONCILIATION_CONFLICT' });
  expect(recover).not.toHaveBeenCalled();
});

test('uncertain reconciliation write uses exact commit proof', async () => {
  const Model = { findOneAndUpdate: jest.fn().mockRejectedValue(new Error('Lost acknowledgement')) };
  const proof = { workspaceId: 'workspace', 'reconciliationDecision.finalizationId': 'unique-finalizer' };
  const receipt = { status: 'failed' };
  const recover = jest.spyOn(service, 'recoverLedgerCommit').mockResolvedValue(receipt);
  await expect(service.commitReconciliationState(Model, { __v: 1 }, { $set: { status: 'failed' } }, proof)).resolves.toBe(receipt);
  expect(recover).toHaveBeenCalledWith(Model, proof);
});

test.each(['', 'mongodb://127.0.0.1:1/sneup', `mongodb://127.0.0.1:1/sneup_reconciliation_verification_${'a'.repeat(64)}`])
('the verifier refuses unsafe database targets before connecting: %s', uri => {
  const result = spawnSync(process.execPath, [path.join(__dirname, '../scripts/verify-trello-reconciliation.js')], {
    env: { ...process.env, SNEUP_RECONCILIATION_VERIFICATION_MONGO_URI: uri }, encoding: 'utf8', timeout: 10000
  });
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain('must target a dedicated sneup_reconciliation_verification_* database');
});
