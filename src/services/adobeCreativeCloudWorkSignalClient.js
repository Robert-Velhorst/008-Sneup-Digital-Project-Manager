const axios = require('axios');
const accountConnectorService = require('./accountConnectorService');

const clamp = (value, fallback, minimum, maximum) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? Math.max(minimum, Math.min(maximum, parsed)) : fallback;
};
const clean = value => String(value || '')
  .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[redacted email]')
  .replace(/\bhttps?:\/\/\S+/gi, '[redacted url]')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, 160);
const safeId = value => /^[A-Za-z0-9._:-]{1,256}$/.test(String(value || '')) ? String(value) : undefined;
const dateFromUnixMilliseconds = value => {
  if (value === undefined || value === null) return undefined;
  const milliseconds = Number(value);
  if (!Number.isSafeInteger(milliseconds) || milliseconds < 0 || milliseconds > 4102444800000) return undefined;
  return new Date(milliseconds).toISOString();
};
const providerError = (message, statusCode = 502) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

class AdobeCreativeCloudWorkSignalClient {
  constructor(options = {}) {
    this.http = options.http || axios;
    this.accountConnectorService = options.accountConnectorService || accountConnectorService;
  }

  getConfig() {
    return {
      clientId: String(process.env.ADOBE_CLIENT_ID || '').trim(),
      timeout: clamp(process.env.SNEUP_ADOBE_TIMEOUT_MS, 15000, 1000, 60000),
      pageSize: clamp(process.env.SNEUP_ADOBE_PAGE_SIZE, 10, 1, 10),
      maxLibraries: clamp(process.env.SNEUP_ADOBE_MAX_LIBRARIES, 50, 1, 100),
      maxResponseBytes: clamp(process.env.SNEUP_ADOBE_MAX_RESPONSE_BYTES, 2000000, 1024, 10000000),
      cursorLookbackMs: clamp(process.env.SNEUP_ADOBE_CURSOR_LOOKBACK_MS, 60000, 0, 3600000)
    };
  }

  getAccessToken(account) {
    const token = this.accountConnectorService.getAccountCredentials(account).accessToken;
    if (!token) throw providerError('Adobe Creative Cloud access token is missing. Reconnect this account to continue syncing.', 503);
    return token;
  }

  normalizeLibrary(item) {
    const libraryId = safeId(item?.id);
    const createdAt = dateFromUnixMilliseconds(item?.created_date);
    const updatedAt = dateFromUnixMilliseconds(item?.modified_date);
    if (!libraryId || !clean(item?.name)) return null;
    if ((item?.created_date !== undefined && !createdAt) || (item?.modified_date !== undefined && !updatedAt)) return null;
    return {
      id: `adobe_creative_cloud:${libraryId}`,
      sourceType: 'library',
      libraryId,
      name: clean(item.name),
      status: 'open',
      createdAt,
      updatedAt
    };
  }

  async fetchDelta(account, cursor) {
    const config = this.getConfig();
    if (!config.clientId) throw providerError('ADOBE_CLIENT_ID is required before Adobe Creative Cloud can sync.', 503);
    const cursorDate = cursor ? new Date(cursor) : null;
    if (cursor && Number.isNaN(cursorDate.getTime())) throw providerError('Adobe Creative Cloud work-signal cursor is invalid. Reconnect this account to establish a new cursor.', 400);

    const token = this.getAccessToken(account);
    const libraries = [];
    let start = 0;
    let totalCount;
    while (totalCount === undefined || start < totalCount) {
      const response = await this.http.get('https://cc-libraries.adobe.io/api/v1/libraries', {
        params: { start, limit: config.pageSize, owner: 'all', selector: 'default', toolkit: 'none', orderBy: '-modified_date' },
        headers: { Accept: 'application/json', Authorization: `Bearer ${token}`, 'x-api-key': config.clientId },
        timeout: config.timeout,
        maxContentLength: config.maxResponseBytes,
        maxBodyLength: config.maxResponseBytes,
        maxRedirects: 0,
        proxy: false
      });
      const page = response.data?.libraries;
      const responseTotal = response.data?.total_count;
      if (!Array.isArray(page) || !Number.isSafeInteger(responseTotal) || responseTotal < 0) {
        throw providerError('Adobe Creative Cloud returned an invalid library collection.');
      }
      if (page.length > config.pageSize || start + page.length > responseTotal || (totalCount !== undefined && responseTotal !== totalCount)) {
        throw providerError('Adobe Creative Cloud returned inconsistent library pagination.');
      }
      if (responseTotal > config.maxLibraries) {
        throw providerError('Adobe Creative Cloud sync exceeds the configured library limit. Increase SNEUP_ADOBE_MAX_LIBRARIES before continuing.', 413);
      }
      totalCount = responseTotal;
      libraries.push(...page);
      start += page.length;
      if (start < totalCount && page.length === 0) throw providerError('Adobe Creative Cloud returned an incomplete library page.');
    }

    const threshold = cursorDate ? cursorDate.getTime() - config.cursorLookbackMs : null;
    const records = libraries
      .map(item => this.normalizeLibrary(item))
      .filter(Boolean)
      .filter(item => !threshold || !item.updatedAt || new Date(item.updatedAt).getTime() >= threshold);
    const newest = records.reduce((latest, item) => {
      const updated = new Date(item.updatedAt || item.createdAt || 0);
      return !Number.isNaN(updated.getTime()) && (!latest || updated > latest) ? updated : latest;
    }, cursorDate);
    return {
      records,
      nextCursor: newest ? newest.toISOString() : cursor || null,
      hasMore: false,
      metadata: {
        source: 'adobe_creative_cloud_library_metadata',
        libraries: records.length,
        pages: totalCount === 0 ? 1 : Math.ceil(totalCount / config.pageSize),
        contentPolicy: 'bounded_adobe_library_metadata_only_no_elements_assets_files_renditions_collaboration_people_links_storage_details_comments_or_provider_writes'
      }
    };
  }
}

const adobeCreativeCloudWorkSignalClient = new AdobeCreativeCloudWorkSignalClient();
module.exports = adobeCreativeCloudWorkSignalClient;
module.exports.AdobeCreativeCloudWorkSignalClient = AdobeCreativeCloudWorkSignalClient;
