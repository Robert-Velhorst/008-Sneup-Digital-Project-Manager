const BoardHealthSnapshot = require('../models/BoardHealthSnapshot');

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 250;
const DEFAULT_QUERY_TIMEOUT_MS = 5000;
const LATEST_BY_BOARD_INDEX = Object.freeze({ workspaceId: 1, boardId: 1, generatedAt: -1 });

const boundedInteger = (value, fallback, minimum, maximum) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : fallback;
};

const buildLatestByBoardPipeline = ({ workspaceId, limit }) => [
  { $match: { workspaceId } },
  { $sort: { boardId: 1, generatedAt: -1 } },
  { $group: { _id: '$boardId', snapshot: { $first: '$$ROOT' } } },
  { $replaceRoot: { newRoot: '$snapshot' } },
  {
    $addFields: {
      _sneupHealthRank: {
        $switch: {
          branches: [
            { case: { $eq: ['$healthStatus', 'critical'] }, then: 4 },
            { case: { $eq: ['$healthStatus', 'at_risk'] }, then: 3 },
            { case: { $eq: ['$healthStatus', 'watch'] }, then: 2 },
            { case: { $eq: ['$healthStatus', 'healthy'] }, then: 1 }
          ],
          default: 0
        }
      }
    }
  },
  { $sort: { _sneupHealthRank: -1, generatedAt: -1 } },
  { $limit: limit },
  { $project: { _sneupHealthRank: 0 } }
];

class BoardHealthSnapshotService {
  constructor(options = {}) {
    this.BoardHealthSnapshot = options.BoardHealthSnapshot || BoardHealthSnapshot;
    this.defaultQueryTimeoutMs = boundedInteger(
      options.queryTimeoutMs,
      DEFAULT_QUERY_TIMEOUT_MS,
      100,
      30000
    );
  }

  async listLatestByBoard(options = {}) {
    if (!options.workspaceId) {
      const error = new Error('Workspace is required for board health history');
      error.code = 'SNEUP_BOARD_HEALTH_WORKSPACE_REQUIRED';
      throw error;
    }

    const limit = boundedInteger(options.limit, DEFAULT_LIMIT, 1, MAX_LIMIT);
    const queryTimeoutMs = boundedInteger(options.queryTimeoutMs, this.defaultQueryTimeoutMs, 100, 30000);
    const pipeline = buildLatestByBoardPipeline({ workspaceId: options.workspaceId, limit });

    const snapshots = await this.BoardHealthSnapshot.aggregate(pipeline)
      .option({
        hint: LATEST_BY_BOARD_INDEX,
        maxTimeMS: queryTimeoutMs
      });
    return this.BoardHealthSnapshot.populate(snapshots, {
      path: 'boardId',
      select: 'name trelloId url closed'
    });
  }
}

module.exports = new BoardHealthSnapshotService();
module.exports.BoardHealthSnapshotService = BoardHealthSnapshotService;
module.exports.buildLatestByBoardPipeline = buildLatestByBoardPipeline;
module.exports.DEFAULT_LIMIT = DEFAULT_LIMIT;
module.exports.LATEST_BY_BOARD_INDEX = LATEST_BY_BOARD_INDEX;
module.exports.MAX_LIMIT = MAX_LIMIT;
