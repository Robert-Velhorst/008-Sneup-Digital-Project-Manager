require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const packageMetadata = require('../package.json');
const logger = require('./utils/logger');
const { registerProcessHandlers } = require('./utils/processHandlers');
const { connectDatabase, disconnectDatabase, isDatabaseConnected, getDatabaseStatus } = require('./utils/database');
const {
  apiRateLimit,
  corsOptions,
  requireApiAccess
} = require('./utils/requestSecurity');
const trelloSync = require('./services/trelloSync');
const analyticsService = require('./services/analyticsService');
const connectorSyncService = require('./services/connectorSyncService');
const { getMaxBodyBytes, isGenericWebhookPath } = require('./services/genericWebhookService');
const workspaceScopeService = require('./services/workspaceScopeService');
const responseTimingService = require('./services/responseTimingService');
const commandCenterAssetService = require('./services/commandCenterAssetService');
const { validateRuntimeSecurityConfiguration } = require('./utils/securityConfiguration');
const { getRuntimeReadiness } = require('./services/runtimeDiagnosticsService');
const ngrokTunnelService = require('./services/ngrokTunnelService');
const workspaceDeletionWorker = require('./workers/workspaceDeletionWorker');
const { RequestLoggingService } = require('./services/requestLoggingService');
const {
  DATABASE_FAILURE_MODES,
  databaseFailureMode,
  liveDatabaseStartupError
} = require('./services/startupPolicyService');

// Import routes
const boardRoutes = require('./routes/boards');
const analyticsRoutes = require('./routes/analytics');
const teamRoutes = require('./routes/team');
const webhookRoutes = require('./routes/webhooks');
const chatRoutes = require('./routes/chat');
const connectorRoutes = require('./routes/connectors');
const autopilotRoutes = require('./routes/autopilot');
const enhancementRoutes = require('./routes/enhancements');
const recommendationRoutes = require('./routes/recommendations');
const decisionQueueRoutes = require('./routes/decisionQueue');
const auditRoutes = require('./routes/audit');
const trelloActionRoutes = require('./routes/trelloActions');
const followUpRoutes = require('./routes/followUps');
const cardRoutes = require('./routes/cards');
const interventionRoutes = require('./routes/interventions');
const findingRoutes = require('./routes/findings');
const jobRoutes = require('./routes/jobs');
const securityRoutes = require('./routes/security');
const workspaceRoutes = require('./routes/workspaces');
const workSignalRoutes = require('./routes/workSignals');
const reportRoutes = require('./routes/reports');
const forecastRoutes = require('./routes/forecasts');
const notificationRoutes = require('./routes/notifications');
const policyRuleRoutes = require('./routes/policyRules');
const outcomeRoutes = require('./routes/outcomes');
const operationsLedgerRoutes = require('./routes/operationsLedger');
const haiIntegrationRoutes = require('./routes/haiIntegration');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '127.0.0.1';
let server;
const startupState = {
  initialized: false,
  phase: 'starting'
};

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      connectSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"]
    }
  }
}));
app.use(cors(corsOptions));
app.use(compression());
// Generic inbound webhooks are bounded before the application-wide JSON parser
// can allocate its larger body limit. Their JSON is decoded only after HMAC verification.
app.use('/api/webhooks/generic', express.raw({
  type: 'application/json',
  limit: getMaxBodyBytes(),
  verify: (req, res, buffer) => {
    req.rawBody = buffer;
  }
}));
app.use(express.json({
  limit: process.env.SNEUP_JSON_LIMIT || '1mb',
  verify: (req, res, buffer) => {
    if (isGenericWebhookPath(req.originalUrl || req.url) && buffer.length > getMaxBodyBytes()) {
      const error = new Error('Generic webhook payload is too large');
      error.statusCode = 413;
      throw error;
    }
    req.rawBody = buffer;
  }
}));
app.use(express.urlencoded({
  extended: true,
  limit: process.env.SNEUP_FORM_LIMIT || '256kb'
}));

