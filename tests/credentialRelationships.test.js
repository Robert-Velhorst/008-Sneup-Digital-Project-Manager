const database = require('../src/utils/database');
const ApiToken = require('../src/models/ApiToken');
const SessionToken = require('../src/models/SessionToken');
const User = require('../src/models/User');
const { Types } = require('mongoose');
const { resolveDatabaseApiToken, resolveDatabaseSessionToken } = require('../src/utils/requestSecurity');

beforeEach(() => {
  jest.spyOn(database, 'isDatabaseConnected').mockReturnValue(true);
});
afterEach(() => jest.restoreAllMocks());

describe.each([
  ['API token', ApiToken, resolveDatabaseApiToken],
  ['session', SessionToken, resolveDatabaseSessionToken]
])('%s credential relationships', (label, Model, resolve) => {
  const candidate = (overrides = {}) => ({
    _id: 'token-1', role: 'manager', scopes: [],
    workspaceId: { _id: 'workspace-1', name: 'Workspace', status: 'active' },
    userId: { _id: 'user-1', workspaceId: 'workspace-1', role: 'manager', status: 'active' },
    isUsable: () => true, matches: () => true,
    populated: () => 'original-user-1', ...overrides
  });
  const install = (record) => {
    const query = { select: jest.fn(), populate: jest.fn() };
    query.select.mockReturnValue(query);
    query.populate.mockReturnValueOnce(query).mockResolvedValueOnce(record);
    jest.spyOn(Model, 'findOne').mockReturnValue(query);
    const tokenTouch = jest.spyOn(Model, 'updateOne').mockResolvedValue({ modifiedCount: 1 });
    const userTouch = jest.spyOn(User, 'updateOne').mockResolvedValue({ modifiedCount: 1 });
    return { tokenTouch, userTouch };
  };

  test.each([
    ['missing workspace', { workspaceId: null }],
    ['unpopulated workspace', { workspaceId: 'workspace-1' }],
    ['raw BSON workspace', { workspaceId: new Types.ObjectId() }],
    ['missing referenced user', { userId: null }],
    ['foreign user', { userId: { _id: 'user-2', workspaceId: 'workspace-2', role: 'owner', status: 'active' } }],
    ['unscoped user', { userId: { _id: 'user-1', role: 'owner', status: 'active' } }],
    ['disabled user', { userId: { _id: 'user-1', workspaceId: 'workspace-1', status: 'disabled' } }]
  ])('rejects %s before touching activity', async (name, overrides) => {
    const { tokenTouch, userTouch } = install(candidate(overrides));
    await expect(resolve('synthetic-credential')).resolves.toBeNull();
    expect(tokenTouch).not.toHaveBeenCalled();
    expect(userTouch).not.toHaveBeenCalled();
  });

  test.each(['active', 'archived', 'deleting'])('preserves valid membership in a %s workspace for separately authorized operations', async status => {
    install(candidate({ workspaceId: { _id: 'workspace-1', name: 'Workspace', status } }));
    await expect(resolve('synthetic-credential')).resolves.toMatchObject({
      context: { workspaceId: 'workspace-1', userId: 'user-1', roles: ['manager'] }
    });
  });

  test('permits an intentionally userless service API token but not a userless session', async () => {
    install(candidate({ userId: null, populated: () => undefined, role: 'service', scopes: ['integrations:hai:read'] }));
    const resolved = await resolve('synthetic-credential');
    if (Model === ApiToken) {
      expect(resolved.context).toMatchObject({ workspaceId: 'workspace-1', userId: null, permissions: ['integrations:hai:read'], permissionsScoped: true });
    } else {
      expect(resolved).toBeNull();
    }
  });
});
