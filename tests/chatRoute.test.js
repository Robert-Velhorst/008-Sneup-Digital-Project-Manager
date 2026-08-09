const MEMBER_ID = '507f1f77bcf86cd799439011';

const createResponse = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  }
});

const loadMessageHandler = ({ quickResponse = null, fullResponse = null } = {}) => {
  jest.resetModules();
  const handleQuickQuery = jest.fn().mockResolvedValue(quickResponse);
  const processMessage = jest.fn().mockResolvedValue(fullResponse || {
    response: 'Full response',
    responseMode: 'provider',
    fallbackReason: null
  });
  jest.doMock('../src/services/conversationalAI', () => ({ handleQuickQuery, processMessage }));
  jest.doMock('../src/services/priorityEngine', () => ({}));
  jest.doMock('../src/models/Conversation', () => ({}));
  jest.doMock('../src/services/workspaceScopeService', () => ({
    getRequestWorkspaceObjectId: jest.fn(() => '507f191e810c19729de860ea'),
    scopeQuery: jest.fn(query => query)
  }));

  const router = require('../src/routes/chat');
  const layer = router.stack.find(item => item.route?.path === '/message' && item.route?.methods?.post);
  const handler = layer.route.stack.at(-1).handle;
  return { handler, handleQuickQuery, processMessage };
};

describe('chat message API contract', () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  test('rejects missing bodies, blank messages, and unknown channels before service work', async () => {
    const { handler, handleQuickQuery, processMessage } = loadMessageHandler();

    for (const body of [undefined, { memberId: MEMBER_ID, message: '   ' }, { memberId: MEMBER_ID, message: 'hello', channel: 'sms' }]) {
      const response = createResponse();
      await handler({ body }, response);
      expect(response.statusCode).toBe(400);
      expect(response.body.success).toBe(false);
    }
    expect(handleQuickQuery).not.toHaveBeenCalled();
    expect(processMessage).not.toHaveBeenCalled();
  });

  test('labels quick local answers as deterministic', async () => {
    const { handler, handleQuickQuery, processMessage } = loadMessageHandler({
      quickResponse: { response: 'Card #42 is next.', sourceEvidence: [{ type: 'card' }] }
    });
    const response = createResponse();

    await handler({ body: { memberId: MEMBER_ID, message: '  what now  ' } }, response);

    expect(response.body).toEqual({
      success: true,
      response: 'Card #42 is next.',
      sourceEvidence: [{ type: 'card' }],
      responseMode: 'deterministic',
      fallbackReason: null,
      quick: true
    });
    expect(handleQuickQuery).toHaveBeenCalledWith(MEMBER_ID, 'what now', expect.any(Object));
    expect(processMessage).not.toHaveBeenCalled();
  });

  test('preserves full-response provenance and normalized input', async () => {
    const fullResponse = {
      response: 'Local bounded response',
      responseMode: 'deterministic',
      fallbackReason: 'timeout',
      sourceEvidence: []
    };
    const { handler, processMessage } = loadMessageHandler({ fullResponse });
    const response = createResponse();

    await handler({ body: { memberId: MEMBER_ID, message: '  help me  ', channel: 'web_chat' } }, response);

    expect(response.body).toEqual({ success: true, ...fullResponse });
    expect(processMessage).toHaveBeenCalledWith(
      MEMBER_ID,
      'help me',
      'web_chat',
      undefined,
      expect.any(Object)
    );
  });
});
