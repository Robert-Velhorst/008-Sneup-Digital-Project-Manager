const express = require('express');
const featureFlagService = require('../services/featureFlagService');
const { requirePermission } = require('../utils/requestSecurity');
const logger = require('../utils/logger');

const router = express.Router();

const options = req => ({
  workspaceId: req.auth?.workspaceId || process.env.SNEUP_DEFAULT_WORKSPACE_ID || 'default',
  subjectId: req.auth?.actorId || req.auth?.userId,
  actor: req.auth?.actorId || 'sneup-operator'
});

const sendError = (res, error, fallback) => res.status(error.statusCode || 500).json({
  success: false,
  code: error.code,
  error: error.statusCode ? error.message : fallback
});

router.get('/', requirePermission('api:read'), async (req, res) => {
  try {
    const flags = await featureFlagService.list(options(req));
    res.json({ success: true, count: flags.length, flags, cache: featureFlagService.cacheMetrics() });
  } catch (error) {
    logger.error('Failed to list feature rollout controls:', error);
    sendError(res, error, 'Failed to list feature rollout controls');
  }
});

router.get('/:key/history', requirePermission('audit:read'), async (req, res) => {
  try {
    const history = await featureFlagService.history(req.params.key, {
      ...options(req),
      limit: req.query.limit
    });
    res.json({ success: true, count: history.length, history });
  } catch (error) {
    logger.error('Failed to list feature rollout history:', error);
    sendError(res, error, 'Failed to list feature rollout history');
  }
});

router.put('/:key', requirePermission('feature-flags:manage'), async (req, res) => {
  try {
    const flag = await featureFlagService.update(req.params.key, req.body, options(req));
    res.json({ success: true, flag });
  } catch (error) {
    logger.error('Failed to update feature rollout control:', error);
    sendError(res, error, 'Failed to update feature rollout control');
  }
});

module.exports = router;
