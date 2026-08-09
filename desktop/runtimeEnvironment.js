const configureDesktopEnvironment = ({ environment = process.env, isPackaged = false } = {}) => {
  environment.SNEUP_DESKTOP = 'true';
  if (isPackaged) environment.NODE_ENV = 'production';
  return environment;
};

module.exports = { configureDesktopEnvironment };
