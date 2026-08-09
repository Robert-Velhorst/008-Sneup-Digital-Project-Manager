const crypto = require('crypto');

const API_VERSION = 'v1';

const statusCodes = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  413: 'PAYLOAD_TOO_LARGE',
  429: 'RATE_LIMITED',
  500: 'INTERNAL_ERROR',
  503: 'SERVICE_UNAVAILABLE'
};

const boundedCode = value => {
  const normalized = String(value || '').trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
  return normalized.slice(0, 80);
};

const requestContextMiddleware = (req, res, next) => {
  if (!req.path.startsWith('/api') && req.path !== '/health' && req.path !== '/ready') return next();
  req.sneupRequestId = crypto.randomUUID();
  res.setHeader('X-Sneup-Request-Id', req.sneupRequestId);
  next();
};

const successData = body => {
  if (!body || typeof body !== 'object' || Array.isArray(body) || body.success !== true) return body;
  const { success, ...data } = body;
  return data;
};

const errorData = (body, statusCode) => {
  const supplied = body?.error;
  const message = typeof supplied === 'string'
    ? supplied
    : supplied?.message || body?.message || 'Request failed';
  const code = boundedCode(
    (typeof supplied === 'object' && supplied?.code) || body?.code || statusCodes[statusCode] || `HTTP_${statusCode}`
  );
  return { code, message: String(message).slice(0, 500) };
};

const versionedApiEnvelope = (req, res, next) => {
  const sendJson = res.json.bind(res);

  res.json = body => {
    if (res.locals.sneupRawApiResponse === true) return sendJson(body);

    const failed = res.statusCode >= 400 || body?.success === false;
    const meta = {
      apiVersion: API_VERSION,
      requestId: req.sneupRequestId,
      timestamp: new Date().toISOString()
    };

    return sendJson(failed
      ? { ok: false, data: null, error: errorData(body, res.statusCode), meta }
      : { ok: true, data: successData(body), error: null, meta });
  };

  next();
};

module.exports = {
  API_VERSION,
  errorData,
  requestContextMiddleware,
  successData,
  versionedApiEnvelope
};
