const { configureDesktopEnvironment } = require('../desktop/runtimeEnvironment');

describe('desktop runtime environment', () => {
  test('disables development console logging in packaged builds', () => {
    const environment = { NODE_ENV: 'development' };

    configureDesktopEnvironment({ environment, isPackaged: true });

    expect(environment).toEqual({
      NODE_ENV: 'production',
      SNEUP_DESKTOP: 'true'
    });
  });

  test('retains the requested environment during source development', () => {
    const environment = { NODE_ENV: 'development' };

    configureDesktopEnvironment({ environment, isPackaged: false });

    expect(environment).toEqual({
      NODE_ENV: 'development',
      SNEUP_DESKTOP: 'true'
    });
  });
});
