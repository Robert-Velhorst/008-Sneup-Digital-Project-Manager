const mongoose = require('mongoose');
const logger = require('./logger');

const CONNECTION_LISTENER_MARKER = Symbol.for('sneup.database.connectionListenersRegistered');
const DEFAULT_DATABASE_OPTIONS = Object.freeze({
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  maxPoolSize: 20,
  minPoolSize: 0,
  maxConnecting: 2,
  maxIdleTimeMS: 60000,
  waitQueueTimeoutMS: 5000,
  bufferTimeoutMS: 5000
});

const boundedInteger = (environment, name, fallback, minimum, maximum) => {
  const raw = String(environment[name] ?? '').trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    const error = new Error(`${name} must be an integer between ${minimum} and ${maximum}.`);
    error.code = 'SNEUP_DATABASE_CONFIGURATION';
    throw error;
  }
  return value;
};

const buildDatabaseOptions = (environment = process.env) => {
  const maxPoolSize = boundedInteger(environment, 'SNEUP_MONGODB_MAX_POOL_SIZE', DEFAULT_DATABASE_OPTIONS.maxPoolSize, 1, 200);
  const minPoolSize = boundedInteger(environment, 'SNEUP_MONGODB_MIN_POOL_SIZE', DEFAULT_DATABASE_OPTIONS.minPoolSize, 0, maxPoolSize);
  const maxConnecting = boundedInteger(
    environment,
    'SNEUP_MONGODB_MAX_CONNECTING',
    Math.min(DEFAULT_DATABASE_OPTIONS.maxConnecting, maxPoolSize),
    1,
    maxPoolSize
  );

  return {
    serverSelectionTimeoutMS: boundedInteger(environment, 'SNEUP_MONGODB_SERVER_SELECTION_TIMEOUT_MS', DEFAULT_DATABASE_OPTIONS.serverSelectionTimeoutMS, 500, 60000),
    connectTimeoutMS: boundedInteger(environment, 'SNEUP_MONGODB_CONNECT_TIMEOUT_MS', DEFAULT_DATABASE_OPTIONS.connectTimeoutMS, 500, 60000),
    socketTimeoutMS: boundedInteger(environment, 'SNEUP_MONGODB_SOCKET_TIMEOUT_MS', DEFAULT_DATABASE_OPTIONS.socketTimeoutMS, 0, 300000),
    maxPoolSize,
    minPoolSize,
    maxConnecting,
    maxIdleTimeMS: boundedInteger(environment, 'SNEUP_MONGODB_MAX_IDLE_TIME_MS', DEFAULT_DATABASE_OPTIONS.maxIdleTimeMS, 0, 900000),
    waitQueueTimeoutMS: boundedInteger(environment, 'SNEUP_MONGODB_WAIT_QUEUE_TIMEOUT_MS', DEFAULT_DATABASE_OPTIONS.waitQueueTimeoutMS, 250, 60000),
    bufferTimeoutMS: boundedInteger(environment, 'SNEUP_MONGODB_BUFFER_TIMEOUT_MS', DEFAULT_DATABASE_OPTIONS.bufferTimeoutMS, 250, 60000)
  };
};

const registerConnectionListeners = (connection) => {
  if (connection[CONNECTION_LISTENER_MARKER]) return false;

  connection.on('error', (error) => {
    logger.error('MongoDB connection error:', error);
  });
  connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });
  connection.on('reconnected', () => {
    logger.info('MongoDB reconnected');
  });

  Object.defineProperty(connection, CONNECTION_LISTENER_MARKER, {
    configurable: false,
    enumerable: false,
    value: true
  });
  return true;
};

const connectDatabase = async ({ environment = process.env } = {}) => {
  try {
    const mongoUri = environment.MONGODB_URI || 'mongodb://localhost:27017/sneup';
    const options = buildDatabaseOptions(environment);

    logger.info('Connecting to MongoDB...');
    await mongoose.connect(mongoUri, options);
    registerConnectionListeners(mongoose.connection);
    logger.info('MongoDB connected successfully', {
      maxPoolSize: options.maxPoolSize,
      minPoolSize: options.minPoolSize,
      waitQueueTimeoutMS: options.waitQueueTimeoutMS
    });
    return mongoose.connection;
  } catch (error) {
    logger.error('Failed to connect to MongoDB:', error);
    throw error;
  }
};

const disconnectDatabase = async () => {
  try {
    if (mongoose.connection.readyState === 0) return;
    await mongoose.connection.close();
    logger.info('MongoDB disconnected');
  } catch (error) {
    logger.error('Error disconnecting from MongoDB:', error);
    throw error;
  }
};

const isDatabaseConnected = () => mongoose.connection.readyState === 1;

const getDatabaseStatus = () => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  return {
    state: states[mongoose.connection.readyState] || 'unknown',
    host: mongoose.connection.host,
    port: mongoose.connection.port,
    name: mongoose.connection.name
  };
};

module.exports = {
  DEFAULT_DATABASE_OPTIONS,
  buildDatabaseOptions,
  connectDatabase,
  disconnectDatabase,
  getDatabaseStatus,
  isDatabaseConnected,
  registerConnectionListeners
};
