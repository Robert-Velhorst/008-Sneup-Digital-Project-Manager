const autopilotService = require('../src/services/autopilotService');

const DAY_MS = 24 * 60 * 60 * 1000;

const makeCard = (index, overrides = {}) => ({
  _id: `card-${index}`,
  trelloId: `trello-card-${index}`,
  name: `Card ${index}`,
  boardId: { _id: 'board-1', name: 'Portfolio board' },
  listId: { _id: 'list-1', name: 'Doing' },
  members: [],
  due: new Date(Date.now() - DAY_MS),
  dueComplete: false,
  closed: false,
  riskLevel: 'critical',
  riskFactors: ['Delivery risk'],
  labels: [{ name: 'blocked' }],
  checklists: [{ items: [{ complete: true }] }],
  lastActivity: new Date(Date.now() - 7 * DAY_MS),
  ...overrides
});

describe('portfolio-scale bounded ranking', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('materializes evidence only for the ten visible focus items and keeps ties stable', () => {
    const cards = Array.from({ length: 2000 }, (_, index) => makeCard(index));
    const evidence = jest.spyOn(autopilotService, 'buildCardEvidence')
      .mockImplementation(card => [{ entityId: card._id }]);

    const focus = autopilotService.buildFocusQueue(cards);

    expect(focus).toHaveLength(10);
    expect(focus.map(item => item.id)).toEqual(cards.slice(0, 10).map(card => card._id));
    expect(evidence).toHaveBeenCalledTimes(10);
  });

  test('materializes evidence only for the twelve highest card risks', () => {
    const cards = Array.from({ length: 2000 }, (_, index) => makeCard(index));
    const evidence = jest.spyOn(autopilotService, 'buildCardEvidence')
      .mockImplementation(card => [{ entityId: card._id }]);

    const risks = autopilotService.buildRiskRadar(cards, {});

    expect(risks).toHaveLength(12);
    expect(risks.map(risk => risk.id)).toEqual(cards.slice(0, 12).map(card => `overdue-${card._id}`));
    expect(evidence).toHaveBeenCalledTimes(12);
  });

  test('builds only the twelve winning commands and preserves first-seen ties', () => {
    const cards = Array.from({ length: 2000 }, (_, index) => makeCard(index));
    const evidence = jest.spyOn(autopilotService, 'buildCardEvidence')
      .mockImplementation(card => [{ entityId: card._id }]);

    const commands = autopilotService.buildCommandQueue({
      cards,
      boardSummaries: [],
      teamLoad: [],
      interventions: []
    });

    expect(commands).toHaveLength(12);
    expect(commands.map(command => command.id)).toEqual(
      cards.slice(0, 12).map(card => `escalate_overdue-${card._id}`)
    );
    expect(evidence).toHaveBeenCalledTimes(12);
  });

  test('allows graph score to displace a lower-ranked command', () => {
    const cards = Array.from({ length: 12 }, (_, index) => makeCard(index, {
      due: null,
      riskLevel: 'none',
      labels: [],
      lastActivity: new Date()
    }));
    const graphCandidate = {
      workItemId: 'work-item-1',
      title: 'Resolve cross-provider dependency',
      description: 'Blocks the next delivery milestone',
      findingType: 'dependency_blocker',
      riskLevel: 'medium',
      graphScore: 150,
      sourceEvidence: []
    };

    const commands = autopilotService.buildCommandQueue({
      cards,
      boardSummaries: [],
      teamLoad: [],
      interventions: [],
      graphCandidates: [graphCandidate]
    });

    expect(commands).toHaveLength(12);
    expect(commands[0]).toMatchObject({
      id: 'graph_decision-work-item-1',
      graphScore: 150
    });
    expect(commands[0].payload.actionPayload).toMatchObject({
      externalProviderWriteBlocked: true,
      executable: false,
      draftOnly: true
    });
    expect(commands.filter(command => command.type === 'assign_owner')).toHaveLength(11);
  });
});
