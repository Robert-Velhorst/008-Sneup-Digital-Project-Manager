const desktopPort = (raw = '3197') => {
  if (typeof raw !== 'string' || !/^[0-9]{1,5}$/.test(raw)) throw new Error('Desktop PORT must be an integer from 1 to 65535.');
  const port = Number(raw);
  if (port < 1 || port > 65535) throw new Error('Desktop PORT must be an integer from 1 to 65535.');
  return port;
};

const requestReadiness = (http, port, callback) => http.get({
  hostname: '127.0.0.1',
  port: desktopPort(String(port)),
  path: '/health'
}, callback);

module.exports = { desktopPort, requestReadiness };
