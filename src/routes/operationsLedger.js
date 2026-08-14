const express = require('express');
const logger = require('../utils/logger');
const { clampInteger, requirePermission } = require('../utils/requestSecurity');
const { createLazyValue } = require('../utils/lazyModule');
const { getDemoOperationsLedger, isDemoMode } = require('../services/demoWorkspaceService');

const router = express.Router();
const getOperationsLedgerService = createLazyValue(
  () => require('../services/operationsLedgerService'),
  'operations ledger service'
);
const getWorkspaceScopeService = createLazyValue(
  () => require('../services/workspaceScopeService'),
  'workspace scope service'
);

router.get('/', requirePermission('audit:read'), async (req, res) => {
  try {
    if (isDemoMode()) {
      return res.json({ success: true, ledger: getDemoOperationsLedger() });
    }
    const ledger = await getOperationsLedgerService().getWorkspaceLedger({
      workspaceId: getWorkspaceScopeService().getRequestWorkspaceObjectId(req),
      limit: clampInteger(req.query.limit, 50, 1, 250),
      healthLimit: clampInteger(req.query.healthLimit, 20, 1, 100),
      notificationLimit: clampInteger(req.query.notificationLimit, 100, 1, 250),
      timelineLimit: clampInteger(req.query.timelineLimit, 25, 1, 100),
      days: clampInteger(req.query.days, 30, 7, 90)
    });
    res.json({ success: true, ledger });
  } catch (error) {
    logger.error('Failed to load workspace operations ledger:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.statusCode ? error.message : 'Failed to load workspace operations ledger'
    });
  }
});

module.exports = router;
