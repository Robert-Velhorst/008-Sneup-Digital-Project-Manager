require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const packageMetadata = require('../package.json');
const logger = require('./utils/logger');
const { registerProcessHandlers } = require('./utils/processHandlers');
const { createLazyRouter, createLazyValue } = require('./utils/lazyModule');
const { waitForScheduledJobs } = require('./utils/scheduledJob');
const { closeHttpServer, getShutdownGraceMs, withTimeout } = require('./utils/runtimeShutdown');
const {
  apiRateLimit,
  corsOptions,
  requireApiAccess
} = require('./utils/requestSecurity');
const { getMaxBodyBytes, isGenericWebhookPath } = require('./services/genericWebhookPolicy');
const responseTimingService = require('./services/responseTimingService');
const commandCenterAssetService = require('./services/commandCenterAssetService');
const { requestContextMiddleware, versionedApiEnvelope } = require('./services/apiContractService');
const { validateRuntimeSecurityConfiguration } = require('./utils/securityConfiguration');
const { getRuntimeReadiness } = require('./services/runtimeDiagnosticsService');
const ngrokTunnelService = require('./services/ngrokTunnelService');
const { RequestLoggingService } = require('./services/requestLoggingService');
const {
  DATABASE_FAILURE_MODES,
  databaseFailureMode,
  liveDatabaseStartupError
} = require('./services/startupPolicyService');

const getDatabase = createLazyValue(() => require('./utils/database'), 'database');
const getTrelloSync = createLazyValue(() => require('./services/trelloSync'), 'Trello sync service');
const getAnalyticsService = createLazyValue(() => require('./services/analyticsService'), 'analytics service');
const getConnectorSyncService = createLazyValue(() => require('./services/connectorSyncService'), 'connector sync service');
const getWorkspaceScopeService = createLazyValue(() => require('./services/workspaceScopeService'), 'workspace scope service');
const getWorkspaceDeletionWorker = createLazyValue(() => require('./workers/workspaceDeletionWorker'), 'workspace deletion worker');
const getIdentityRetentionWorker = createLazyValue(() => require('./workers/identityRetentionWorker'), 'identity retention worker');
const getDataRetentionWorker = createLazyValue(() => require('./workers/dataRetentionWorker'), 'data retention worker');
const getInterventionWorker = createLazyValue(() => require('./workers/interventionWorker'), 'intervention worker');
const getPerformanceWorker = createLazyValue(() => require('./workers/performanceWorker'), 'performance worker');
const getNotificationWorker = createLazyValue(() => require('./workers/notificationWorker'), 'notification worker');

const routeDefinitions = [
  ['boards', () => require('./routes/boards')],
  ['analytics', () => require('./routes/analytics')],
  ['team', () => require('./routes/team')],
  ['chat', () => require('./routes/chat')],
  ['connectors', () => require('./routes/connectors')],
  ['autopilot', () => require('./routes/autopilot')],
  ['enhancements', () => require('./routes/enhancements')],
  ['recommendations', () => require('./routes/recommendations')],
  ['decision-queue', () => require('./routes/decisionQueue')],
  ['audit', () => require('./routes/audit')],
  ['trello-actions', () => require('./routes/trelloActions')],
  ['follow-ups', () => require('./routes/followUps')],
  ['cards', () => require('./routes/cards')],
  ['interventions', () => require('./routes/interventions')],
  ['findings', () => require('./routes/findings')],
  ['jobs', () => require('./routes/jobs')],
  ['security', () => require('./routes/security')],
  ['workspaces', () => require('./routes/workspaces')],
  ['work-signals', () => require('./routes/workSignals')],
  ['reports', () => require('./routes/reports')],
  ['forecasts', () => require('./routes/forecasts')],
  ['notifications', () => require('./routes/notifications')],
  ['policy-rules', () => require('./routes/policyRules')],
  ['outcomes', () => require('./routes/outcomes')],
  ['operations-ledger', () => require('./routes/operationsLedger')],
  ['integrations/hai', () => require('./routes/haiIntegration')],
  ['feature-flags', () => require('./routes/featureFlags')],
  ['integrity', () => require('./routes/integrity')],
  ['data-retention', () => require('./routes/dataRetention')]
].map(([routePath, loadRouter]) => ({
  routePath,
  router: createLazyRouter(loadRouter, `${routePath} router`)
}));
const webhookRoutes = createLazyRouter(() => require('./routes/webhooks'), 'webhooks router');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '127.0.0.1';
let server;
let shutdownPromise = null;
let shutdownGraceMs = null;
const startupState = {
  initialized: false,
  phase: 'starting'
};
const getCurrentDatabaseStatus = () =>
  getDatabase.peek()?.getDatabaseStatus() || { state: 'disconnected' };

