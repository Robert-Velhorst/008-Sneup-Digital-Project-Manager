const { OperationsLedgerService, isAmbiguousTrelloWriteError } = require('../src/services/operationsLedgerService');

describe('ambiguous Trello write reconciliation', () => {
  test.each([
    [{ code: 'ECONNABORTED', message: 'timeout of 15000ms exceeded' }, true],
    [{ code: 'ECONNRESET', message: 'socket hang up' }, true],
    [{ response: { status: 503 }, message: 'Service unavailable' }, true],
    [{ response: { status: 400 }, message: 'Invalid card' }, false],
    [{ code: 'ENOTFOUND', message: 'Host not found' }, false]
  ])('classifies provider result ambiguity without treating every failure as partial', (error, expected) => {
    expect(isAmbiguousTrelloWriteError(error)).toBe(expected);
  });

  test('keeps an approved comment claimed when the provider response times out', async () => {
    const service = new OperationsLedgerService();
    const timeout = Object.assign(new Error('timeout of 15000ms exceeded'), { code: 'ECONNABORTED' });
    const trelloClient = require('../src/services/trelloClient');
    const write = jest.spyOn(trelloClient.cardApi, 'addComment').mockRejectedValue(timeout);

    await expect(service.performTrelloAction({
      actionType: 'comment',
      actionPayload: { cardTrelloId: 'card-1', commentText: 'Please post an update.' }
    })).rejects.toMatchObject({
      code: 'SNEUP_TRELLO_WRITE_RECONCILIATION_REQUIRED',
      requiresReconciliation: true,
      confirmedSteps: [],
      pendingSteps: ['comment_posted']
    });
    expect(write).toHaveBeenCalledTimes(1);
    write.mockRestore();
  });

  test('leaves definitive Trello validation failures as ordinary failures', async () => {
    const service = new OperationsLedgerService();
    const validationError = Object.assign(new Error('Invalid card'), { response: { status: 400 } });
    const trelloClient = require('../src/services/trelloClient');
    const write = jest.spyOn(trelloClient.cardApi, 'moveCard').mockRejectedValue(validationError);

    await expect(service.performTrelloAction({
      actionType: 'move_card',
      actionPayload: { cardTrelloId: 'card-1', targetListId: 'list-2' }
    })).rejects.toBe(validationError);
    write.mockRestore();
  });
});
