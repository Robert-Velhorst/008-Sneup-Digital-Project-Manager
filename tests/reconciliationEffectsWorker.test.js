const ledger = require('../src/services/operationsLedgerService');
const engine = require('../src/services/interventionEngine');
const worker = require('../src/workers/interventionWorker');

afterEach(() => jest.restoreAllMocks());

test('the existing follow-up worker recovers pending effects first and reports failures without skipping normal work', async () => {
  const order = [];
  const recover = jest.spyOn(ledger, 'retryPendingTrelloReconciliations').mockImplementation(async () => {
    order.push('recover');
    return { processedCount: 3, completedCount: 2, failureCount: 1 };
  });
  const due = jest.spyOn(ledger, 'processDueFollowUps').mockImplementation(async () => {
    order.push('due');
    return { markedDue: 4 };
  });
  const process = jest.spyOn(engine, 'processFollowUps').mockImplementation(async () => {
    order.push('queue');
    return ['synthetic'];
  });
  const provider = jest.spyOn(ledger, 'performTrelloAction');
  await expect(worker.processFollowUps('synthetic-workspace')).resolves.toEqual({
    processedCount: 8, successCount: 3, failureCount: 1
  });
  expect(order).toEqual(['recover', 'due', 'queue']);
  for (const call of [recover, due, process]) expect(call).toHaveBeenCalledWith({ workspaceId: 'synthetic-workspace' });
  expect(provider).not.toHaveBeenCalled();
});
