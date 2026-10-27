const { desktopPort, requestReadiness } = require('../desktop/readinessRequest');

describe('Desktop readiness loopback boundary', () => {
  test('retains the default desktop port', () => expect(desktopPort()).toBe(3197));

  test.each(['1', '3197', '49152', '65535', '03197'])('retains valid local listener port %s', port => {
    expect(desktopPort(port)).toBe(Number(port));
  });

  test.each(['0', '65536', '-1', '1.5', '1e3', ' 3197', '3197 ', '3197/other',
    '3197@evil.example', '3197?target=other', '3197#fragment', '3197\nevil', 'http://evil.example', '', null, 3197])
    ('rejects invalid port %s', port => expect(() => desktopPort(port)).toThrow('Desktop PORT'));

  test('constructs an HTTP options request with a literal loopback hostname and health path', () => {
    const request = {}; const http = { get: jest.fn(() => request) }; const callback = jest.fn();
    expect(requestReadiness(http, 49152, callback)).toBe(request);
    expect(http.get).toHaveBeenCalledWith({ hostname: '127.0.0.1', port: 49152, path: '/health' }, callback);
    expect(callback).not.toHaveBeenCalled();
  });

  test.each(['3197@evil.example', '3197/other', '65536'])('rejects malformed request port %s before HTTP', port => {
    const http = { get: jest.fn() };
    expect(() => requestReadiness(http, port, jest.fn())).toThrow('Desktop PORT');
    expect(http.get).not.toHaveBeenCalled();
  });
});
