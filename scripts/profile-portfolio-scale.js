const assert = require('assert');
const mongoose = require('mongoose');

const uri = process.env.SNEUP_PORTFOLIO_SCALE_MONGO_URI;
const databaseName = uri ? new URL(uri).pathname.replace(/^\//, '').split('?')[0] : '';
if (!uri || !/^sneup_portfolio_scale_verification_[a-z0-9_-]+$/i.test(databaseName)) {
  throw new Error('SNEUP_PORTFOLIO_SCALE_MONGO_URI must target a dedicated sneup_portfolio_scale_verification_* database');
}

const Workspace = require('../src/models/Workspace');
const Board = require('../src/models/Board');
const List = require('../src/models/List');
const Card = require('../src/models/Card');
const Member = require('../src/models/Member');
const Analytics = require('../src/models/Analytics');
const autopilotService = require('../src/services/autopilotService');

const boardCount = Math.max(50, Number.parseInt(process.env.SNEUP_SCALE_BOARDS, 10) || 60);
const listsPerBoard = Math.max(3, Number.parseInt(process.env.SNEUP_SCALE_LISTS_PER_BOARD, 10) || 5);
const cardsPerBoard = Math.max(100, Number.parseInt(process.env.SNEUP_SCALE_CARDS_PER_BOARD, 10) || 250);
const memberCount = Math.max(10, Number.parseInt(process.env.SNEUP_SCALE_MEMBERS, 10) || 100);
const measuredRuns = Math.max(3, Number.parseInt(process.env.SNEUP_SCALE_RUNS, 10) || 3);
const latencyBudgetMs = Math.max(1000, Number.parseInt(process.env.SNEUP_SCALE_P95_BUDGET_MS, 10) || 5000);
const rssBudgetMb = Math.max(256, Number.parseInt(process.env.SNEUP_SCALE_RSS_BUDGET_MB, 10) || 512);
const DAY_MS = 24 * 60 * 60 * 1000;

const durationMs = (started) => Number(process.hrtime.bigint() - started) / 1e6;
const memoryMb = () => {
  const usage = process.memoryUsage();
  return {
    rss: usage.rss / 1024 / 1024,
    heapUsed: usage.heapUsed / 1024 / 1024
  };
};
const round = (value, precision = 1) => Number(value.toFixed(precision));
const percentile = (values, quantile) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(sorted.length * quantile) - 1)];
};

const collectIndexScans = (node, names = []) => {
  if (!node || typeof node !== 'object') return names;
  if (node.stage === 'IXSCAN' && node.indexName) names.push(node.indexName);
  Object.values(node).forEach(value => {
    if (Array.isArray(value)) value.forEach(item => collectIndexScans(item, names));
    else if (value && typeof value === 'object') collectIndexScans(value, names);
  });
  return names;
};

const measureSnapshot = async (workspaceId) => {
  let peak = memoryMb();
  const sampler = setInterval(() => {
    const current = memoryMb();
    peak = {
      rss: Math.max(peak.rss, current.rss),
      heapUsed: Math.max(peak.heapUsed, current.heapUsed)
    };
  }, 5);
  const started = process.hrtime.bigint();
  try {
    const snapshot = await autopilotService.getMissionControl({ workspaceId });
    const elapsedMs = durationMs(started);
    const current = memoryMb();
    return {
      snapshot,
      elapsedMs,
      peakRssMb: Math.max(peak.rss, current.rss),
      peakHeapUsedMb: Math.max(peak.heapUsed, current.heapUsed)
    };
  } finally {
    clearInterval(sampler);
  }
};

