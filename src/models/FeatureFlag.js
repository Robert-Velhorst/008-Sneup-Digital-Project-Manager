const mongoose = require('mongoose');

const featureFlagHistorySchema = new mongoose.Schema({
  revision: { type: Number, required: true },
  enabled: { type: Boolean, required: true },
  rolloutPercentage: { type: Number, required: true, min: 0, max: 100 },
  actor: { type: String, required: true },
  reason: { type: String, default: '' },
  changedAt: { type: Date, required: true }
}, { _id: false });

const featureFlagSchema = new mongoose.Schema({
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true
  },
  key: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  enabled: {
    type: Boolean,
    default: true
  },
  rolloutPercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 100
  },
  reason: {
    type: String,
    default: ''
  },
  revision: {
    type: Number,
    min: 0,
    default: 0
  },
  updatedBy: {
    type: String,
    default: 'system'
  },
  history: {
    type: [featureFlagHistorySchema],
    default: [],
    select: false
  }
}, {
  timestamps: true
});

featureFlagSchema.index({ workspaceId: 1, key: 1 }, { unique: true });
featureFlagSchema.index({ workspaceId: 1, updatedAt: -1 });

module.exports = mongoose.models.FeatureFlag || mongoose.model('FeatureFlag', featureFlagSchema);
