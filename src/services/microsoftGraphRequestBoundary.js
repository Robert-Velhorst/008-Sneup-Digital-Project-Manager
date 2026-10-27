const invalid = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });

const graphApiUrl = (raw, statusCode = 400) => {
  let url;
  try { url = new URL(String(raw).trim()); } catch { /* Reject below. */ }
  if (!url || url.protocol !== 'https:' || url.port || url.username || url.password || url.search || url.hash ||
      !['/v1.0', '/v1.0/'].includes(url.pathname)) {
    throw invalid('Microsoft Graph API URL must be an approved Microsoft Graph v1.0 HTTPS endpoint.', statusCode);
  }
  switch (url.hostname) {
  case 'graph.microsoft.com': return 'https://graph.microsoft.com/v1.0';
  case 'graph.microsoft.us': return 'https://graph.microsoft.us/v1.0';
  case 'dod-graph.microsoft.us': return 'https://dod-graph.microsoft.us/v1.0';
  case 'microsoftgraph.chinacloudapi.cn': return 'https://microsoftgraph.chinacloudapi.cn/v1.0';
  default: throw invalid('Microsoft Graph API URL must be an approved Microsoft Graph v1.0 HTTPS endpoint.', statusCode);
  }
};

const graphRequestUrl = (raw, configuredBase, routes, absoluteOnly = false) => {
  const base = graphApiUrl(configuredBase);
  if (typeof raw !== 'string' || /[\u0000-\u0020\u007f\\]/.test(raw) || (absoluteOnly && raw.startsWith('/'))) {
    throw invalid('Microsoft Graph request location is invalid.');
  }
  let url;
  try { url = new URL(raw.startsWith('/') ? `${base}${raw}` : raw); } catch { /* Reject below. */ }
  if (!url || url.origin !== new URL(base).origin || url.username || url.password || url.hash ||
      !url.pathname.startsWith('/v1.0/')) {
    throw invalid('Microsoft Graph request location is invalid.');
  }
  const resource = url.pathname.slice('/v1.0'.length);
  if (!routes.some(route => typeof route === 'string' ? resource === route : route.test(resource))) {
    throw invalid('Microsoft Graph request location is invalid.');
  }
  return `${base}${resource}${url.search}`;
};

module.exports = { graphApiUrl, graphRequestUrl };
