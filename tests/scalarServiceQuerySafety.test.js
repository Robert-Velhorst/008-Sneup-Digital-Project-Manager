const mongoose = require('mongoose');
const NotificationDelivery = require('../src/models/NotificationDelivery');
const JobRun = require('../src/models/JobRun');
const { NotificationService } = require('../src/services/notificationService');
const notificationService = require('../src/services/notificationService');
const jobs = require('../src/services/jobObservabilityService');
const express = require('express');

describe('single-value service filters cannot supply MongoDB operators', () => {
  const workspace = new mongoose.Types.ObjectId('667788990011223344556677');
  const reference = new mongoose.Types.ObjectId('778899001122334455667788');
  let notifications;
  let deliveriesFind;
  let runsFind;

  beforeEach(() => {
    notifications = new NotificationService();
    jest.spyOn(notifications, 'requireDatabase').mockImplementation(() => {});
    jest.spyOn(notificationService, 'requireDatabase').mockImplementation(() => {});
    jest.spyOn(jobs, 'isDatabaseReady').mockReturnValue(true);
    jest.spyOn(jobs, 'resolveWorkspaceId').mockReturnValue(workspace);
    const query = () => ({
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([])
    });
    deliveriesFind = jest.spyOn(NotificationDelivery, 'find').mockImplementation(query);
    runsFind = jest.spyOn(JobRun, 'find').mockImplementation(query);
  });

  afterEach(() => jest.restoreAllMocks());

  const fields = [
    ['deliveries', 'status'], ['deliveries', 'policyId'],
    ['runs', 'jobName'], ['runs', 'jobType'], ['runs', 'status'], ['runs', 'boardId']
  ];
  const attacks = [
    ['not-equal operator', { $ne: null }],
    ['membership operator', { $in: ['queued', 'failed'] }],
    ['regex operator', { $regex: '.*' }],
    ['array implicit membership', ['queued', 'failed']],
    ['empty array implicit membership', []],
    ['boxed string', Object('queued')],
    ['number coercion', 7],
    ['boolean coercion', true]
  ];
  const invoke = (service, field, value) => service === 'deliveries'
    ? notifications.listDeliveries({ workspaceId: workspace, [field]: value })
    : jobs.listRuns({ workspaceId: workspace, [field]: value });

  test.each(fields.flatMap(([service, field]) => attacks.map(([label, value]) => [service, field, label, value])))
  ('%s rejects %s as %s before querying', async (service, field, label, value) => {
    await expect(invoke(service, field, value)).rejects.toMatchObject({
      name: 'TypeError', statusCode: 400
    });
    expect(deliveriesFind).not.toHaveBeenCalled();
    expect(runsFind).not.toHaveBeenCalled();
  });

  test.each(fields)('%s preserves literal %s strings and workspace ownership', async (service, field) => {
    const literal = field.endsWith('Id') ? reference.toHexString() : '$ne';
    await expect(invoke(service, field, literal)).resolves.toEqual([]);
    const find = service === 'deliveries' ? deliveriesFind : runsFind;
    expect(find).toHaveBeenCalledTimes(1);
    expect(find).toHaveBeenCalledWith({ workspaceId: workspace, [field]: literal });
  });

  test.each([['deliveries', 'policyId'], ['runs', 'boardId']])
  ('%s preserves genuine ObjectId %s identity', async (service, field) => {
    await expect(invoke(service, field, reference)).resolves.toEqual([]);
    const find = service === 'deliveries' ? deliveriesFind : runsFind;
    expect(find).toHaveBeenCalledWith({ workspaceId: workspace, [field]: reference.toHexString() });
  });

  test.each([['deliveries', 'policyId'], ['runs', 'boardId']])
  ('%s rejects an ObjectId-shaped %s returning an operator object', async (service, field) => {
    const forged = Object.create(mongoose.Types.ObjectId.prototype);
    forged.toHexString = () => ({ $ne: null });
    await expect(invoke(service, field, forged)).rejects.toMatchObject({ statusCode: 400 });
    expect(deliveriesFind).not.toHaveBeenCalled();
    expect(runsFind).not.toHaveBeenCalled();
  });

  // The production app uses the extended parser. Mount its actual routers and
  // permission middleware with a synthetic authorized workspace; no real auth
  // provider or database acceptance is claimed by these query-boundary cases.
  const httpResponse = async (route, query, auth = { authenticated: true, permissions: ['audit:read'] }) => {
    const app = express();
    app.set('query parser', 'extended');
    app.use((req, res, next) => {
      req.auth = { ...auth, workspaceId: workspace.toHexString(), permissionsScoped: true };
      next();
    });
    app.use('/notifications', require('../src/routes/notifications'));
    app.use('/jobs', require('../src/routes/jobs'));
    const server = await new Promise(resolve => {
      const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
    });
    try {
      const response = await fetch(`http://127.0.0.1:${server.address().port}${route}?${query}`);
      return { status: response.status, body: await response.json() };
    } finally {
      server.closeAllConnections();
      await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
  };

  test.each(fields.flatMap(([service, field]) => ['operator', 'repeated'].map(shape => [service, field, shape])))
  ('actual %s route rejects %s %s query input with 400', async (service, field, shape) => {
    const route = service === 'deliveries' ? '/notifications/deliveries' : '/jobs/runs';
    const query = shape === 'operator' ? `${field}%5B%24ne%5D=x` : `${field}=queued&${field}=failed`;
    const response = await httpResponse(route, query);
    expect(response).toEqual({ status: 400, body: { success: false, error: 'Query filter must be a single string' } });
    expect(deliveriesFind).not.toHaveBeenCalled();
    expect(runsFind).not.toHaveBeenCalled();
  });

  test.each([
    [401, { authenticated: false, permissions: ['audit:read'] }],
    [403, { authenticated: true, permissions: [] }]
  ])('actual query route retains the %s permission gate', async (expected, auth) => {
    const response = await httpResponse('/jobs/runs', 'status%5B%24ne%5D=x', auth);
    expect(response.status).toBe(expected);
    expect(deliveriesFind).not.toHaveBeenCalled();
    expect(runsFind).not.toHaveBeenCalled();
  });
});
