const POLICIES = Object.freeze({
  GitHub: { setting: 'SNEUP_GITHUB_API_URL', publicBase: 'https://api.github.com',
    routes: ['/user/repos', /^\/repos\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/issues$/] },
  GitLab: { setting: 'SNEUP_GITLAB_API_URL', publicBase: 'https://gitlab.com/api/v4',
    routes: ['/issues', '/merge_requests'] }
});
const invalid = provider => Object.assign(new Error(`${provider} API endpoint or read resource is invalid.`), { statusCode: 400 });
const policyFor = provider => {
  if (!Object.hasOwn(POLICIES, provider)) throw invalid('Code host');
  return POLICIES[provider];
};
const canonicalBase = (raw, provider) => {
  if (typeof raw !== 'string' || /[\u0000-\u0020\u007f\\]/.test(raw.trim())) throw invalid(provider);
  let url;
  try { url = new URL(raw.trim()); } catch { /* Reject below. */ }
  if (!url || url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw invalid(provider);
  let end = url.pathname.length;
  while (end > 0 && url.pathname.charCodeAt(end - 1) === 47) end -= 1;
  return `${url.origin}${url.pathname.slice(0, end)}`;
};

const configuredCodeHostApi = provider => {
  const policy = policyFor(provider);
  // Deployment configuration is the operator's explicit authority for a self-managed instance.
  const base = canonicalBase(process.env[policy.setting] || policy.publicBase, provider);
  return base === policy.publicBase ? policy.publicBase : base;
};

const codeHostRequestUrl = (path, configuredBase, provider) => {
  const policy = policyFor(provider);
  const approved = configuredCodeHostApi(provider);
  if (canonicalBase(configuredBase, provider) !== approved || typeof path !== 'string' ||
      path.split('/').some(segment => segment === '.' || segment === '..') ||
      !policy.routes.some(route => typeof route === 'string' ? path === route : route.test(path))) {
    throw invalid(provider);
  }
  return `${approved}${path}`;
};

const githubApiVersion = raw => {
  const value = raw ?? process.env.SNEUP_GITHUB_API_VERSION ?? '2026-03-10';
  if (!['2026-03-10', '2022-11-28'].includes(value)) throw invalid('GitHub version');
  return value;
};

module.exports = { configuredCodeHostApi, codeHostRequestUrl, githubApiVersion };
