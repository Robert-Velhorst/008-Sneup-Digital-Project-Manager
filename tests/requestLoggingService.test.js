const { EventEmitter } = require('events');
const { RequestLoggingService } = require('../src/services/requestLoggingService');

const response = (statusCode) => Object.assign(new EventEmitter(), { statusCode });

describe('bounded request logging', () => {
  test('does not write routine request logs by default', () => {
    const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
    const times = [0, 20];
    const service = new RequestLoggingService(logger, { now: () => times.shift(), slowRequestMs: 1000 });
    const res = response(200);
    const next = jest.fn();

    service.middleware()({ method: 'GET', path: '/health' }, res, next);
    res.emit('finish');

    expect(next).toHaveBeenCalledTimes(1);
    expect(logger.info).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
  });

  test('retains bounded slow and failed request diagnostics without query or body data', () => {
    const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
    const times = [0, 1500, 2000, 2010];
    const service = new RequestLoggingService(logger, { now: () => times.shift(), slowRequestMs: 1000 });
    const slow = response(200);
    const failed = response(503);

    service.middleware()({ sneupRequestId: 'request-slow', method: 'GET', path: '/api/reports', query: { token: 'private' }, body: { secret: 'private' } }, slow, jest.fn());
    slow.emit('finish');
    service.middleware()({ sneupRequestId: 'request-failed', method: 'POST', path: '/api/reports' }, failed, jest.fn());
    failed.emit('finish');

    expect(logger.warn).toHaveBeenCalledWith('Slow HTTP request', {
      requestId: 'request-slow', method: 'GET', path: '/api/reports', statusCode: 200, durationMs: 1500
    });
    expect(logger.error).toHaveBeenCalledWith('HTTP request failed', {
      requestId: 'request-failed', method: 'POST', path: '/api/reports', statusCode: 503, durationMs: 10
    });
    expect(JSON.stringify(logger.mock?.calls || [logger.warn.mock.calls, logger.error.mock.calls])).not.toContain('private');
  });

  test('supports explicit full request logging for operator diagnostics', () => {
    const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
    const times = [0, 5];
    const service = new RequestLoggingService(logger, { now: () => times.shift(), logAll: true });
    const res = response(204);

    service.middleware()({ sneupRequestId: 'request-all', method: 'POST', path: '/api/jobs/run' }, res, jest.fn());
    res.emit('finish');

    expect(logger.info).toHaveBeenCalledWith('HTTP request completed', {
      requestId: 'request-all', method: 'POST', path: '/api/jobs/run', statusCode: 204, durationMs: 5
    });
  });
});