// The HTML revalidates while content-fingerprinted static assets can be reused.
const commandCenterAssets = commandCenterAssetService.buildAssets(path.join(__dirname, '../public'));
app.use(commandCenterAssetService.createMiddleware(commandCenterAssets));
app.use(express.static(path.join(__dirname, '../public'), {
  setHeaders: commandCenterAssetService.staticHeaders
}));

app.use(new RequestLoggingService(logger).middleware());
app.use(apiRateLimit);
app.use(requireApiAccess);
app.use(responseTimingService.middleware());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: { state: getDatabaseStatus().state },
    demoMode: process.env.SNEUP_DEMO_MODE === 'true'
  });
});

app.get('/ready', (req, res) => {
  const readiness = getRuntimeReadiness({
    databaseState: getDatabaseStatus().state,
    initialized: startupState.initialized
  });
  res.status(readiness.ready ? 200 : 503).json(readiness);
});

// API routes
app.use('/api/boards', boardRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/connectors', connectorRoutes);
app.use('/api/autopilot', autopilotRoutes);
app.use('/api/enhancements', enhancementRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/decision-queue', decisionQueueRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/trello-actions', trelloActionRoutes);
app.use('/api/follow-ups', followUpRoutes);
app.use('/api/cards', cardRoutes);
app.use('/api/interventions', interventionRoutes);
app.use('/api/findings', findingRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/work-signals', workSignalRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/forecasts', forecastRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/policy-rules', policyRuleRoutes);
app.use('/api/outcomes', outcomeRoutes);
app.use('/api/operations-ledger', operationsLedgerRoutes);
app.use('/api/integrations/hai', haiIntegrationRoutes);

// Machine-readable product metadata; the command center owns the browser root.
app.get('/api', (req, res) => {
  res.json({
    name: 'Sneup',
    version: packageMetadata.version,
    description: 'Autonomous AI-powered digital project manager for Trello with proactive management and conversational AI',
    status: 'running',
    features: [
      'Proactive interventions',
      'Performance tracking',
      'Conversational AI',
      'Priority engine',
      'Account connectors',
      'Enhancement backlog',
      'Approval-gated recommendations',
      'Operations ledger',
      'Job observability',
      'Cross-tool work signals',
      'Accountability reports',
      'HAI approval-gated integration',
      'Authenticated ngrok ingress',
      'Capacity-aware P50/P80 delivery forecasts'
    ]
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  if (isGenericWebhookPath(req.originalUrl || req.url)) {
    const statusCode = err.statusCode || err.status || 400;
    return res.status(statusCode).json({
      success: false,
      error: statusCode === 413 ? 'Webhook payload is too large' : 'Webhook payload is invalid'
    });
  }
  res.status(err.statusCode || err.status || 500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path
  });
});

// Initialize application
const initApp = async () => {
  try {
    startupState.initialized = false;
    startupState.phase = 'initializing';
    logger.info('Starting Sneup...');
    validateRuntimeSecurityConfiguration();
    
    let databaseConnected = false;

    if (process.env.SNEUP_DEMO_MODE === 'true') {
      logger.warn('Sneup demo mode enabled. Skipping MongoDB connection.');
    } else {
      try {
        await connectDatabase();
        databaseConnected = true;
        const workspaceMigrationPreflight = await workspaceScopeService.inspectDefaultWorkspaceMigration();
        workspaceScopeService.assertWorkspaceMigrationReady(workspaceMigrationPreflight);
        const workspaceBackfill = await workspaceScopeService.backfillDefaultWorkspace();
        const policyRuleIndexMigration = await workspaceScopeService.ensurePolicyRuleIndexes();
        const jobControlIndexMigration = await workspaceScopeService.ensureJobControlIndexes();
        if (workspaceBackfill.totalModified > 0) {
          logger.info('Default workspace migration applied', workspaceBackfill);
        }
        if (workspaceMigrationPreflight.totalMissing > 0) {
          logger.info('Default workspace migration preflight passed', {
            totalMissing: workspaceMigrationPreflight.totalMissing,
            duplicateGroups: workspaceMigrationPreflight.indexPreflight.duplicateGroups
          });
        }
        if (policyRuleIndexMigration.removedLegacyNameIndex) {
          logger.info('Migrated legacy global PolicyRule name index');
        }
        if (jobControlIndexMigration.removedLegacyJobNameIndex) {
          logger.info('Migrated legacy global JobControl jobName index');
        }
      } catch (error) {
        if (databaseConnected) {
          logger.error('Live workspace migration preflight failed. Refusing to start in demo mode.', {
            code: error.code,
            message: error.message
          });
          throw error;
        }
        if (databaseFailureMode() === DATABASE_FAILURE_MODES.FAIL_CLOSED) {
          logger.error('MongoDB is unavailable in production live mode. Refusing demo fallback.', {
            code: error.code
          });
          throw liveDatabaseStartupError(error);
        }
        logger.warn('MongoDB is not available. Starting Sneup in catalog/demo mode.');
        process.env.SNEUP_DEMO_MODE = 'true';
      }
    }

    const hasTrelloCredentials = Boolean(process.env.TRELLO_API_KEY && process.env.TRELLO_API_TOKEN);

    if (databaseConnected && hasTrelloCredentials) {
      await trelloSync.initSync();
    } else if (!hasTrelloCredentials) {
      logger.warn('Trello credentials are not configured. Skipping Trello synchronization.');
    }

    if (databaseConnected) {
      await workspaceDeletionWorker.run();
      analyticsService.initAnalytics();
      connectorSyncService.init();

      const interventionWorker = require('./workers/interventionWorker');
      interventionWorker.init();

      const performanceWorker = require('./workers/performanceWorker');
      performanceWorker.init();

      const notificationWorker = require('./workers/notificationWorker');
      notificationWorker.init();

      const identityRetentionWorker = require('./workers/identityRetentionWorker');
      identityRetentionWorker.init();

      workspaceDeletionWorker.init();
    } else {
      logger.warn('Background analytics and intervention workers are paused until MongoDB is connected.');
    }
    
    // Start server
    server = app.listen(PORT, HOST, () => {
      startupState.initialized = true;
      startupState.phase = 'serving';
      logger.info(`Sneup server running on http://${HOST}:${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    await new Promise((resolve, reject) => {
      server.once('listening', resolve);
      server.once('error', reject);
    });
    await ngrokTunnelService.start({ host: HOST, port: PORT });

    return server;
  } catch (error) {
    startupState.initialized = false;
    startupState.phase = 'failed';
    logger.error('Failed to initialize application:', error);
    try {
      await shutdown();
    } catch (shutdownError) {
      logger.error('Failed to clean up partial startup:', shutdownError);
    }
    throw error;
  }
};

const closeServer = () => new Promise((resolve, reject) => {
  if (!server) return resolve();
  const activeServer = server;
  activeServer.close(error => {
    if (error && error.code !== 'ERR_SERVER_NOT_RUNNING') return reject(error);
    if (server === activeServer) server = undefined;
    return resolve();
  });
});

const shutdown = async () => {
  workspaceDeletionWorker.stop();
  await ngrokTunnelService.stop();
  await closeServer();
  if (isDatabaseConnected()) await disconnectDatabase();
};

// Process handlers are global: register once even when Sneup is embedded or hot-reloaded.
registerProcessHandlers(logger, { shutdown });

if (require.main === module) {
  initApp().catch(() => {
    process.exitCode = 1;
  });
}

app.initApp = initApp;
app.getServer = () => server;
app.getStartupState = () => ({ ...startupState });
app.shutdown = shutdown;
module.exports = app;
