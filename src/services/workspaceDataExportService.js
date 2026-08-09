const crypto = require('crypto');
const { WORKSPACE_COLLECTIONS } = require('./workspaceCollectionRegistry');

const SECRET_KEYS = new Set([
  'apikey',
  'apisecret',
  'accesstoken',
  'clientsecret',
  'credentials',
  'destinationencrypted',
  'password',
  'refreshtoken',
  'secret',
  'signingsecret',
  'tokenhash',
  'tokenprefix'
]);

const normalizedKey = (key) => String(key || '').replace(/[^a-z0-9]/gi, '').toLowerCase();

const sanitizeExportValue = (value, seen = new WeakSet()) => {
  if (value === null || value === undefined) return value;
  if (value instanceof Date) return value.toISOString();
  if (Buffer.isBuffer(value)) return '[binary omitted]';
  if (Array.isArray(value)) return value.map(item => sanitizeExportValue(item, seen));
  if (typeof value !== 'object') return value;
  if (typeof value.toHexString === 'function') return value.toHexString();
  if (seen.has(value)) return '[circular omitted]';

  seen.add(value);
  const output = {};
  for (const [key, child] of Object.entries(value)) {
    if (SECRET_KEYS.has(normalizedKey(key))) continue;
    output[key] = sanitizeExportValue(child, seen);
  }
  seen.delete(value);
  return output;
};

const assertWorkspaceExportOwner = (auth = {}) => {
  if ((auth.roles || []).includes('owner')) return;
  const error = new Error('Only a workspace owner can export workspace data');
  error.statusCode = 403;
  throw error;
};

class WorkspaceDataExportService {
  constructor(options = {}) {
    this.collections = options.collections || WORKSPACE_COLLECTIONS;
    this.batchSize = options.batchSize || 100;
    this.now = options.now || (() => new Date());
  }

  async *documentsFor(model, workspaceId) {
    let query = model.find({ workspaceId });
    if (typeof query.sort === 'function') query = query.sort({ _id: 1 });
    if (typeof query.lean === 'function') query = query.lean();

    if (typeof query.cursor === 'function') {
      const cursor = query.cursor({ batchSize: this.batchSize });
      for await (const document of cursor) yield document;
      return;
    }

    const documents = await query;
    for (const document of documents || []) yield document;
  }

  async *createExport({ workspace, actor }) {
    const exportedAt = this.now();
    const exportId = crypto.randomUUID();
    const workspaceId = workspace._id || workspace.id;
    const counts = {};

    yield JSON.stringify({
      type: 'manifest',
      format: 'sneup-workspace-export',
      version: 1,
      exportId,
      exportedAt: exportedAt.toISOString(),
      actor: String(actor || 'workspace-owner'),
      workspace: sanitizeExportValue(
        typeof workspace.toObject === 'function' ? workspace.toObject() : workspace
      ),
      secretMaterialIncluded: false
    }) + '\n';

    for (const [collection, model] of this.collections) {
      let count = 0;
      for await (const document of this.documentsFor(model, workspaceId)) {
        const plainDocument = typeof document.toObject === 'function'
          ? document.toObject()
          : document;
        yield JSON.stringify({
          type: 'record',
          collection,
          data: sanitizeExportValue(plainDocument)
        }) + '\n';
        count += 1;
      }
      counts[collection] = count;
    }

    yield JSON.stringify({
      type: 'complete',
      exportId,
      completedAt: this.now().toISOString(),
      counts
    }) + '\n';
  }

  fileName(workspace) {
    const slug = String(workspace.slug || workspace.name || 'workspace')
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'workspace';
    return `sneup-${slug}-export-${this.now().toISOString().slice(0, 10)}.ndjson`;
  }
}

module.exports = new WorkspaceDataExportService();
module.exports.WorkspaceDataExportService = WorkspaceDataExportService;
module.exports.EXPORT_COLLECTIONS = WORKSPACE_COLLECTIONS;
module.exports.assertWorkspaceExportOwner = assertWorkspaceExportOwner;
module.exports.sanitizeExportValue = sanitizeExportValue;
