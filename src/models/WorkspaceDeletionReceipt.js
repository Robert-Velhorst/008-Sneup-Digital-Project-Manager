const crypto = require('crypto');
const mongoose = require('mongoose');

const workspaceDeletionReceiptSchema = new mongoose.Schema({
  deletionId: {
    type: String,
    default: () => crypto.randomUUID(),
    unique: true,
    immutable: true
  },
  targetWorkspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    select: false
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'failed', 'completed'],
    default: 'pending',
    index: true
  },
  requestedAt: {
    type: Date,
    default: Date.now
  },
  startedAt: Date,
  completedAt: Date,
  plannedCounts: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  deletedCounts: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  completedCollections: {
    type: [String],
    default: []
  },
  leaseId: {
    type: String,
    select: false
  },
  leaseExpiresAt: {
    type: Date,
    select: false,
    index: true
  },
  failureStage: String,
  failureCode: String,
  retryCount: {
    type: Number,
    default: 0
  },
  nextRetryAt: {
    type: Date,
    index: true
  },
  cleanupPass: {
    type: Number,
    default: 0
  },
  nextCleanupAt: {
    type: Date,
    index: true
  }
}, {
  timestamps: true
});

workspaceDeletionReceiptSchema.index(
  { targetWorkspaceId: 1 },
  { unique: true, partialFilterExpression: { targetWorkspaceId: { $type: 'objectId' } } }
);
workspaceDeletionReceiptSchema.index({ status: 1, nextCleanupAt: 1 });
workspaceDeletionReceiptSchema.index({ status: 1, nextRetryAt: 1 });

module.exports = mongoose.models.WorkspaceDeletionReceipt
  || mongoose.model('WorkspaceDeletionReceipt', workspaceDeletionReceiptSchema);
