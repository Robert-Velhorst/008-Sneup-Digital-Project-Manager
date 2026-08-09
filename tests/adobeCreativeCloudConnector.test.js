const accountConnectorService = require('../src/services/accountConnectorService');
const { AdobeCreativeCloudWorkSignalClient } = require('../src/services/adobeCreativeCloudWorkSignalClient');
const { getConnector } = require('../src/services/connectorRegistry');
const { buildConnectorSafetyProfile } = require('../src/services/connectorSafetyProfile');

describe('Adobe Creative Cloud connector', () => {
  const originalEnvironment = {};

  beforeEach(() => {
    for (const key of ['CONNECTOR_STATE_SECRET', 'ADOBE_CLIENT_ID', 'ADOBE_CLIENT_SECRET', 'SNEUP_ADOBE_PAGE_SIZE', 'SNEUP_ADOBE_MAX_LIBRARIES']) {
      originalEnvironment[key] = process.env[key];
    }
    process.env.CONNECTOR_STATE_SECRET = 'connector-state-secret-for-adobe-tests-123456789';
    process.env.ADOBE_CLIENT_ID = 'adobe-client-id';
    process.env.ADOBE_CLIENT_SECRET = 'adobe-client-secret';
  });

  afterEach(() => {
    for (const [key, value] of Object.entries(originalEnvironment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  test('uses Adobe IMS OAuth with offline renewal and the documented comma-separated scopes', () => {
    const connector = getConnector('adobe_creative_cloud');
    expect(connector.auth).toMatchObject({
      type: 'oauth2',
      authorizationUrl: 'https://ims-na1.adobelogin.com/ims/authorize/v2',
      tokenUrl: 'https://ims-na1.adobelogin.com/ims/token/v3',
      scopeSeparator: ',',
      scopes: expect.arrayContaining(['cc_files', 'cc_libraries', 'offline_access'])
    });
    expect(buildConnectorSafetyProfile(connector)).toMatchObject({ scopeReviewRequired: true });

    const connection = accountConnectorService.beginConnection('adobe_creative_cloud', {
      baseUrl: 'https://sneup.example', scopeAcknowledged: true, actorId: 'operator-1'
    });
    const url = new URL(connection.authUrl);
    expect(url.hostname).toBe('ims-na1.adobelogin.com');
    expect(url.searchParams.get('scope')).toBe('openid,creative_sdk,profile,address,AdobeID,email,cc_files,cc_libraries,offline_access');
  });

  test('reads bounded library metadata pages without elements, identity, links, renditions, or storage data', async () => {
    process.env.SNEUP_ADOBE_PAGE_SIZE = '1';
    process.env.SNEUP_ADOBE_MAX_LIBRARIES = '10';
    const http = { get: jest.fn()
      .mockResolvedValueOnce({ data: { total_count: 2, libraries: [{
        id: 'library-1', name: 'Campaign owner@example.test https://private.example', created_date: 1786266000000, modified_date: 1786269600000,
        creator: 'private-owner', storage_used: 999, collaboration: { users: ['private-user'] }, rendition_grid: { main: 'https://private.example/image' }, _links: { self: 'https://private.example/library' }, details: { description: 'private body' }
      }] } })
      .mockResolvedValueOnce({ data: { total_count: 2, libraries: [{ id: 'library-2', name: 'Second library', created_date: 1786270000000, modified_date: 1786273200000 }] } }) };
    const client = new AdobeCreativeCloudWorkSignalClient({
      http,
      accountConnectorService: { getAccountCredentials: () => ({ accessToken: 'adobe-access-secret' }) }
    });

    const result = await client.fetchDelta({}, '2026-08-09T08:00:00.000Z');

    expect(http.get).toHaveBeenNthCalledWith(1, 'https://cc-libraries.adobe.io/api/v1/libraries', expect.objectContaining({
      params: { start: 0, limit: 1, owner: 'all', selector: 'default', toolkit: 'none', orderBy: '-modified_date' },
      headers: { Accept: 'application/json', Authorization: 'Bearer adobe-access-secret', 'x-api-key': 'adobe-client-id' },
      maxContentLength: 2000000, maxBodyLength: 2000000, maxRedirects: 0, proxy: false
    }));
    expect(http.get).toHaveBeenNthCalledWith(2, expect.any(String), expect.objectContaining({ params: expect.objectContaining({ start: 1 }) }));
    expect(result).toMatchObject({
      hasMore: false,
      metadata: { source: 'adobe_creative_cloud_library_metadata', libraries: 2, pages: 2 },
      records: [
        expect.objectContaining({ id: 'adobe_creative_cloud:library-1', libraryId: 'library-1', name: 'Campaign [redacted email] [redacted url]' }),
        expect.objectContaining({ id: 'adobe_creative_cloud:library-2', libraryId: 'library-2' })
      ]
    });
    expect(JSON.stringify(result)).not.toMatch(/private-owner|private-user|private\.example|private body|storage_used|adobe-access-secret/);
    expect(result.metadata.contentPolicy).toContain('no_elements_assets_files_renditions_collaboration_people_links_storage_details_comments_or_provider_writes');
  });

  test('fails closed before requesting more pages when the provider total exceeds the configured cap', async () => {
    process.env.SNEUP_ADOBE_MAX_LIBRARIES = '1';
    const http = { get: jest.fn().mockResolvedValue({ data: { total_count: 2, libraries: [{ id: 'library-1', name: 'First' }] } }) };
    const client = new AdobeCreativeCloudWorkSignalClient({ http, accountConnectorService: { getAccountCredentials: () => ({ accessToken: 'token' }) } });
    await expect(client.fetchDelta({})).rejects.toMatchObject({ statusCode: 413 });
    expect(http.get).toHaveBeenCalledTimes(1);
  });

  test('exposes a credential-backed read-only adapter that keeps only approved library metadata', () => {
    jest.dontMock('../src/services/workSignalAdapterService');
    jest.resetModules();
    const workSignalAdapterService = require('../src/services/workSignalAdapterService');
    const adapter = workSignalAdapterService.getAdapter('adobe_creative_cloud');
    expect(adapter.capabilities).toMatchObject({ credentialBackedSync: true, applyAction: false });
    expect(workSignalAdapterService.getFirstWaveConnectorIds()).toContain('adobe_creative_cloud');
    const normalized = adapter.normalize({ connectorId: 'adobe_creative_cloud' }, {
      id: 'adobe_creative_cloud:library-1', libraryId: 'library-1', name: 'Campaign library', status: 'open',
      createdAt: '2026-08-09T09:00:00.000Z', updatedAt: '2026-08-09T10:00:00.000Z', collaboration: { users: ['private-user'] }, _links: { self: 'https://private.example' }
    });
    expect(normalized).toMatchObject({
      externalId: 'adobe_creative_cloud:library-1', sourceType: 'library', title: 'Campaign library', description: '', url: undefined, owners: [],
      raw: { libraryId: 'library-1', status: 'open' }
    });
    expect(JSON.stringify(normalized)).not.toMatch(/private-user|private\.example/);
  });
});
