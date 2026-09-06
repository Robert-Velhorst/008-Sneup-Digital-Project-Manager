const { BoardHealthSnapshotService, MAX_LIMIT } = require('../src/services/boardHealthSnapshotService');

const aggregateResult = (rows) => ({
  option: jest.fn().mockResolvedValue(rows)
});

describe('board health snapshot service', () => {
  test('bounds initialization without cancelling it and permits a later read', async () => {
    jest.useFakeTimers();
    let finishInitialization;
    const initializing = new Promise(resolve => { finishInitialization = resolve; });
    const model = {
      init: jest.fn(() => initializing),
      aggregate: jest.fn(() => aggregateResult([])),
      populate: jest.fn().mockResolvedValue([])
    };
    const service = new BoardHealthSnapshotService({ BoardHealthSnapshot: model, queryTimeoutMs: 100 });
    const result = service.listLatestByBoard({ workspaceId: 'workspace-1' }).catch(error => error);
    try {
      await jest.advanceTimersByTimeAsync(100);
      const state = await Promise.race([result, Promise.resolve('still pending')]);
      expect(state).toMatchObject({ code: 'SNEUP_BOARD_HEALTH_INITIALIZATION_TIMEOUT' });
      expect(model.aggregate).not.toHaveBeenCalled();
      finishInitialization();
      await expect(service.listLatestByBoard({ workspaceId: 'workspace-1' })).resolves.toEqual([]);
    } finally {
      finishInitialization();
      await result;
      jest.useRealTimers();
    }
  });

  test('selects one latest snapshot per board before applying the bounded risk-first limit', async () => {
    const aggregate = aggregateResult([
      { _id: 'health-critical', boardId: 'board-critical', healthStatus: 'critical' },
      { _id: 'health-watch', boardId: 'board-watch', healthStatus: 'watch' }
    ]);
    const model = {
      init: jest.fn().mockResolvedValue(undefined),
      aggregate: jest.fn().mockReturnValue(aggregate),
      populate: jest.fn(async rows => rows.map(row => ({ ...row, populated: true })))
    };
    const service = new BoardHealthSnapshotService({ BoardHealthSnapshot: model, queryTimeoutMs: 2400 });

    const result = await service.listLatestByBoard({ workspaceId: 'workspace-1', limit: 20 });

    expect(result).toEqual([
      expect.objectContaining({ _id: 'health-critical', populated: true }),
      expect.objectContaining({ _id: 'health-watch', populated: true })
    ]);
    const pipeline = model.aggregate.mock.calls[0][0];
    const groupIndex = pipeline.findIndex(stage => stage.$group);
    const limitIndex = pipeline.findIndex(stage => stage.$limit);
    expect(pipeline[0]).toEqual({ $match: { workspaceId: 'workspace-1' } });
    expect(pipeline[1]).toEqual({ $sort: { boardId: 1, generatedAt: -1 } });
    expect(pipeline[groupIndex]).toEqual({
      $group: { _id: '$boardId', snapshot: { $first: '$$ROOT' } }
    });
    expect(groupIndex).toBeLessThan(limitIndex);
    expect(pipeline[limitIndex]).toEqual({ $limit: 20 });
    expect(pipeline).toContainEqual({ $sort: { _sneupHealthRank: -1, generatedAt: -1 } });
    expect(aggregate.option).toHaveBeenCalledWith({
      hint: { workspaceId: 1, boardId: 1, generatedAt: -1 },
      maxTimeMS: 2400
    });
    expect(model.populate).toHaveBeenCalledWith(expect.any(Array), {
      path: 'boardId',
      select: 'name trelloId url closed'
    });
  });

  test('rejects an unscoped query and bounds an excessive result request', async () => {
    const aggregate = aggregateResult([]);
    const model = {
      init: jest.fn().mockResolvedValue(undefined),
      aggregate: jest.fn().mockReturnValue(aggregate),
      populate: jest.fn().mockResolvedValue([])
    };
    const service = new BoardHealthSnapshotService({ BoardHealthSnapshot: model });

    await expect(service.listLatestByBoard()).rejects.toMatchObject({
      code: 'SNEUP_BOARD_HEALTH_WORKSPACE_REQUIRED'
    });
    await service.listLatestByBoard({ workspaceId: 'workspace-1', limit: MAX_LIMIT + 1 });

    expect(model.aggregate.mock.calls[0][0]).toContainEqual({ $limit: 100 });
  });

  test('waits for model index initialization before issuing the hinted aggregate', async () => {
    let finishInitialization;
    const initializing = new Promise(resolve => { finishInitialization = resolve; });
    const model = {
      init: jest.fn(() => initializing),
      aggregate: jest.fn(() => aggregateResult([])),
      populate: jest.fn().mockResolvedValue([])
    };
    const service = new BoardHealthSnapshotService({ BoardHealthSnapshot: model });
    const pending = service.listLatestByBoard({ workspaceId: 'workspace-1' });
    try {
      expect(model.aggregate).not.toHaveBeenCalled();
      finishInitialization();
      await expect(pending).resolves.toEqual([]);
      expect(model.aggregate).toHaveBeenCalledTimes(1);
    } finally {
      finishInitialization();
      await pending;
    }
  });

  test('does not query with a missing index when initialization fails', async () => {
    const error = new Error('Index initialization failed');
    const model = {
      init: jest.fn().mockRejectedValue(error),
      aggregate: jest.fn(() => aggregateResult([])),
      populate: jest.fn().mockResolvedValue([])
    };
    const service = new BoardHealthSnapshotService({ BoardHealthSnapshot: model });
    await expect(service.listLatestByBoard({ workspaceId: 'workspace-1' })).rejects.toBe(error);
    expect(model.aggregate).not.toHaveBeenCalled();
  });
});
