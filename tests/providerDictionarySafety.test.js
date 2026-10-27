const { sanitizeExportValue } = require('../src/services/workspaceDataExportService');
const autopilotService = require('../src/services/autopilotService');
const workGraphService = require('../src/services/workGraphService');
const List = require('../src/models/List');

const keys = ['__proto__', 'constructor', 'prototype', 'toString'];
const workspaceId = '507f1f77bcf86cd799439011';
afterEach(() => jest.restoreAllMocks());

describe('Provider dictionaries retain data without inherited properties', () => {
  test.each(keys)('workspace export preserves %s as a JSON data key', key => {
    const source = JSON.parse(`{"${key}":{"visible":"kept","apiKey":"private-key"},"name":"record"}`);
    const output = sanitizeExportValue(source);
    expect(Object.getPrototypeOf(output)).toBeNull();
    expect(Object.hasOwn(output, key)).toBe(true);
    expect(output[key]).toEqual({ visible: 'kept' });
    expect(Object.getPrototypeOf(output[key])).toBeNull();
    expect(JSON.parse(JSON.stringify(output))).toEqual(JSON.parse(`{"${key}":{"visible":"kept"},"name":"record"}`));
    expect(Object.hasOwn({}, 'visible')).toBe(false);
    expect(Object.getPrototypeOf(source)).toBe(Object.prototype);
  });

  test.each(keys)('board grouping treats %s as a board identifier', async key => {
    const records = [{ _id: 'list-1', boardId: key, name: 'Inbox' }, { _id: 'list-2', boardId: key, name: 'Doing' }];
    const chain = { select: jest.fn(), sort: jest.fn(), lean: jest.fn().mockResolvedValue(records) };
    chain.select.mockReturnValue(chain); chain.sort.mockReturnValue(chain);
    jest.spyOn(List, 'find').mockReturnValue(chain);
    const output = await autopilotService.getListsByBoard([{ _id: key, workspaceId }], { workspaceId });
    expect(Object.getPrototypeOf(output)).toBeNull();
    expect(Object.hasOwn(output, key)).toBe(true);
    expect(output[key]).toEqual(records);
    expect(JSON.parse(JSON.stringify(output))[key]).toEqual(records);
    expect(List.find).toHaveBeenCalledWith(expect.objectContaining({ boardId: { $in: [key] }, closed: false }));
    expect(Object.getPrototypeOf({})).toBe(Object.prototype);
  });

  test.each(keys)('dependency counting treats %s as a type rather than an inherited property', key => {
    const summary = workGraphService.normalizeDependencySummary();
    workGraphService.addDependencyToSummary(summary, key, 'source');
    workGraphService.addDependencyToSummary(summary, key, 'target', 'stale');
    expect(Object.getPrototypeOf(summary.dependencyTypes)).toBeNull();
    expect(Object.hasOwn(summary.dependencyTypes, key)).toBe(true);
    expect(summary.dependencyTypes[key]).toBe(2);
    expect(summary).toMatchObject({ dependencyCount: 2, activeDependencyCount: 1, staleDependencyCount: 1, relatedCount: 1 });
    expect(JSON.parse(JSON.stringify(summary)).dependencyTypes[key]).toBe(2);
    expect(Object.hasOwn({}, key)).toBe(false);
  });

  test('normalization copies only own dependency-count keys without mutating the source', () => {
    const inherited = { ignored: 99 };
    const source = Object.assign(Object.create(inherited), { blocks: 3 });
    const summary = workGraphService.normalizeDependencySummary({ dependencyCount: 3, dependencyTypes: source });
    expect(Object.getPrototypeOf(summary.dependencyTypes)).toBeNull();
    expect(Object.keys(summary.dependencyTypes)).toEqual(['blocks']);
    workGraphService.addDependencyToSummary(summary, 'blocks', 'source');
    expect(summary.dependencyTypes.blocks).toBe(4);
    expect(source.blocks).toBe(3);
    expect(Object.getPrototypeOf(source)).toBe(inherited);
  });

  test('direct summary updates upgrade an ordinary dictionary and preserve its existing counts', () => {
    const original = JSON.parse('{"blocks":2,"__proto__":4}');
    const summary = { dependencyCount: 6, dependencyTypes: original, relatedCount: 0 };
    workGraphService.addDependencyToSummary(summary, '__proto__', 'source');
    expect(Object.getPrototypeOf(summary.dependencyTypes)).toBeNull();
    expect(summary.dependencyTypes.__proto__).toBe(5);
    expect(summary.dependencyTypes.blocks).toBe(2);
    expect(original.__proto__).toBe(4);
    expect(Object.getPrototypeOf(original)).toBe(Object.prototype);
  });

  test('recursive export still removes credentials and binary values while retaining shared visible data', () => {
    const shared = { visible: 'kept', credentials: { token: 'private-token' } };
    const output = sanitizeExportValue({ first: shared, second: shared, buffer: Buffer.from('private-binary') });
    expect(JSON.parse(JSON.stringify(output))).toEqual({ first: { visible: 'kept' }, second: { visible: 'kept' }, buffer: '[binary omitted]' });
  });
});
