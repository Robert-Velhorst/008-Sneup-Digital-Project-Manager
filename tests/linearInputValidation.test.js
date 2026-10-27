const { validateInviteInput } = require('../src/services/workspaceInviteService');
const { slugifyWorkspaceKey } = require('../src/services/workspaceScopeService');
const { extractApiKey } = require('../src/utils/requestSecurity');

describe('Linear input validation', () => {
  test.each([
    [' person@example.test ', 'person@example.test'], ['PERSON+tag@Example.Test', 'person+tag@example.test'],
    ['x@a.b', 'x@a.b'], ['x@..a', 'x@..a'], ['x@a..', 'x@a..'], ['x@...', 'x@...'],
    ['x@.a.b', 'x@.a.b'], ['x@y.z.w', 'x@y.z.w']
  ])('retains invitation address normalization for %s', (email, normalized) => {
    expect(validateInviteInput({ email, displayName: ' Person ', role: 'viewer' }))
      .toEqual({ email: normalized, displayName: 'Person', role: 'viewer' });
  });

  test.each(['', 'x', '@a.b', 'x@', 'x@@a.b', 'x@y@z.w', 'x@ab', 'x@.ab', 'x@ab.',
    'x@.a.', 'x @a.b', 'x@a b.c', 'x@a.\nb', 'x@a.\tb'])('rejects malformed invitation address %s', email => {
    expect(() => validateInviteInput({ email, displayName: 'Person' })).toThrow('valid invitation email');
  });

  test.each([
    [' Delivery / Main ', 'delivery-main'], ['---HELLO---', 'hello'], ['a---b', 'a-b'],
    ['!!!', 'default'], ['', 'default'], [null, 'default'], ['123', '123'],
    ['équipe', 'quipe'], ['A_ B / C', 'a-b-c'], ['already-valid', 'already-valid']
  ])('retains workspace slug normalization for %s', (input, output) => {
    expect(slugifyWorkspaceKey(input)).toBe(output);
  });

  test.each([
    ['Bearer key', 'key'], ['bearer key', 'key'], ['BEARER\tkey', 'key'], ['Bearer    key', 'key'],
    ['Bearer key with spaces', 'key with spaces'], ['Bearer key ', 'key '], ['Bearer key\tpart', 'key\tpart'],
    ['Bearer opaque+/=?#', 'opaque+/=?#']
  ])('retains unambiguous Bearer token %s', (authorization, output) => {
    expect(extractApiKey({ get: name => name === 'authorization' ? authorization : undefined })).toBe(output);
  });

  test.each(['', 'Basic key', 'Bearer', 'Bearer ', 'Bearer    ', 'Bearerkey', ' Bearer key',
    'Bearer key\nother', 'Bearer key\rother', 'Bearer key\u2028other', 'Bearer key\u2029other', {}])
    ('rejects missing or ambiguous Bearer input %s', authorization => {
      expect(extractApiKey({ get: name => name === 'authorization' ? authorization : undefined })).toBeNull();
    });

  test('retains explicit API-key header precedence without inspecting Authorization', () => {
    const get = jest.fn(name => {
      if (name === 'x-sneup-api-key') return 'explicit-key';
      throw new Error('Authorization should not be inspected');
    });
    expect(extractApiKey({ get })).toBe('explicit-key');
    expect(get).toHaveBeenCalledTimes(1);
  });

  test('handles long dot-heavy addresses and rejects embedded whitespace without backtracking', () => {
    const email = `x@${'!.'.repeat(100000)}`;
    expect(() => validateInviteInput({ email: `${email} `, displayName: 'Person' })).not.toThrow();
    expect(() => validateInviteInput({ email: `x@${'!.'.repeat(100000)}\nother`, displayName: 'Person' }))
      .toThrow('valid invitation email');
  });

  test('normalizes long slug edges while preserving the interior', () => {
    expect(slugifyWorkspaceKey(`${'-'.repeat(200000)}A B${'-'.repeat(200000)}`)).toBe('a-b');
  });

  test('handles a long Bearer whitespace prefix and rejects a whitespace-only credential', () => {
    const prefix = `Bearer${' '.repeat(200000)}`;
    expect(extractApiKey({ get: name => name === 'authorization' ? `${prefix}key` : undefined })).toBe('key');
    expect(extractApiKey({ get: name => name === 'authorization' ? prefix : undefined })).toBeNull();
  });
});
