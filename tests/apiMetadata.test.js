const http = require('http');
const app = require('../src/index');

const request = (port, path) => new Promise((resolve, reject) => {
  const call = http.get({ host: '127.0.0.1', port, path }, response => {
    const chunks = [];
    response.on('data', chunk => chunks.push(chunk));
    response.on('end', () => resolve({
      statusCode: response.statusCode,
      contentType: response.headers['content-type'],
      body: Buffer.concat(chunks).toString('utf8')
    }));
  });
  call.on('error', reject);
});

describe('browser root and API metadata wiring', () => {
  let server;
  let port;

  beforeAll(async () => {
    server = app.listen(0, '127.0.0.1');
    await new Promise((resolve, reject) => {
      server.once('listening', resolve);
      server.once('error', reject);
    });
    port = server.address().port;
  });

  afterAll(async () => {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  });

  test('serves the command center at root and product capabilities at /api', async () => {
    const [root, metadata] = await Promise.all([
      request(port, '/'),
      request(port, '/api')
    ]);

    expect(root).toMatchObject({ statusCode: 200 });
    expect(root.contentType).toMatch(/^text\/html/);
    expect(root.body).toContain('Sneup Command Center');

    expect(metadata).toMatchObject({ statusCode: 200 });
    expect(metadata.contentType).toMatch(/^application\/json/);
    expect(JSON.parse(metadata.body)).toMatchObject({
      name: 'Sneup',
      features: expect.arrayContaining([
        'HAI approval-gated integration',
        'Authenticated ngrok ingress'
      ])
    });
  });
});
