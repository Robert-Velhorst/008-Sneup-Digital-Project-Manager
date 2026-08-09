const DEFAULT_MAX_BODY_BYTES = 32 * 1024;
const MAX_BODY_BYTES = 256 * 1024;

const getMaxBodyBytes = () => {
  const configured = Number.parseInt(process.env.SNEUP_GENERIC_WEBHOOK_MAX_BODY_BYTES, 10);
  if (!Number.isFinite(configured)) return DEFAULT_MAX_BODY_BYTES;
  return Math.max(1024, Math.min(configured, MAX_BODY_BYTES));
};

const isGenericWebhookPath = (path) =>
  /^\/api\/webhooks\/generic\/[a-f\d]{24}(?:\/worker-response)?$/i
    .test(String(path || '').split('?')[0]);

module.exports = {
  getMaxBodyBytes,
  isGenericWebhookPath
};
