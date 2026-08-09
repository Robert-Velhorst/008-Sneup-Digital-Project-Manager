const express = require('express');
const dataIntegrityService = require('../services/dataIntegrityService');
const { getRequestWorkspaceObjectId } = require('../services/workspaceScopeService');
const { requirePermission } = require('../utils/requestSecurity');
const logger = require('../utils/logger');

const router = express.Router();
const actorFromRequest = req => req.auth?.displayName || req.auth?.actorId || 'sneup-operator';

const sendError = (res, error, fallback) => res.status(error.statusCode || 500).json({
  success: false,
  code: error.code,
  error: error.statusCode ? error.message : fallback
});

router.get('/', requirePermission('audit:read'), async (req, res) => {
  try {
    const report = await dataIntegrityService.scan({
      workspaceId: getRequestWorkspaceObjectId(req),
      limit: req.query.limit
    });
    res.json({ success: true, report: dataIntegrityService.publicReport(report) });
  } catch (error) {
    logger.error('Failed to scan workspace integrity:', error);
    sendError(res, error, 'Failed to scan workspace integrity');
  }
});

router.post('/repair', requirePermission('integrity:repair'), async (req, res) => {
  try {
    const result = await dataIntegrityService.apply({
      workspaceId: getRequestWorkspaceObjectId(req),
      limit: req.body?.limit,
      fingerprints: req.body?.fingerprints,
      confirm: req.body?.confirm,
      actor: actorFromRequest(req),
      source: 'api'
    });
    res.json({ success: true, result });
  } catch (error) {
    logger.error('Failed to repair workspace integrity:', error);
    sendError(res, error, 'Failed to repair workspace integrity');
  }
});

module.exports = router;