const seedPortfolio = async () => {
  const workspace = await Workspace.create({
    name: 'Portfolio scale verification',
    slug: `portfolio-scale-${Date.now()}`,
    settings: { requireApprovalForTrelloWrites: true }
  });
  const workspaceId = workspace._id;
  const now = Date.now();
  const members = Array.from({ length: memberCount }, (_, index) => ({
    _id: new mongoose.Types.ObjectId(),
    workspaceId,
    trelloId: `scale-member-${index}`,
    username: `scale_member_${String(index).padStart(3, '0')}`,
    fullName: `Scale Member ${index}`,
    workloadLevel: index % 9 === 0 ? 'heavy' : 'normal',
    specialties: ['delivery'],
    createdAt: new Date(now),
    updatedAt: new Date(now)
  }));
  await Member.collection.insertMany(members, { ordered: false });

  const boards = [];
  const lists = [];
  const analytics = [];
  for (let boardIndex = 0; boardIndex < boardCount; boardIndex += 1) {
    const boardId = new mongoose.Types.ObjectId();
    boards.push({
      _id: boardId,
      workspaceId,
      trelloId: `scale-board-${boardIndex}`,
      name: `Portfolio Board ${String(boardIndex).padStart(3, '0')}`,
      url: `https://trello.com/b/scale-${boardIndex}`,
      closed: false,
      lastSync: new Date(now),
      createdAt: new Date(now),
      updatedAt: new Date(now)
    });
    const boardLists = Array.from({ length: listsPerBoard }, (_, listIndex) => ({
      _id: new mongoose.Types.ObjectId(),
      workspaceId,
      trelloId: `scale-list-${boardIndex}-${listIndex}`,
      name: listIndex === listsPerBoard - 1 ? 'Done' : `Stage ${listIndex + 1}`,
      boardId,
      position: listIndex,
      closed: false,
      averageTimeInList: 8 + listIndex * 4,
      createdAt: new Date(now),
      updatedAt: new Date(now)
    }));
    lists.push(...boardLists);
    analytics.push({
      _id: new mongoose.Types.ObjectId(),
      workspaceId,
      boardId,
      date: new Date(now),
      cardCount: { total: cardsPerBoard },
      velocity: { cardsPerDay: 4.5, cardsPerWeek: 22 },
      bottlenecks: boardIndex % 10 === 0 ? [{
        listId: boardLists[2]._id,
        listName: boardLists[2].name,
        severity: 'high',
        averageTimeInList: 80,
        cardCount: 30,
        trend: 'stable'
      }] : [],
      projectHealth: {
        overall: boardIndex % 10 === 0 ? 'at_risk' : 'healthy',
        riskFactors: boardIndex % 10 === 0 ? ['Flow bottleneck'] : [],
        onTrackPercentage: boardIndex % 10 === 0 ? 72 : 94
      },
      createdAt: new Date(now)
    });

    const cardBatch = Array.from({ length: cardsPerBoard }, (_, cardIndex) => {
      const globalIndex = boardIndex * cardsPerBoard + cardIndex;
      const riskLevels = ['critical', 'high', 'medium', 'low', 'none'];
      const riskLevel = riskLevels[globalIndex % riskLevels.length];
      const assigned = globalIndex % 4 !== 0;
      const overdue = globalIndex % 3 === 0;
      return {
        _id: new mongoose.Types.ObjectId(),
        workspaceId,
        trelloId: `scale-card-${globalIndex}`,
        name: `Portfolio work item ${globalIndex}`,
        boardId,
        listId: boardLists[globalIndex % (listsPerBoard - 1)]._id,
        position: cardIndex,
        closed: false,
        due: new Date(now + (overdue ? -3 : 7) * DAY_MS),
        dueComplete: false,
        members: assigned ? [members[globalIndex % members.length]._id] : [],
        labels: globalIndex % 6 === 0 ? [{ id: 'blocked', name: 'blocked', color: 'red' }] : [],
        checklists: [{
          id: `checklist-${globalIndex}`,
          name: 'Delivery',
          items: [{ id: `item-${globalIndex}`, name: 'Ready', complete: globalIndex % 2 === 0 }]
        }],
        riskLevel,
        riskFactors: ['Scale verification'],
        lastActivity: new Date(now - (globalIndex % 8) * DAY_MS),
        lastSync: new Date(now),
        createdAt: new Date(now),
        updatedAt: new Date(now)
      };
    });
    await Card.collection.insertMany(cardBatch, { ordered: false });
  }

  await Promise.all([
    Board.collection.insertMany(boards, { ordered: false }),
    List.collection.insertMany(lists, { ordered: false }),
    Analytics.collection.insertMany(analytics, { ordered: false })
  ]);
  return { workspaceId, totalCards: boardCount * cardsPerBoard };
};

