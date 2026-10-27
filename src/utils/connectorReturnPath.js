const RETURN_ORIGIN = 'https://sneup.invalid';
const DEFAULT_RETURN_PATH = '/?connectors=1';

const sanitizeConnectorReturnPath = value => {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') ||
      /[\u0000-\u0020\u007f\\]/.test(value)) return DEFAULT_RETURN_PATH;
  let url;
  try { url = new URL(value, RETURN_ORIGIN); } catch { return DEFAULT_RETURN_PATH; }
  if (url.origin !== RETURN_ORIGIN || !url.pathname.startsWith('/') || url.pathname.startsWith('//')) return DEFAULT_RETURN_PATH;
  return `${url.pathname}${url.search}${url.hash}`;
};

const buildConnectorReturnPath = (value, connectorId) => {
  const url = new URL(sanitizeConnectorReturnPath(value), RETURN_ORIGIN);
  url.searchParams.set('connector', String(connectorId));
  url.searchParams.set('status', 'connected');
  return `${url.pathname}${url.search}${url.hash}`;
};

module.exports = { sanitizeConnectorReturnPath, buildConnectorReturnPath };