// Middleware
app.use(requestContextMiddleware);
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
  const databaseStatus = getCurrentDatabaseStatus();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: { state: databaseStatus.state },
    demoMode: process.env.SNEUP_DEMO_MODE === 'true'
  });
});

app.get('/ready', (req, res) => {
  const databaseStatus = getCurrentDatabaseStatus();
  const readiness = getRuntimeReadiness({
    databaseState: databaseStatus.state,
    initialized: startupState.initialized
  });
  res.status(readiness.ready ? 200 : 503).json(readiness);
});

// Versioned API routes use one strict response envelope. External webhook
// protocols retain their established unversioned endpoints and signatures.
app.use('/api/v1', versionedApiEnvelope);
routeDefinitions.forEach(({ routePath, router }) => app.use(`/api/v1/${routePath}`, router));

// Backward-compatible API routes.
app.use('/api/webhooks', webhookRoutes);
routeDefinitions.forEach(({ routePath, router }) => app.use(`/api/${routePath}`, router));

// Machine-readable product metadata; the command center owns the browser root.
const productMetadata = (req, res) => {
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
      'Capacity-aware P50/P80 delivery forecasts',
      'Audited internal data integrity repair',
      'Owner-controlled bounded data retention'
    ]
  });
};

app.get('/api/v1', productMetadata);
app.get('/api', productMetadata);

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
    shutdownGraceMs = getShutdownGraceMs();
    
    let databaseConnected = false;

    if (process.env.SNEUP_DEMO_MODE === 'true') {
      logger.warn('Sneup demo mode enabled. Skipping MongoDB connection.');
    } else {
      try {
        await getDatabase().connectDatabase();
        databaseConnected = true;
        const workspaceScopeService = getWorkspaceScopeService();
        const workspaceMigrationPreflight = await workspaceScopeService.inspectDefaultWorkspaceMigration();
        workspaceScopeService.assertWorkspaceMigrationReady(workspaceMigrationPreflight);
        const workspaceBackfill = await workspaceScopeService.backfillDefaultWorkspace();
        const policyRuleIndexMigration = await workspaceScopeService.ensurePolicyRuleIndexes();
        const jobControlIndexMigration = await workspaceScopeService.ensureJobControlIndexes();
        await workspaceScopeService.ensureFeatureFlagIndexes();
        const providerEntityIndexMigration = await workspaceScopeService.ensureProviderEntityIndexes();
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
        const migratedProviderIndexes = Object.entries(providerEntityIndexMigration)
          .filter(([, result]) => result.removedLegacyTrelloIdIndexes > 0)
          .map(([name]) => name);
        if (migratedProviderIndexes.length > 0) {
          logger.info('Migrated legacy global Trello entity indexes', { collections: migratedProviderIndexes });
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
      await getTrelloSync().initSync();
    } else if (!hasTrelloCredentials) {
      logger.warn('Trello credentials are not configured. Skipping Trello synchronization.');
    }

    if (databaseConnected) {
      await getWorkspaceDeletionWorker().run();
      getAnalyticsService().initAnalytics();
      getConnectorSyncService().init();

      getInterventionWorker().init();
      getPerformanceWorker().init();
      getNotificationWorker().init();

      getIdentityRetentionWorker().init();
      getDataRetentionWorker().init();

      getWorkspaceDeletionWorker().init();
    } else {
      logger.warn('Background analytics and intervention workers are paused until MongoDB is connected.');
    }
    
    // Start server
    server = app.listen(PORT, HOST, () => {
      logger.info(`Sneup server running on http://${HOST}:${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    await new Promise((resolve, reject) => {
      server.once('listening', resolve);
      server.once('error', reject);
    });
    await ngrokTunnelService.start({ host: HOST, port: PORT });
    if (databaseConnected && hasTrelloCredentials) {
      try {
        await getTrelloSync().reconcileTrelloWebhooks();
      } catch (error) {
        logger.warn('Trello webhook reconciliation failed; read-only synchronization remains available', {
          code: error.code,
          message: error.message
        });
      }
    }
    startupState.initialized = true;
    startupState.phase = 'serving';

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

const closeServer = async (options = {}) => {
  if (!server) return { forced: false };
  const activeServer = server;
  try {
    return await closeHttpServer(activeServer, options);
  } finally {
    if (server === activeServer) server = undefined;
  }
};

const shutdown = async () => {
  if (shutdownPromise) return shutdownPromise;

  shutdownPromise = (async () => {
    const graceMs = shutdownGraceMs || getShutdownGraceMs();
    const failures = [];
    const preserveFailedState = startupState.phase === 'failed';
    if (!preserveFailedState) {
      startupState.initialized = false;
      startupState.phase = 'stopping';
    }

    const stopComponent = async (component, stop, options = {}) => {
      try {
        const pending = stop();
        await (options.hasOwnTimeout
          ? pending
          : withTimeout(pending, {
            timeoutMs: graceMs,
            code: 'SNEUP_SHUTDOWN_COMPONENT_TIMEOUT',
            message: `${component} did not stop before the shutdown deadline`
          }));
      } catch (error) {
        failures.push({ component, error });
        logger.error('Runtime shutdown component failed', {
          component,
          code: error?.code || 'shutdown_failed'
        });
      }
    };

    const schedulerStops = [
      ['workspace deletion worker', () => getWorkspaceDeletionWorker.peek()?.stop()],
      ['identity retention worker', () => getIdentityRetentionWorker.peek()?.stop()],
      ['data retention worker', () => getDataRetentionWorker.peek()?.stop()],
      ['intervention worker', () => getInterventionWorker.peek()?.stop()],
      ['performance worker', () => getPerformanceWorker.peek()?.stop()],
      ['notification worker', () => getNotificationWorker.peek()?.stop()],
      ['connector synchronization', () => getConnectorSyncService.peek()?.stop()],
      ['analytics service', () => getAnalyticsService.peek()?.stopAnalytics?.()],
      ['Trello synchronization', () => getTrelloSync.peek()?.stopSync?.()]
    ];

    const drains = schedulerStops.map(([component, stop]) => stopComponent(component, stop));
    drains.push(stopComponent(
      'scheduled job drain',
      () => waitForScheduledJobs({ timeoutMs: graceMs }),
      { hasOwnTimeout: true }
    ));
    drains.push(stopComponent('ngrok ingress', () => ngrokTunnelService.stop()));
    drains.push(stopComponent(
      'HTTP server',
      () => closeServer({ timeoutMs: graceMs }),
      { hasOwnTimeout: true }
    ));
    await Promise.all(drains);

    await stopComponent('MongoDB', async () => {
      const database = getDatabase.peek();
      if (database?.isDatabaseConnected()) await database.disconnectDatabase();
    });

    if (failures.length > 0) {
      const error = new AggregateError(
        failures.map(failure => failure.error),
        'One or more Sneup runtime components did not stop cleanly'
      );
      error.code = 'SNEUP_SHUTDOWN_INCOMPLETE';
      error.components = failures.map(failure => failure.component);
      startupState.initialized = false;
      startupState.phase = 'failed';
      throw error;
    }

    startupState.initialized = false;
    if (!preserveFailedState) startupState.phase = 'stopped';
  })();

  try {
    return await shutdownPromise;
  } finally {
    shutdownPromise = null;
  }
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
