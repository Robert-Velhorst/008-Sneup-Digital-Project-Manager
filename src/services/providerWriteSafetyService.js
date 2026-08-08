const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);

const isProviderWriteDisabled = (environment = process.env) =>
  TRUE_VALUES.has(String(environment.SNEUP_PROVIDER_WRITES_DISABLED || '').trim().toLowerCase());

const getProviderWriteSafetyStatus = (environment = process.env) => {
  const demoMode = String(environment.SNEUP_DEMO_MODE || '').trim().toLowerCase() === 'true';
  if (demoMode) {
    return {
      enabled: false,
      mode: 'demo_read_only',
      approvalRequired: true
    };
  }

  const disabled = isProviderWriteDisabled(environment);
  return {
    enabled: !disabled,
    mode: disabled ? 'emergency_stop' : 'approval_gated',
    approvalRequired: true
  };
};

const assertProviderWritesEnabled = (environment = process.env) => {
  const status = getProviderWriteSafetyStatus(environment);
  if (status.enabled) return status;

  const demoMode = status.mode === 'demo_read_only';
  const error = new Error(demoMode
    ? 'External provider writes are unavailable in Sneup demo mode'
    : 'External provider writes are disabled by the Sneup emergency stop');
  error.code = demoMode ? 'SNEUP_DEMO_PROVIDER_WRITES_DISABLED' : 'SNEUP_PROVIDER_WRITES_DISABLED';
  error.statusCode = 503;
  throw error;
};

module.exports = {
  assertProviderWritesEnabled,
  getProviderWriteSafetyStatus,
  isProviderWriteDisabled
};
