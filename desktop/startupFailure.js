const LIVE_DATABASE_ERROR_CODE = 'SNEUP_LIVE_DATABASE_UNAVAILABLE';

const describeStartupFailure = ({ error, startupMode }) => {
  const recoverable = startupMode === 'live' && error?.code === LIVE_DATABASE_ERROR_CODE;
  const message = String(error?.message || 'Sneup could not complete startup.');

  if (!recoverable) {
    return {
      recoverable: false,
      errorBoxTitle: 'Sneup could not start',
      errorBoxMessage: message
    };
  }

  return {
    recoverable: true,
    dialogOptions: {
      type: 'error',
      title: 'Sneup live workspace is unavailable',
      message: 'Sneup could not start the live workspace.',
      detail: `${message}\n\nDemo mode is read-only and does not connect to MongoDB or perform provider writes.`,
      buttons: ['Start demo mode', 'Close Sneup'],
      defaultId: 0,
      cancelId: 1,
      noLink: true
    }
  };
};

module.exports = {
  LIVE_DATABASE_ERROR_CODE,
  describeStartupFailure
};
