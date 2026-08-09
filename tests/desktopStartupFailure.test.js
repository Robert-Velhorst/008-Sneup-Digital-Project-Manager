const {
  LIVE_DATABASE_ERROR_CODE,
  describeStartupFailure
} = require('../desktop/startupFailure');

describe('desktop startup failure recovery', () => {
  test('offers an explicit read-only demo restart for live MongoDB failure', () => {
    const privateCause = new Error('mongodb://user:password@private-host/sneup');
    const error = Object.assign(new Error(
      'Sneup live mode could not connect to MongoDB. Start MongoDB or switch to demo mode, then try again.'
    ), {
      code: LIVE_DATABASE_ERROR_CODE,
      cause: privateCause
    });

    const failure = describeStartupFailure({ error, startupMode: 'live' });

    expect(failure).toMatchObject({
      recoverable: true,
      dialogOptions: {
        buttons: ['Start demo mode', 'Close Sneup'],
        defaultId: 0,
        cancelId: 1,
        noLink: true
      }
    });
    expect(failure.dialogOptions.detail).toMatch(/read-only/i);
    expect(JSON.stringify(failure)).not.toContain(privateCause.message);
  });

  test('does not offer a mode change for unrelated or already-demo failures', () => {
    const unrelated = describeStartupFailure({
      error: new Error('Window initialization failed'),
      startupMode: 'live'
    });
    const demoFailure = describeStartupFailure({
      error: Object.assign(new Error('Database unavailable'), { code: LIVE_DATABASE_ERROR_CODE }),
      startupMode: 'demo'
    });

    expect(unrelated).toMatchObject({ recoverable: false });
    expect(demoFailure).toMatchObject({ recoverable: false });
    expect(unrelated.errorBoxMessage).toBe('Window initialization failed');
  });
});
