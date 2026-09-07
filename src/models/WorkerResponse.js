const mongoose = require('mongoose');

const workerResponseSchema = new mongoose.Schema({
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
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    index: true
  },
  responseText: {
    type: String,
    select: false
  },
  claimState: {
    type: String,
    enum: ['pending', 'confirmed']
  },
  effects: {
    type: new mongoose.Schema({
      status: { type: String, enum: ['pending', 'completed'], required: true },
      auditId: { type: mongoose.Schema.Types.ObjectId, required: true },
      followUpAuditId: { type: mongoose.Schema.Types.ObjectId, required: true },
      actor: String,
      nextAttemptAt: Date,
      completedAt: Date,
      followUpIds: { type: [mongoose.Schema.Types.ObjectId], default: undefined },
      followUpResolution: mongoose.Schema.Types.Mixed
    }, { _id: false }),
    default: undefined
  },
  responseType: {
    type: String,
    enum: ['acknowledged', 'completed', 'blocked', 'needs_help', 'ignored', 'other'],
    default: 'other',
    index: true
  },
  receivedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  source: {
    type: String,
    enum: ['trello_comment', 'slack', 'teams', 'google_chat', 'discord', 'mattermost', 'webex', 'email', 'web_chat', 'api', 'manual', 'system'],
    default: 'api'
  }
}, {
  timestamps: true
});

workerResponseSchema.index({ memberId: 1, receivedAt: -1 });
workerResponseSchema.index({ cardId: 1, receivedAt: -1 });
workerResponseSchema.index({ workspaceId: 1, memberId: 1, receivedAt: -1 });
workerResponseSchema.index({ workspaceId: 1, cardId: 1, receivedAt: -1 });
workerResponseSchema.index({ workspaceId: 1, boardId: 1, receivedAt: -1 });
workerResponseSchema.index({ workspaceId: 1, recommendationId: 1, receivedAt: -1 });
workerResponseSchema.index({ workspaceId: 1, claimState: 1, _id: 1, createdAt: 1 });
workerResponseSchema.index({ workspaceId: 1, 'effects.status': 1, 'effects.nextAttemptAt': 1, _id: 1 });

module.exports = mongoose.models.WorkerResponse || mongoose.model('WorkerResponse', workerResponseSchema);
