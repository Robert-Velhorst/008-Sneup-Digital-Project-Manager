const invalid = () => Object.assign(new Error('Jira OAuth API endpoint or cloud resource is invalid.'), { statusCode: 400 });

const jiraApiUrl = raw => {
  if (typeof raw !== 'string' || /[\u0000-\u0020\u007f\\]/.test(raw.trim())) throw invalid();
  let url;
  try { url = new URL(raw.trim()); } catch { /* Reject below. */ }
  if (!url || url.protocol !== 'https:' || url.hostname !== 'api.atlassian.com' || url.port ||
      url.username || url.password || url.search || url.hash || url.pathname !== '/') throw invalid();
  return 'https://api.atlassian.com';
};

const jiraResourcesUrl = base => `${jiraApiUrl(base)}/oauth/token/accessible-resources`;

const jiraIssueSearchUrl = (base, cloudId) => {
  const approved = jiraApiUrl(base);
  if (typeof cloudId !== 'string' || !cloudId || cloudId === '.' || cloudId === '..' ||
      /[\u0000-\u0020\u007f\\]/.test(cloudId)) throw invalid();
  return `${approved}/ex/jira/${encodeURIComponent(cloudId)}/rest/api/3/search/jql`;
};

module.exports = { jiraApiUrl, jiraResourcesUrl, jiraIssueSearchUrl };
