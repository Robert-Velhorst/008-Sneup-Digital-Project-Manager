const mongoose = require('mongoose');

const executionEffectsSchema = new mongoose.Schema({
  outcome: { type: String, enum: ['failed'] },
  status: { type: String, enum: ['pending', 'completed', 'superseded'], required: true },
  auditId: { type: mongoose.Schema.Types.ObjectId, required: true },
  followUpId: { type: mongoose.Schema.Types.ObjectId, required: true },
  actor: String,
  nextAttemptAt: Date,
  completedAt: Date,
  interventionUpdated: Boolean,
  followUpScheduled: Boolean
}, { _id: false });

const trelloActionAttemptSchema = new mongoose.Schema({
  executionEffects: { type: executionEffectsSchema, default: undefined },
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    index: true
  },
  recommendationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Recommendation',
    index: true
  },
  interventionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Intervention',
    index: true
  },
  approvalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Approval',
    index: true
  },
  boardId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Board',
    index: true
  },
  cardId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Card',
    index: true
  },
  actionType: {
    type: String,
    required: true,
    index: true
  },
  payload: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'succeeded', 'failed', 'cancelled'],
    default: 'pending',
    index: true
  },
  startedAt: Date,
  finishedAt: Date,
  trelloResponse: mongoose.Schema.Types.Mixed,
  errorMessage: String,
  retryCount: {
    type: Number,
    default: 0
  },
  reconciliation: {
    status: {
      type: String,
      enum: ['not_needed', 'required', 'confirmed_succeeded', 'confirmed_failed'],
      default: 'not_needed',
      index: true
    },
    reason: String,
    evidence: String,
    confirmedSteps: [{ type: String }],
    pendingSteps: [{ type: String }],
    detectedAt: Date,
    reconciledBy: String,
    reconciledAt: Date
  }
}, {
  timestamps: true,
  optimisticConcurrency: true
});

trelloActionAttemptSchema.pre('save', function guardUnversionedSave() {
  // Mongoose omits its optimistic predicate for legacy records without a version key.
  if (!this.isNew) this.$where = { ...this.$where, __v: this.__v === undefined ? { $exists: false } : this.__v };
});

trelloActionAttemptSchema.index({ status: 1, createdAt: -1 });
trelloActionAttemptSchema.index({ boardId: 1, createdAt: -1 });
trelloActionAttemptSchema.index({ cardId: 1, createdAt: -1 });
trelloActionAttemptSchema.index({ workspaceId: 1, status: 1, createdAt: -1 });
trelloActionAttemptSchema.index({ workspaceId: 1, recommendationId: 1, createdAt: -1, _id: -1 });
trelloActionAttemptSchema.index({ workspaceId: 1, boardId: 1, createdAt: -1 });
trelloActionAttemptSchema.index({ workspaceId: 1, 'reconciliation.status': 1, updatedAt: -1 });
trelloActionAttemptSchema.index({ workspaceId: 1, status: 1, 'executionEffects.status': 1, 'executionEffects.nextAttemptAt': 1, _id: 1 });

module.exports = mongoose.models.TrelloActionAttempt || mongoose.model('TrelloActionAttempt', trelloActionAttemptSchema);
