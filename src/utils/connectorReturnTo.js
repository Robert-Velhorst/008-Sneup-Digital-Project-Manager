const { URL, URLSearchParams } = require('node:url');

const PARSING_ORIGIN = 'https://sneup.invalid';
const DEFAULT_RETURN_TO = '/?connectors=1';

const isLocalPathSpelling = (value) => {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return false;
  // Backslashes and ASCII controls can change a browser's interpretation of the URL.
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code === 0x5c || code <= 0x1f || code === 0x7f) return false;
  }
  return true;
};

const sanitizeConnectorReturnTo = (value) => {
  if (!isLocalPathSpelling(value)) return DEFAULT_RETURN_TO;
  try {
    const destination = new URL(value, PARSING_ORIGIN);
    const local = `${destination.pathname}${destination.search}${destination.hash}`;
    // Check the normalized output too: removing dot segments can expose a leading //.
    if (destination.origin === PARSING_ORIGIN && isLocalPathSpelling(local)) return value;
  } catch {
    // Invalid destinations use the existing local connectors screen.
  }
  return DEFAULT_RETURN_TO;
};

const buildConnectorReturnRedirect = (returnTo, connectorId) => {
  const local = sanitizeConnectorReturnTo(returnTo);
  const hashAt = local.indexOf('#');
  const beforeFragment = hashAt < 0 ? local : local.slice(0, hashAt);
  const fragment = hashAt < 0 ? '' : local.slice(hashAt);
  const queryAt = beforeFragment.indexOf('?');
  const path = queryAt < 0 ? beforeFragment : beforeFragment.slice(0, queryAt);
  const parameters = new URLSearchParams(queryAt < 0 ? '' : beforeFragment.slice(queryAt + 1));
  parameters.set('connector', connectorId);
  parameters.set('status', 'connected');
  return sanitizeConnectorReturnTo(`${path}?${parameters.toString()}${fragment}`);
};

module.exports = { sanitizeConnectorReturnTo, buildConnectorReturnRedirect };