const verifySnapshot = (snapshot, totalCards) => {
  assert.equal(snapshot.mode, 'live');
  assert.equal(snapshot.boardSummaries.length, boardCount);
  assert.equal(snapshot.signals.activeCards, totalCards);
  assert(snapshot.focus.length <= 10);
  assert(snapshot.risks.length <= 12);
  assert(snapshot.commandQueue.length <= 12);
  assert(snapshot.focus.every(item => Array.isArray(item.sourceEvidence) && item.sourceEvidence.length > 0));
  assert(snapshot.risks.every(item => Array.isArray(item.sourceEvidence) && item.sourceEvidence.length > 0));
  assert(snapshot.commandQueue.every(item => Array.isArray(item.sourceEvidence) && item.sourceEvidence.length > 0));
  assert(snapshot.commandQueue.every(item => ['ready', 'review'].includes(item.status)));
};

const run = async () => {
  process.env.SNEUP_DEMO_MODE = 'false';
  process.env.AUTOPILOT_MODE = 'advisory';
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  await Promise.all([Workspace.init(), Board.init(), List.init(), Card.init(), Member.init(), Analytics.init()]);
  const seedStarted = process.hrtime.bigint();
  const { workspaceId, totalCards } = await seedPortfolio();
  const seedDurationMs = durationMs(seedStarted);

  autopilotService.invalidateMissionControlForecast(workspaceId);
  const cold = await measureSnapshot(workspaceId);
  verifySnapshot(cold.snapshot, totalCards);

  const measurements = [];
  for (let index = 0; index < measuredRuns; index += 1) {
    const measurement = await measureSnapshot(workspaceId);
    verifySnapshot(measurement.snapshot, totalCards);
    measurements.push(measurement);
  }

  const explain = await Card.collection.find({ workspaceId, closed: false })
    .sort({ due: 1, riskLevel: -1 })
    .explain('executionStats');
  const indexScans = [...new Set(collectIndexScans(explain.queryPlanner.winningPlan))];
  const expectedIndex = 'workspaceId_1_closed_1_due_1_riskLevel_-1';
  assert(indexScans.includes(expectedIndex), `Portfolio card query did not use ${expectedIndex}`);
  assert(explain.executionStats.totalDocsExamined <= totalCards);

  const latencies = measurements.map(measurement => measurement.elapsedMs);
  const p95Ms = percentile(latencies, 0.95);
  const peakRssMb = Math.max(cold.peakRssMb, ...measurements.map(measurement => measurement.peakRssMb));
  assert(p95Ms <= latencyBudgetMs, `Portfolio p95 ${round(p95Ms)}ms exceeded ${latencyBudgetMs}ms budget`);
  assert(peakRssMb <= rssBudgetMb, `Portfolio RSS ${round(peakRssMb)}MB exceeded ${rssBudgetMb}MB budget`);

  process.stdout.write(`${JSON.stringify({
    verified: true,
    databaseName,
    dataset: {
      boards: boardCount,
      lists: boardCount * listsPerBoard,
      cards: totalCards,
      members: memberCount,
      analyticsRecords: boardCount
    },
    seedDurationMs: round(seedDurationMs),
    coldDurationMs: round(cold.elapsedMs),
    repeatedReadLatencyMs: {
      samples: latencies.map(value => round(value)),
      p50: round(percentile(latencies, 0.5)),
      p95: round(p95Ms),
      max: round(Math.max(...latencies)),
      budget: latencyBudgetMs
    },
    memoryMb: {
      peakRss: round(peakRssMb),
      peakHeapUsed: round(Math.max(cold.peakHeapUsedMb, ...measurements.map(item => item.peakHeapUsedMb))),
      rssBudget: rssBudgetMb
    },
    outputBounds: {
      focus: cold.snapshot.focus.length,
      risks: cold.snapshot.risks.length,
      commandQueue: cold.snapshot.commandQueue.length
    },
    queryPlan: {
      indexScans,
      totalDocsExamined: explain.executionStats.totalDocsExamined,
      totalKeysExamined: explain.executionStats.totalKeysExamined,
      returned: explain.executionStats.nReturned
    },
    providerWrites: false,
    approvalRequiredForWrites: true
  }, null, 2)}\n`);
};

run()
  .finally(async () => {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    }
  })
  .catch(error => {
    process.stderr.write(`${error.stack || error.message}\n`);
    process.exitCode = 1;
  });
