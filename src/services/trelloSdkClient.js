const DEFAULT_TRELLO_API_URL = 'https://api.trello.com/1';

const readBoundedBody = async (response, maximumBytes) => {
  const declaredLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) {
    await response.body?.cancel();
    throw new RangeError(`Trello response exceeded the ${maximumBytes}-byte limit`);
  }

  if (!response.body) return '';

  const reader = response.body.getReader();
  const chunks = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maximumBytes) {
        await reader.cancel();
        throw new RangeError(`Trello response exceeded the ${maximumBytes}-byte limit`);
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }

  return Buffer.concat(chunks, totalBytes).toString('utf8');
};

const abortableDelay = (durationMs, signal) => new Promise((resolve, reject) => {
  if (signal.aborted) {
    reject(signal.reason);
    return;
  }

  const timer = setTimeout(() => {
    signal.removeEventListener('abort', onAbort);
    resolve();
  }, durationMs);
  const onAbort = () => {
    clearTimeout(timer);
    reject(signal.reason);
  };
  signal.addEventListener('abort', onAbort, { once: true });
});

const createTrelloTransport = (options, { buildUrl, fetchImpl = globalThis.fetch } = {}) => {
  const { apiKey, apiToken, timeoutMs, maxContentLength, maxBodyLength } = options;
  return {
    async sendRequest(request) {
      const body = request.body === undefined || request.body === null
        ? undefined
        : typeof request.body === 'string'
          ? request.body
          : JSON.stringify(request.body);

      if (body !== undefined && Buffer.byteLength(body) > maxBodyLength) {
        throw new RangeError(`Trello request exceeded the ${maxBodyLength}-byte limit`);
      }

      const url = buildUrl(`${DEFAULT_TRELLO_API_URL}${request.url}`, {
        ...request.searchParams,
        key: apiKey,
        token: apiToken
      });
      const headers = {
        ...(body !== undefined && typeof request.body !== 'string'
          ? { 'Content-Type': 'application/json' }
          : {}),
        ...request.headers
      };
      const timeoutSignal = AbortSignal.timeout(timeoutMs);
      const signal = request.signal
        ? AbortSignal.any([request.signal, timeoutSignal])
        : timeoutSignal;
      const init = {
        method: request.method || 'GET',
        headers: Object.keys(headers).length ? headers : undefined,
        body,
        signal,
        redirect: 'manual'
      };

      let response;
      for (let attempt = 0; attempt < 4; attempt += 1) {
        response = await fetchImpl(url, init);
        if (response.status !== 429 || attempt === 3) break;
        await response.body?.cancel();
        await abortableDelay(2000 * (2 ** attempt), signal);
      }

      const responseText = await readBoundedBody(response, maxContentLength);
      if (!response.ok) {
        const error = new Error(
          `Request failed: ${response.status} ${response.statusText}${responseText ? ` - ${responseText}` : ''}`
        );
        error.response = {
          status: response.status,
          statusText: response.statusText,
          data: responseText,
          headers: response.headers
        };
        throw error;
      }

      const contentType = response.headers.get('content-type');
      if (response.status === 204 || (contentType && !contentType.includes('application/json'))) {
        return undefined;
      }

      const data = responseText ? JSON.parse(responseText) : undefined;
      return request.schema ? request.schema.parse(data) : data;
    }
  };
};

const createTrelloSdkClient = async (options) => {
  const [{ createTrelloClient }, { buildUrl }] = await Promise.all([
    import('trello.js'),
    import('trello.js/core')
  ]);

  return createTrelloClient(createTrelloTransport(options, { buildUrl }));
};

module.exports = { createTrelloSdkClient, createTrelloTransport };
