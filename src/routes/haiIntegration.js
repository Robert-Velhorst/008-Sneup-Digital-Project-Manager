const express = require('express');
const logger = require('../utils/logger');
const haiIntegrationService = require('../services/haiIntegrationService');
const { getRequestWorkspaceObjectId } = require('../services/workspaceScopeService');
const { requirePermission } = require('../utils/requestSecurity');

const router = express.Router();
const baseUrl = req => haiIntegrationService.publicUrl(req);

const sendError = (res, error, fallback) => res.status(error.statusCode || 500).json({
  success: false,
  error: error.statusCode ? error.message : fallback
});

router.get('/manifest', requirePermission('integrations:hai:read'), (req, res) => {
  res.json({ success: true, manifest: haiIntegrationService.getManifest(baseUrl(req)) });
});

router.get('/openapi.json', requirePermission('integrations:hai:read'), (req, res) => {
  res.json(haiIntegrationService.getOpenApi(baseUrl(req)));
});

router.get('/snapshot', requirePermission('integrations:hai:read'), async (req, res) => {
  try {
    const snapshot = await haiIntegrationService.getSnapshot({ workspaceId: getRequestWorkspaceObjectId(req) });
    res.json({ success: true, snapshot });
  } catch (error) {
    logger.error('Failed to build HAI operations snapshot:', error);
    sendError(res, error, 'Failed to build HAI operations snapshot');
  }
});

router.post('/proposals', requirePermission('integrations:hai:propose'), async (req, res) => {
  try {
    const result = await haiIntegrationService.createProposal(req.body, {
      workspaceId: getRequestWorkspaceObjectId(req),
      actor: req.auth?.displayName || req.auth?.actorId || 'hai'
    });
    res.status(result.created ? 201 : 200).json({
      success: true,
      created: result.created,
      recommendation: result.recommendation,
      decisionQueueItem: result.decisionQueueItem,
      safety: { approved: false, executed: false, humanDecisionRequired: true }
    });
  } catch (error) {
    logger.error('Failed to create HAI proposal:', error);
    sendError(res, error, 'Failed to create HAI proposal');
  }
});

module.exports = router;
