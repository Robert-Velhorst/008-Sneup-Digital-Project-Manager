const http = require('node:http');
const { createRequire } = require('node:module');
const express = require('express');
const app = require('../src/index');

const parsers = ['express', 'body-parser'].map(name => [
  name,
  createRequire(require.resolve(name))('qs')
]);

describe.each(parsers)('%s query-string dependency safety', (name, qs) => {
  test.each(['items=1,2,3,4', 'items[]=1,2,3,4', 'items%5B%5D=1,2,3,4'])(
    'rejects comma arrays above the configured limit: %s', value => {
      expect(() => qs.parse(value, {
        comma: true,
        arrayLimit: 3,
        throwOnLimitExceeded: true
      })).toThrow(RangeError);
    }
  );

  test.each([{ plainObjects: true }, { allowPrototypes: true }])(
    'round-trips attacker-supplied constructor keys without throwing: %j', options => {
      const value = qs.parse('item%5Bconstructor%5D%5BisBuffer%5D=text', options);
      expect(() => qs.stringify(value)).not.toThrow();
      expect(qs.stringify(value)).toBe('item%5Bconstructor%5D%5BisBuffer%5D=text');
    }
  );

  test('preserves ordinary arrays, nested fields, Unicode and real buffers', () => {
    const value = { filter: { owner: 'Robert', labels: ['review', 'ready'] }, title: 'Cafe\u00e9' };
    expect(qs.parse(qs.stringify(value))).toEqual(value);
    expect(qs.stringify({ value: Buffer.from('ready') })).toBe('value=ready');
  });
});

describe('configured Sneup request parsers', () => {
  let server;
  let port;

  const request = (requestPath, body) => new Promise((resolve, reject) => {
    const call = http.request({
      host: '127.0.0.1', port, path: requestPath,
      method: body === undefined ? 'GET' : 'POST',
      headers: body === undefined ? {} : {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body)
      }
    }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve({
        status: response.statusCode,
        data: JSON.parse(Buffer.concat(chunks).toString('utf8'))
      }));
    });
    call.on('error', reject);
    call.end(body);
  });

  beforeAll(async () => {
    // Reuse the application's configured parsers without adding a test endpoint to Sneup.
    const formParser = app._router.stack.find(layer => layer.name === 'urlencodedParser');
    expect(formParser).toBeDefined();
    const probe = express();
    probe.set('query parser', app.get('query parser fn'));
    probe.use(formParser.handle);
    probe.use((req, res) => res.json({ query: req.query, body: req.body }));
    probe.use((error, req, res, next) => res.status(error.status || 500).json({ type: error.type }));
    server = probe.listen(0, '127.0.0.1');
    await new Promise((resolve, reject) => {
      server.once('listening', resolve);
      server.once('error', reject);
    });
    port = server.address().port;
  });

  afterAll(async () => {
    if (server) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  });

  test('retains nested filters, repeated values and encoded form text', async () => {
    const result = await request('/?filter[owner]=Robert&labels[]=review&labels[]=ready',
      'title=Caf%C3%A9+review&options[enabled]=true&members[]=one&members[]=two');
    expect(result).toEqual({
      status: 200,
      data: {
        query: { filter: { owner: 'Robert' }, labels: ['review', 'ready'] },
        body: { title: 'Caf\u00e9 review', options: { enabled: 'true' }, members: ['one', 'two'] }
      }
    });
  });

  test('continues rejecting excessive form parameters', async () => {
    const result = await request('/', Array.from({ length: 1001 }, (_, index) => `key${index}=value`).join('&'));
    expect(result).toEqual({ status: 413, data: { type: 'parameters.too.many' } });
  });

  test('preserves OAuth encoding, repeated scalars, indexed arrays and literal commas', async () => {
    const result = await request('/?code=a%2Bb%2Fc%3D&state=signed%2Bstate&tag=one&tag=two&items[0]=first&items[1]=second&text=a,b');
    expect(result.status).toBe(200);
    expect(result.data.query).toEqual({
      code: 'a+b/c=', state: 'signed+state', tag: ['one', 'two'], items: ['first', 'second'], text: 'a,b'
    });
  });

  test('continues rejecting excessive nested form depth', async () => {
    const result = await request('/', `key${'[child]'.repeat(33)}=value`);
    expect(result).toEqual({ status: 400, data: { type: 'querystring.parse.rangeError' } });
  });
});
