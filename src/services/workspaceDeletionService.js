const crypto = require('crypto');
const Workspace = require('../models/Workspace');
const WorkspaceDeletionReceipt = require('../models/WorkspaceDeletionReceipt');
const { WORKSPACE_COLLECTIONS } = require('./workspaceCollectionRegistry');

const IDENTITY_COLLECTIONS = new Set(['apiTokens', 'sessionTokens', 'users']);
const CLEANUP_DELAYS_MS = [60_000, 5 * 60_000, 30 * 60_000, 2 * 60 * 60_000, 24 * 60 * 60_000];
const DEFAULT_LEASE_MS = 2 * 60_000;

const deletionError = (message, statusCode = 400, code = 'SNEUP_WORKSPACE_DELETION_INVALID') => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
};

const assertWorkspaceDeletionOwner = (auth = {}) => {
  if ((auth.roles || []).includes('owner')) return;
  throw deletionError('Only a workspace owner can permanently delete workspace data', 403, 'SNEUP_WORKSPACE_DELETION_OWNER_REQUIRED');
};

const publicDeletionReceipt = (receipt) => ({
  deletionId: receipt.deletionId,
  status: receipt.status,
  requestedAt: receipt.requestedAt,
  startedAt: receipt.startedAt,
  completedAt: receipt.completedAt,
  deletedCounts: { ...(receipt.deletedCounts || {}) }
});

class WorkspaceDeletionService {
  constructor(options = {}) {
    this.collections = options.collections || WORKSPACE_COLLECTIONS;
    this.Workspace = options.Workspace || Workspace;
    this.Receipt = options.Receipt || WorkspaceDeletionReceipt;
    this.now = options.now || (() => new Date());
    this.leaseMs = options.leaseMs || DEFAULT_LEASE_MS;
  }

  orderedCollections() {
    return [...this.collections].sort(([left], [right]) => {
      const leftIdentity = IDENTITY_COLLECTIONS.has(left) ? 1 : 0;
      const rightIdentity = IDENTITY_COLLECTIONS.has(right) ? 1 : 0;
      return leftIdentity - rightIdentity;
    });
  }

  validateRequest({ workspace, auth, confirmation, acknowledgePermanentDeletion }) {
    assertWorkspaceDeletionOwner(auth);
    if (!workspace) throw deletionError('Workspace not found', 404, 'SNEUP_WORKSPACE_DELETION_NOT_FOUND');
    if (!['archived', 'deleting'].includes(workspace.status)) {
      throw deletionError('Archive the workspace before permanently deleting its data', 409, 'SNEUP_WORKSPACE_DELETION_REQUIRES_ARCHIVE');
    }
    if (String(confirmation || '') !== String(workspace.slug || '')) {
      throw deletionError('Workspace confirmation does not match the workspace slug', 400, 'SNEUP_WORKSPACE_DELETION_CONFIRMATION_MISMATCH');
    }
    if (acknowledgePermanentDeletion !== true) {
      throw deletionError('Permanent workspace deletion must be explicitly acknowledged', 400, 'SNEUP_WORKSPACE_DELETION_ACKNOWLEDGEMENT_REQUIRED');
    }
  }

