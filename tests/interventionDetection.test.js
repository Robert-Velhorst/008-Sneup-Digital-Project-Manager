const Card = require('../src/models/Card');
const Member = require('../src/models/Member');
const interventionEngine = require('../src/services/interventionEngine');

describe('intervention detection', () => {
  afterEach(() => jest.restoreAllMocks());

  test('detects stuck work from the persisted list duration and list average', async () => {
    const card = {
      timeInCurrentList: 73,
      listId: { name: 'Review', averageTimeInList: 24 }
    };

    await expect(interventionEngine.isCardStuck(card)).resolves.toBe(true);
    expect(interventionEngine.generateStuckCardMessage(card)).toContain('Review');
    expect(interventionEngine.generateStuckCardMessage(card)).toContain('3 day(s)');
  });

  test('detects stale work from the persisted Trello activity timestamp', async () => {
    const staleCard = { lastActivity: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000) };
    const activeCard = { lastActivity: new Date(Date.now() - 24 * 60 * 60 * 1000) };

    await expect(interventionEngine.hasNoRecentActivity(staleCard)).resolves.toBe(true);
    await expect(interventionEngine.hasNoRecentActivity(activeCard)).resolves.toBe(false);
  });

  test('counts only blocked dependents with an exact linked Trello card identifier', async () => {
    const countDocuments = jest.spyOn(Card, 'countDocuments').mockResolvedValue(2);
    const card = {
      _id: 'card-record-1',
      boardId: 'board-1',
      workspaceId: 'workspace-1',
      name: 'Launch approval',
      shortLink: 'Ab12Cd34',
      url: 'https://trello.com/c/Ab12Cd34/launch-approval'
    };

    await expect(interventionEngine.getBlockingCount(card)).resolves.toBe(2);
    expect(countDocuments).toHaveBeenCalledWith(expect.objectContaining({
      workspaceId: 'workspace-1',
      closed: false,
      _id: { $ne: 'card-record-1' },
      'labels.name': /^blocked$/i,
      'attachments.linkedCardShortLink': { $in: ['Ab12Cd34'] }
    }));
  });

  test('does not run a description scan when a legacy card has no stable Trello link', async () => {
    const countDocuments = jest.spyOn(Card, 'countDocuments');

    await expect(interventionEngine.getBlockingCount({
      workspaceId: 'workspace-1',
      name: 'A title that may appear in unrelated cards'
    })).resolves.toBe(0);
    expect(countDocuments).not.toHaveBeenCalled();
  });

  test('selects a substantially less-loaded specialty match for reassignment', async () => {
    const lean = jest.fn().mockResolvedValue([
      { _id: 'member-low', assignedCards: ['one'], specialties: ['design'] },
      { _id: 'member-specialist', assignedCards: ['one', 'two'], specialties: ['frontend'] },
      { _id: 'member-too-busy', assignedCards: ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'], specialties: ['frontend'] }
    ]);
    const select = jest.fn().mockReturnValue({ lean });
    jest.spyOn(Member, 'find').mockReturnValue({ select });

    const target = await interventionEngine.findBestReassignmentTarget({
      boardId: 'board-1',
      workspaceId: 'workspace-1',
      labels: [{ name: 'Frontend' }]
    }, {
      _id: 'member-current',
      assignedCards: new Array(10).fill('card')
    });

    expect(target._id).toBe('member-specialist');
    expect(select).toHaveBeenCalledWith('_id specialties assignedCards');
  });

  test('does not recommend reassignment without a meaningfully less-loaded teammate', async () => {
    const lean = jest.fn().mockResolvedValue([
      { _id: 'member-near-capacity', assignedCards: new Array(8).fill('card'), specialties: ['frontend'] }
    ]);
    jest.spyOn(Member, 'find').mockReturnValue({
      select: jest.fn().mockReturnValue({ lean })
    });

    await expect(interventionEngine.findBestReassignmentTarget({
      boardId: 'board-1',
      workspaceId: 'workspace-1',
      labels: []
    }, {
      _id: 'member-current',
      assignedCards: new Array(10).fill('card')
    })).resolves.toBeNull();
  });

  test('reports the member workload count instead of serializing assigned card identifiers', () => {
    expect(interventionEngine.generateOverloadedMessage({ assignedCards: ['card-1', 'card-2'] }, 1.5))
      .toContain('2 cards assigned');
  });
});
