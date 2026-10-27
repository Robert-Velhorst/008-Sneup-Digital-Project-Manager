const ENDPOINTS = Object.freeze({
  Asana: ['https://app.asana.com/api/1.0'],
  Linear: ['https://api.linear.app/graphql'],
  Notion: ['https://api.notion.com/v1'],
  Monday: ['https://api.monday.com/v2'],
  ClickUp: ['https://api.clickup.com/api/v2'],
  Airtable: ['https://api.airtable.com/v0'],
  Smartsheet: ['https://api.smartsheet.com/2.0', 'https://api.smartsheet.eu/2.0', 'https://api.smartsheet.au/2.0']
});

const providerApiUrl = (raw, provider) => {
  let url;
  try { url = new URL(String(raw).trim()); } catch { /* Reject below. */ }
  const fail = () => Object.assign(new Error(`${provider} API URL must use a supported HTTPS endpoint.`), { statusCode: 400 });
  if (!Object.hasOwn(ENDPOINTS, provider) || !url || url.protocol !== 'https:' || url.port ||
      url.username || url.password || url.search || url.hash) throw fail();
  const canonical = ENDPOINTS[provider].find(endpoint => {
    const expected = new URL(endpoint);
    return url.origin === expected.origin && (url.pathname === expected.pathname || url.pathname === `${expected.pathname}/`);
  });
  if (!canonical) throw fail();
  return canonical;
};

module.exports = { providerApiUrl };
