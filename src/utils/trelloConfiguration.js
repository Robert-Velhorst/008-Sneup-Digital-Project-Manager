const DEFAULT_TRELLO_TIMEOUT_MS = 15000;
const MIN_TRELLO_TIMEOUT_MS = 1000;
const MAX_TRELLO_TIMEOUT_MS = 60000;
const MAX_TRELLO_RESPONSE_BYTES = 16 * 1024 * 1024;
const MAX_TRELLO_REQUEST_BYTES = 256 * 1024;

const trelloConfigurationError = (message) => {
  const error = new Error(message);
  error.code = 'SNEUP_TRELLO_CONFIGURATION';
  return error;
};

const resolveTrelloTimeoutMs = (value) => {
  if (value === undefined || value === null || value === '') return DEFAULT_TRELLO_TIMEOUT_MS;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < MIN_TRELLO_TIMEOUT_MS || parsed > MAX_TRELLO_TIMEOUT_MS) {
    throw trelloConfigurationError(
      `SNEUP_TRELLO_TIMEOUT_MS must be an integer from ${MIN_TRELLO_TIMEOUT_MS} to ${MAX_TRELLO_TIMEOUT_MS}`
    );
  }
  return parsed;
};

const buildTrelloClientOptions = (env = process.env) => ({
  key: env.TRELLO_API_KEY,
  token: env.TRELLO_API_TOKEN,
  baseRequestConfig: {
    timeout: resolveTrelloTimeoutMs(env.SNEUP_TRELLO_TIMEOUT_MS),
    maxContentLength: MAX_TRELLO_RESPONSE_BYTES,
    maxBodyLength: MAX_TRELLO_REQUEST_BYTES,
    maxRedirects: 0
  }
});

module.exports = {
  DEFAULT_TRELLO_TIMEOUT_MS,
  MAX_TRELLO_TIMEOUT_MS,
  MIN_TRELLO_TIMEOUT_MS,
  buildTrelloClientOptions,
  resolveTrelloTimeoutMs
};
