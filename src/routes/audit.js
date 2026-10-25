const { optionalQueryString } = require('../utils/queryFilters');
const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const operationsLedgerService = require('../services/operationsLedgerService');
const { getRequestWorkspaceObjectId } = require('../services/workspaceScopeService');
const { clampInteger, requirePermission } = require('../utils/requestSecurity');

router.get('/', requirePermission('audit:read'), async (req, res) => {
  try {
    const auditEvents = await operationsLedgerService.listAuditEvents({
      workspaceId: getRequestWorkspaceObjectId(req),
      entityType: optionalQueryString(req.query.entityType, 'entityType'),
      entityId: optionalQueryString(req.query.entityId, 'entityId'),
      action: optionalQueryString(req.query.action, 'action'),
      boardId: optionalQueryString(req.query.boardId, 'boardId'),
      cardId: optionalQueryString(req.query.cardId, 'cardId'),
      limit: clampInteger(req.query.limit, 100, 1, 250)
    });

    res.json({ success: true, count: auditEvents.length, auditEvents });
  } catch (error) {
    logger.error('Failed to list audit events:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.statusCode ? error.message : 'Failed to list audit events'
    });
  }
});

module.exports = router;
