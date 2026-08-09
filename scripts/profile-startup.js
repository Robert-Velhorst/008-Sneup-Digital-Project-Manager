const http = require('http');

process.env.SNEUP_DEMO_MODE = 'true';
process.env.SNEUP_NGROK_ENABLED = 'false';

const request = (port, requestPath) => new Promise((resolve, reject) => {
  const startedAt = performance.now();
  const call = http.get({ host: '127.0.0.1', port, path: requestPath }, response => {
    response.resume();
    response.on('end', () => resolve({
      path: requestPath,
      statusCode: response.statusCode,
      durationMs: Number((performance.now() - startedAt).toFixed(1))
    }));
  });
  call.on('error', reject);
});

const closeServer = server => new Promise((resolve, reject) => {
  server.close(error => error ? reject(error) : resolve());
});

const run = async () => {
  const importStartedAt = performance.now();
  const app = require('../src/index');
  const importDurationMs = performance.now() - importStartedAt;
  const importMemory = process.memoryUsage();
  const importModules = Object.keys(require.cache);

  const listenStartedAt = performance.now();
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });

  try {
    const port = server.address().port;
    const responses = [];
    responses.push(await request(port, '/health'));
    responses.push(await request(port, '/api/v1/security/context'));
    responses.push(await request(port, '/api/v1/feature-flags'));
    responses.push(...await Promise.all([
      request(port, '/api/v1/autopilot/mission-control'),
      request(port, '/api/v1/autopilot/operations-brief'),
      request(port, '/api/v1/jobs'),
      request(port, '/api/v1/security/response-timing')
    ]));

    const runtimeMemory = process.memoryUsage();
    const runtimeModules = Object.keys(require.cache);
    const result = {
      mode: 'demo',
      import: {
        durationMs: Number(importDurationMs.toFixed(1)),
        rssMb: Number((importMemory.rss / 1024 / 1024).toFixed(1)),
        heapUsedMb: Number((importMemory.heapUsed / 1024 / 1024).toFixed(1)),
        modules: importModules.length,
        mongooseLoaded: importModules.some(modulePath => modulePath.includes('node_modules\\mongoose'))
      },
      overview: {
        durationMs: Number((performance.now() - listenStartedAt).toFixed(1)),
        rssMb: Number((runtimeMemory.rss / 1024 / 1024).toFixed(1)),
        heapUsedMb: Number((runtimeMemory.heapUsed / 1024 / 1024).toFixed(1)),
        modules: runtimeModules.length,
        mongooseLoaded: runtimeModules.some(modulePath => modulePath.includes('node_modules\\mongoose')),
        responses
      }
    };

    if (responses.some(response => response.statusCode !== 200)) {
      process.exitCode = 1;
    }
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } finally {
    await closeServer(server);
  }
};

run().catch(error => {
  process.stderr.write(`Startup profile failed: ${error.message}\n`);
  process.exitCode = 1;
});
