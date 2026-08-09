const DATABASE_FAILURE_MODES = Object.freeze({
  FAIL_CLOSED: 'fail_closed',
  DEMO_FALLBACK: 'demo_fallback'
});

const databaseFailureMode = (environment = process.env) =>
  String(environment.NODE_ENV || '').toLowerCase() === 'production'
    ? DATABASE_FAILURE_MODES.FAIL_CLOSED
    : DATABASE_FAILURE_MODES.DEMO_FALLBACK;

const liveDatabaseStartupError = (cause) => {
  const error = new Error(
    'Sneup live mode could not connect to MongoDB. Start MongoDB or switch to demo mode, then try again.'
  );
  error.code = 'SNEUP_LIVE_DATABASE_UNAVAILABLE';
  error.statusCode = 503;
  error.cause = cause;
  return error;
};

module.exports = {
  DATABASE_FAILURE_MODES,
  databaseFailureMode,
  liveDatabaseStartupError
};
