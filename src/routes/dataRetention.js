const express = require('express');
const dataRetentionService = require('../services/dataRetentionService');
const jobObservabilityService = require('../services/jobObservabilityService');
const { getRequestWorkspaceObjectId } = require('../services/workspaceScopeService');
const { requirePermission } = require('../utils/requestSecurity');
const logger = require('../utils/logger');

const router = express.Router();
const actorFromRequest = req => req.auth?.displayName || req.auth?.actorId || 'workspace-owner';

const assertOwner = auth => {
  if ((auth?.roles || []).includes('owner')) return;
  const error = new Error('Only a workspace owner can change or apply data retention');
  error.statusCode = 403;
  throw error;
};

const sendError = (res, error, fallback) => res.status(error.statusCode || 500).json({
  success: false,
  code: error.code,
  error: error.statusCode ? error.message : fallback
});

router.get('/', requirePermission('audit:read'), async (req, res) => {
  try {
    const report = await dataRetentionService.scan({
      workspaceId: getRequestWorkspaceObjectId(req),
      limit: req.query.limit
    });
    res.json({ success: true, report: dataRetentionService.publicReport(report) });
  } catch (error) {
    logger.error('Failed to scan workspace retention:', error);
    sendError(res, error, 'Failed to scan workspace retention');
  }
});

router.put('/policy', requirePermission('data-retention:manage'), async (req, res) => {
  try {
    assertOwner(req.auth);
    const policy = await dataRetentionService.updatePolicy({
      workspaceId: getRequestWorkspaceObjectId(req),
      policy: req.body,
      actor: actorFromRequest(req),
      source: 'api'
    });
    res.json({ success: true, policy });
  } catch (error) {
    logger.error('Failed to update workspace retention policy:', error);
    sendError(res, error, 'Failed to update workspace retention policy');
  }
});

router.post('/apply', requirePermission('data-retention:manage'), async (req, res) => {
  try {
    assertOwner(req.auth);
    const workspaceId = getRequestWorkspaceObjectId(req);
    const result = await jobObservabilityService.trackJob({
      jobName: 'privacy.data_retention',
      jobType: 'security',
      triggerType: 'api',
      workspaceId
    }, () => dataRetentionService.apply({
      workspaceId,
      limit: req.body?.limit,
      categories: req.body?.categories,
      confirm: req.body?.confirm,
      workspaceConfirmation: req.body?.workspaceConfirmation,
      actor: actorFromRequest(req),
      source: 'api'
    }));
    res.json({ success: true, result });
  } catch (error) {
    logger.error('Failed to apply workspace retention:', error);
    sendError(res, error, 'Failed to apply workspace retention');
  }
});

module.exports = router;
module.exports.assertOwner = assertOwner;
