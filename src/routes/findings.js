const { optionalQueryString } = require('../utils/queryFilters');
const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const CardFinding = require('../models/CardFinding');
const BoardHealthSnapshot = require('../models/BoardHealthSnapshot');
const operationsLedgerService = require('../services/operationsLedgerService');
const { scopeQuery, workspacePopulate } = require('../services/workspaceScopeService');
const { clampInteger, requirePermission } = require('../utils/requestSecurity');

const sendError = (res, error, fallback) => res.status(error.statusCode || 500).json({
  success: false,
  error: error.statusCode ? error.message : fallback
});

router.get('/', requirePermission('audit:read'), async (req, res) => {
  try {
    operationsLedgerService.requireDatabase();
    const query = scopeQuery(req);
    if (optionalQueryString(req.query.boardId, 'boardId')) query.boardId = optionalQueryString(req.query.boardId, 'boardId');
    if (optionalQueryString(req.query.cardId, 'cardId')) query.cardId = optionalQueryString(req.query.cardId, 'cardId');
    if (optionalQueryString(req.query.status, 'status')) query.status = optionalQueryString(req.query.status, 'status');
    if (optionalQueryString(req.query.severity, 'severity')) query.severity = optionalQueryString(req.query.severity, 'severity');
    if (optionalQueryString(req.query.waitingOn, 'waitingOn')) query.waitingOn = optionalQueryString(req.query.waitingOn, 'waitingOn');
    if (optionalQueryString(req.query.findingType, 'findingType')) query.findingType = optionalQueryString(req.query.findingType, 'findingType');

    const findings = await CardFinding.find(query)
      .sort({ severity: -1, signalScore: -1, lastObservedAt: -1 })
      .populate(workspacePopulate(query.workspaceId, 'boardId cardId memberId'))
      .limit(clampInteger(req.query.limit, 100, 1, 250));

    res.json({ success: true, count: findings.length, findings });
  } catch (error) {
    logger.error('Failed to list card findings:', error);
    sendError(res, error, 'Failed to list card findings');
  }
});

router.get('/board-health', requirePermission('audit:read'), async (req, res) => {
  try {
    operationsLedgerService.requireDatabase();
    const query = scopeQuery(req);
    if (optionalQueryString(req.query.boardId, 'boardId')) query.boardId = optionalQueryString(req.query.boardId, 'boardId');
    if (optionalQueryString(req.query.healthStatus, 'healthStatus')) query.healthStatus = optionalQueryString(req.query.healthStatus, 'healthStatus');

    const snapshots = await BoardHealthSnapshot.find(query)
      .sort({ generatedAt: -1 })
      .populate(workspacePopulate(query.workspaceId, 'boardId'))
      .limit(clampInteger(req.query.limit, 50, 1, 100));

    res.json({ success: true, count: snapshots.length, snapshots });
  } catch (error) {
    logger.error('Failed to list board health snapshots:', error);
    sendError(res, error, 'Failed to list board health snapshots');
  }
});

module.exports = router;
