const { AccountConnectorService } = require('../src/services/accountConnectorService');

const queryResult = (value) => ({
  select: jest.fn().mockReturnThis(),
  then: (resolve, reject) => Promise.resolve(value).then(resolve, reject)
});

describe('OAuth token renewal', () => {
  const encryptionKey = 'connector-encryption-key-for-oauth-refresh-tests-123456';
  const originalEnvironment = {};

  beforeEach(() => {
    originalEnvironment.CONNECTOR_ENCRYPTION_KEY = process.env.CONNECTOR_ENCRYPTION_KEY;
    originalEnvironment.CANVA_CLIENT_ID = process.env.CANVA_CLIENT_ID;
    originalEnvironment.CANVA_CLIENT_SECRET = process.env.CANVA_CLIENT_SECRET;
    process.env.CONNECTOR_ENCRYPTION_KEY = encryptionKey;
    process.env.CANVA_CLIENT_ID = 'canva-client-id';
    process.env.CANVA_CLIENT_SECRET = 'canva-client-secret';
  });

  afterEach(() => {
    for (const [key, value] of Object.entries(originalEnvironment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  test('atomically renews an expiring token with bounded I/O and secret-free audit events', async () => {
    const now = new Date('2026-08-09T10:00:00.000Z');
    const model = {
      findOneAndUpdate: jest.fn(),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 })
    };
    const auditEventModel = { create: jest.fn().mockResolvedValue({}) };
    const http = { post: jest.fn().mockResolvedValue({ data: {
      access_token: 'new-access-secret', refresh_token: 'new-refresh-secret', expires_in: 3600, token_type: 'Bearer'
    } }) };
    const service = new AccountConnectorService({ http, connectorAccountModel: model, auditEventModel, now: () => now });
    const account = {
      _id: 'account-1', workspaceId: 'workspace-1', connectorId: 'canva', connectorName: 'Canva', authType: 'oauth2', status: 'connected',
      credentials: {
        accessToken: service.encrypt('old-access-secret'),
        refreshToken: service.encrypt('old-refresh-secret'),
        expiresAt: new Date('2026-08-09T10:02:00.000Z')
      }
    };
    const claimed = { ...account, oauthRefreshLease: { tokenHash: 'claimed' } };
    const updated = {
      ...account,
      credentials: {
        accessToken: service.encrypt('new-access-secret'),
        refreshToken: service.encrypt('new-refresh-secret'),
        expiresAt: new Date('2026-08-09T11:00:00.000Z')
      }
    };
    model.findOneAndUpdate.mockReturnValueOnce(queryResult(claimed)).mockReturnValueOnce(queryResult(updated));

    await expect(service.prepareOAuthAccountForSync(account)).resolves.toBe(account);

    expect(http.post).toHaveBeenCalledTimes(1);
    expect(http.post).toHaveBeenCalledWith('https://api.canva.com/rest/v1/oauth/token', expect.stringContaining('grant_type=refresh_token'), expect.objectContaining({
      timeout: 15000, maxContentLength: 524288, maxBodyLength: 524288, maxRedirects: 0, proxy: false
    }));
    expect(http.post.mock.calls[0][1]).toContain('refresh_token=old-refresh-secret');
    expect(service.getAccountCredentials(account)).toMatchObject({ accessToken: 'new-access-secret', refreshToken: 'new-refresh-secret' });
    expect(auditEventModel.create.mock.calls.map(call => call[0].action)).toEqual([
      'connector_oauth_token_refresh_started',
      'connector_oauth_token_refresh_completed'
    ]);
    expect(JSON.stringify(auditEventModel.create.mock.calls)).not.toMatch(/old-access-secret|old-refresh-secret|new-access-secret|new-refresh-secret/);
    expect(model.findOneAndUpdate.mock.calls[1][0]).toEqual(expect.objectContaining({ 'oauthRefreshLease.tokenHash': expect.stringMatching(/^[a-f0-9]{64}$/) }));
  });

  test('does nothing while the current access token remains fresh', async () => {
    const now = new Date('2026-08-09T10:00:00.000Z');
    const model = { findOneAndUpdate: jest.fn() };
    const auditEventModel = { create: jest.fn() };
    const http = { post: jest.fn() };
    const service = new AccountConnectorService({ http, connectorAccountModel: model, auditEventModel, now: () => now });
    const account = { authType: 'oauth2', credentials: { expiresAt: new Date('2026-08-09T12:00:00.000Z') } };

    await expect(service.prepareOAuthAccountForSync(account)).resolves.toBe(account);
    expect(model.findOneAndUpdate).not.toHaveBeenCalled();
    expect(http.post).not.toHaveBeenCalled();
    expect(auditEventModel.create).not.toHaveBeenCalled();
  });

  test('fails closed before claiming a lease when an expired authorization has no refresh token', async () => {
    const service = new AccountConnectorService({ now: () => new Date('2026-08-09T10:00:00.000Z') });
    const account = { authType: 'oauth2', credentials: { expiresAt: new Date('2026-08-09T09:00:00.000Z') } };
    await expect(service.prepareOAuthAccountForSync(account)).rejects.toMatchObject({ statusCode: 409 });
  });

  test('rejects malformed authorization expiry instead of attempting a provider read', async () => {
    const service = new AccountConnectorService();
    await expect(service.prepareOAuthAccountForSync({ authType: 'oauth2', credentials: { expiresAt: 'not-a-date' } }))
      .rejects.toMatchObject({ statusCode: 409 });
  });

  test('rejects a malformed provider token response and records only a bounded failure reason', async () => {
    const now = new Date('2026-08-09T10:00:00.000Z');
    const model = {
      findOneAndUpdate: jest.fn(),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 })
    };
    const auditEventModel = { create: jest.fn().mockResolvedValue({}) };
    const http = { post: jest.fn().mockResolvedValue({ data: { access_token: { secret: 'invalid-secret' }, expires_in: 3600 } }) };
    const service = new AccountConnectorService({ http, connectorAccountModel: model, auditEventModel, now: () => now });
    const account = {
      _id: 'account-1', workspaceId: 'workspace-1', connectorId: 'canva', connectorName: 'Canva', authType: 'oauth2',
      credentials: { refreshToken: service.encrypt('refresh-secret'), expiresAt: new Date('2026-08-09T09:00:00.000Z') }
    };
    model.findOneAndUpdate.mockReturnValue(queryResult(account));

    await expect(service.prepareOAuthAccountForSync(account)).rejects.toMatchObject({ statusCode: 502 });
    expect(model.updateOne).toHaveBeenCalledTimes(1);
    expect(auditEventModel.create.mock.calls.map(call => call[0].action)).toEqual([
      'connector_oauth_token_refresh_started',
      'connector_oauth_token_refresh_failed'
    ]);
    expect(auditEventModel.create.mock.calls[1][0].afterState).toEqual({ connectorId: 'canva', reason: 'invalid_provider_response' });
    expect(JSON.stringify(auditEventModel.create.mock.calls)).not.toMatch(/invalid-secret|refresh-secret/);
  });

  test('releases the lease without calling the provider when the start audit fails', async () => {
    const now = new Date('2026-08-09T10:00:00.000Z');
    const model = { findOneAndUpdate: jest.fn(), updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }) };
    const auditEventModel = { create: jest.fn().mockRejectedValue(new Error('audit unavailable')) };
    const http = { post: jest.fn() };
    const service = new AccountConnectorService({ http, connectorAccountModel: model, auditEventModel, now: () => now });
    const account = {
      _id: 'account-1', workspaceId: 'workspace-1', connectorId: 'canva', connectorName: 'Canva', authType: 'oauth2',
      credentials: { refreshToken: service.encrypt('refresh-secret'), expiresAt: new Date('2026-08-09T09:00:00.000Z') }
    };
    model.findOneAndUpdate.mockReturnValue(queryResult(account));

    await expect(service.prepareOAuthAccountForSync(account)).rejects.toMatchObject({ statusCode: 503 });
    expect(http.post).not.toHaveBeenCalled();
    expect(model.updateOne).toHaveBeenCalledWith(expect.objectContaining({ 'oauthRefreshLease.tokenHash': expect.stringMatching(/^[a-f0-9]{64}$/) }), { $unset: { oauthRefreshLease: 1 } });
  });

  test('adopts a token renewed by another process instead of issuing a duplicate provider call', async () => {
    const now = new Date('2026-08-09T10:00:00.000Z');
    const model = { findOneAndUpdate: jest.fn().mockReturnValue(queryResult(null)), findOne: jest.fn() };
    const http = { post: jest.fn() };
    const auditEventModel = { create: jest.fn() };
    const service = new AccountConnectorService({ http, connectorAccountModel: model, auditEventModel, now: () => now });
    const account = {
      _id: 'account-1', workspaceId: 'workspace-1', connectorId: 'canva', authType: 'oauth2', status: 'connected',
      credentials: { refreshToken: service.encrypt('old-refresh-secret'), expiresAt: new Date('2026-08-09T09:00:00.000Z') }
    };
    const refreshed = {
      ...account,
      credentials: { accessToken: service.encrypt('other-process-token'), refreshToken: service.encrypt('other-refresh-token'), expiresAt: new Date('2026-08-09T11:00:00.000Z') }
    };
    model.findOne.mockReturnValue(queryResult(refreshed));

    await expect(service.prepareOAuthAccountForSync(account, { maxWaitMs: 0 })).resolves.toBe(account);
    expect(service.getAccountCredentials(account).accessToken).toBe('other-process-token');
    expect(http.post).not.toHaveBeenCalled();
    expect(auditEventModel.create).not.toHaveBeenCalled();
  });
});