  async createOrLoadReceipt(workspaceId) {
    try {
      return await this.Receipt.findOneAndUpdate(
        { targetWorkspaceId: workspaceId },
        { $setOnInsert: { targetWorkspaceId: workspaceId, status: 'pending', requestedAt: this.now() } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      ).select('+targetWorkspaceId +leaseId +leaseExpiresAt');
    } catch (error) {
      if (error.code !== 11000) throw error;
      return this.Receipt.findOne({ targetWorkspaceId: workspaceId }).select('+targetWorkspaceId +leaseId +leaseExpiresAt');
    }
  }

  async acquire(receipt, { allowFailed = false } = {}) {
    const now = this.now();
    const leaseId = crypto.randomUUID();
    const eligibleStatuses = allowFailed ? ['pending', 'failed', 'in_progress'] : ['pending', 'in_progress'];
    const acquired = await this.Receipt.findOneAndUpdate({
      _id: receipt._id,
      status: { $in: eligibleStatuses },
      $or: [
        { leaseExpiresAt: { $exists: false } },
        { leaseExpiresAt: null },
        { leaseExpiresAt: { $lte: now } }
      ]
    }, {
      $set: {
        status: 'in_progress',
        startedAt: receipt.startedAt || now,
        leaseId,
        leaseExpiresAt: new Date(now.getTime() + this.leaseMs)
      },
      $unset: { failureStage: 1, failureCode: 1 }
    }, { new: true }).select('+targetWorkspaceId +leaseId +leaseExpiresAt');

    if (!acquired) {
      throw deletionError('Workspace deletion is already running', 409, 'SNEUP_WORKSPACE_DELETION_IN_PROGRESS');
    }
    return acquired;
  }

  async renewLease(receipt) {
    const now = this.now();
    const renewed = await this.Receipt.findOneAndUpdate({
      _id: receipt._id,
      leaseId: receipt.leaseId,
      status: 'in_progress'
    }, {
      $set: { leaseExpiresAt: new Date(now.getTime() + this.leaseMs) }
    }, { new: true }).select('+targetWorkspaceId +leaseId +leaseExpiresAt');
    if (!renewed) throw deletionError('Workspace deletion lease was lost', 409, 'SNEUP_WORKSPACE_DELETION_LEASE_LOST');
    return renewed;
  }

  async saveProgress(receipt) {
    receipt.markModified?.('plannedCounts');
    receipt.markModified?.('deletedCounts');
    await receipt.save();
    return this.renewLease(receipt);
  }

  async purgeCollection(receipt, name, model, workspaceId) {
    if (receipt.completedCollections.includes(name)) return receipt;
    const query = { workspaceId };
    if (!Object.prototype.hasOwnProperty.call(receipt.plannedCounts || {}, name)) {
      receipt.plannedCounts = { ...(receipt.plannedCounts || {}), [name]: await model.countDocuments(query) };
      receipt = await this.saveProgress(receipt);
    }

    const result = await model.deleteMany(query);
    const remaining = await model.countDocuments(query);
    if (remaining !== 0) {
      throw deletionError(`Workspace collection ${name} could not be fully deleted`, 500, 'SNEUP_WORKSPACE_DELETION_INCOMPLETE');
    }
    receipt.deletedCounts = {
      ...(receipt.deletedCounts || {}),
      [name]: Math.max(Number(receipt.plannedCounts?.[name] || 0), Number(result.deletedCount || 0))
    };
    receipt.completedCollections = [...new Set([...(receipt.completedCollections || []), name])];
    return this.saveProgress(receipt);
  }

  async sweepWorkspaceData(workspaceId) {
    const deletedCounts = {};
    for (const [name, model] of this.orderedCollections()) {
      const result = await model.deleteMany({ workspaceId });
      if (result.deletedCount) deletedCounts[name] = result.deletedCount;
    }
    return deletedCounts;
  }

  async purge(receipt) {
    const workspaceId = receipt.targetWorkspaceId;
    let stage = 'workspace_lock';
    try {
      const workspace = await this.Workspace.findOneAndUpdate({
        _id: workspaceId,
        status: { $in: ['archived', 'deleting'] }
      }, {
        $set: { status: 'deleting' }
      }, { new: true });
      if (!workspace) {
        const exists = await this.Workspace.exists({ _id: workspaceId });
        if (exists) throw deletionError('Workspace must remain archived during deletion', 409, 'SNEUP_WORKSPACE_DELETION_STATE_CHANGED');
      }

      for (const [name, model] of this.orderedCollections()) {
        stage = name;
        receipt = await this.purgeCollection(receipt, name, model, workspaceId);
      }

      stage = 'workspace';
      const workspaceResult = await this.Workspace.deleteOne({ _id: workspaceId, status: 'deleting' });
      const workspaceExists = await this.Workspace.exists({ _id: workspaceId });
      if (workspaceExists) throw deletionError('Workspace record could not be deleted', 500, 'SNEUP_WORKSPACE_DELETION_WORKSPACE_RETAINED');
      receipt.deletedCounts = {
        ...(receipt.deletedCounts || {}),
        workspace: Math.max(Number(receipt.deletedCounts?.workspace || 0), Number(workspaceResult.deletedCount || 0))
      };

      stage = 'late_write_sweep';
      const lateCounts = await this.sweepWorkspaceData(workspaceId);
      for (const [name, count] of Object.entries(lateCounts)) {
        receipt.deletedCounts[name] = Number(receipt.deletedCounts[name] || 0) + Number(count || 0);
      }

      const completedAt = this.now();
      receipt.status = 'completed';
      receipt.completedAt = completedAt;
      receipt.cleanupPass = 0;
      receipt.nextCleanupAt = new Date(completedAt.getTime() + CLEANUP_DELAYS_MS[0]);
      receipt.failureStage = undefined;
      receipt.failureCode = undefined;
      receipt.nextRetryAt = undefined;
      receipt.leaseId = undefined;
      receipt.leaseExpiresAt = undefined;
      receipt.markModified?.('deletedCounts');
      await receipt.save();
      return receipt;
    } catch (error) {
      await this.Receipt.updateOne({ _id: receipt._id }, {
        $set: {
          status: 'failed',
          failureStage: stage,
          failureCode: String(error.code || 'SNEUP_WORKSPACE_DELETION_FAILED').slice(0, 100),
          nextRetryAt: new Date(this.now().getTime() + 5 * 60_000)
        },
        $inc: { retryCount: 1 },
        $unset: { leaseId: 1, leaseExpiresAt: 1 }
      });
      throw error;
    }
  }

  async deleteWorkspace({ workspace, auth, confirmation, acknowledgePermanentDeletion }) {
    this.validateRequest({ workspace, auth, confirmation, acknowledgePermanentDeletion });
    let receipt = await this.createOrLoadReceipt(workspace._id || workspace.id);
    receipt = await this.acquire(receipt, { allowFailed: true });
    receipt = await this.purge(receipt);
    return publicDeletionReceipt(receipt);
  }

  async recoverInterruptedDeletions(limit = 10) {
    const now = this.now();
    const receipts = await this.Receipt.find({
      targetWorkspaceId: { $exists: true },
      $or: [
        { status: 'in_progress', leaseExpiresAt: { $lte: now } },
        { status: 'failed', nextRetryAt: { $lte: now }, retryCount: { $lt: 5 } }
      ]
    }).select('+targetWorkspaceId +leaseId +leaseExpiresAt').limit(limit);
    let recovered = 0;
    for (const candidate of receipts) {
      try {
        const receipt = await this.acquire(candidate, { allowFailed: true });
        await this.purge(receipt);
        recovered += 1;
      } catch (error) {
        if (error.code !== 'SNEUP_WORKSPACE_DELETION_IN_PROGRESS') throw error;
      }
    }
    return recovered;
  }

  async runDueCleanupPasses(limit = 10) {
    const now = this.now();
    const receipts = await this.Receipt.find({
      status: 'completed',
      nextCleanupAt: { $lte: now },
      targetWorkspaceId: { $exists: true }
    }).select('+targetWorkspaceId').limit(limit);
    let cleaned = 0;
    for (const receipt of receipts) {
      const lateCounts = await this.sweepWorkspaceData(receipt.targetWorkspaceId);
      receipt.deletedCounts = { ...(receipt.deletedCounts || {}) };
      for (const [name, count] of Object.entries(lateCounts)) {
        receipt.deletedCounts[name] = Number(receipt.deletedCounts[name] || 0) + Number(count || 0);
      }
      receipt.cleanupPass += 1;
      const nextDelay = CLEANUP_DELAYS_MS[receipt.cleanupPass];
      if (nextDelay) {
        receipt.nextCleanupAt = new Date(now.getTime() + nextDelay);
      } else {
        receipt.targetWorkspaceId = undefined;
        receipt.nextCleanupAt = undefined;
      }
      receipt.markModified?.('deletedCounts');
      await receipt.save();
      cleaned += 1;
    }
    return cleaned;
  }
}

module.exports = new WorkspaceDeletionService();
module.exports.WorkspaceDeletionService = WorkspaceDeletionService;
module.exports.assertWorkspaceDeletionOwner = assertWorkspaceDeletionOwner;
module.exports.publicDeletionReceipt = publicDeletionReceipt;
module.exports.CLEANUP_DELAYS_MS = CLEANUP_DELAYS_MS;
