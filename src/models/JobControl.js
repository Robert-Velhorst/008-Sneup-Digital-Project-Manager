const mongoose = require('mongoose');

const jobControlSchema = new mongoose.Schema({
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true
  },
  jobName: {
    type: String,
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['active', 'paused'],
    default: 'active',
    index: true
  },
  pausedAt: Date,
  pausedBy: String,
  pausedReason: String,
  resumedAt: Date,
  resumedBy: String,
  lastManualRunAt: Date,
  lastManualRunBy: String,
  leaseToken: {
    type: String,
    select: false
  },
  leaseOwner: {
    type: String,
    select: false
  },
  leaseAcquiredAt: Date,
  leaseHeartbeatAt: Date,
  leaseExpiresAt: Date
}, {
  timestamps: true
});

jobControlSchema.index({ workspaceId: 1, jobName: 1 }, { unique: true });
jobControlSchema.index({ workspaceId: 1, status: 1, updatedAt: -1 });
jobControlSchema.index({ workspaceId: 1, leaseExpiresAt: 1 });

module.exports = mongoose.models.JobControl || mongoose.model('JobControl', jobControlSchema);
