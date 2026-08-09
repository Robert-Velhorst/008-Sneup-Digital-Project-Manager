const mongoose = require('mongoose');

const workspaceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'archived', 'deleting'],
    default: 'active',
    index: true
  },
  plan: {
    type: String,
    enum: ['local', 'team', 'enterprise'],
    default: 'local'
  },
  settings: {
    requireApprovalForTrelloWrites: {
      type: Boolean,
      default: true
    },
    defaultDecisionOwner: {
      type: String,
      enum: ['robert', 'va', 'team', 'system'],
      default: 'robert'
    },
    dataRetention: {
      enabled: {
        type: Boolean,
        default: false
      },
      operationalDays: {
        type: Number,
        min: 30,
        max: 730,
        default: 90
      },
      performanceDays: {
        type: Number,
        min: 180,
        max: 2555,
        default: 730
      },
      notificationDays: {
        type: Number,
        min: 90,
        max: 2555,
        default: 365
      },
      credentialDays: {
        type: Number,
        min: 30,
        max: 730,
        default: 90
      },
      lastProcessedAt: Date
    }
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

workspaceSchema.index({ slug: 1 }, { unique: true });
workspaceSchema.index({ status: 1, updatedAt: -1 });
workspaceSchema.index({ status: 1, 'settings.dataRetention.enabled': 1, 'settings.dataRetention.lastProcessedAt': 1 });

workspaceSchema.statics.defaultWorkspaceKey = function() {
  return process.env.SNEUP_DEFAULT_WORKSPACE_ID || 'default';
};

workspaceSchema.statics.defaultWorkspaceName = function() {
  return process.env.SNEUP_DEFAULT_WORKSPACE_NAME || 'Sneup Local Workspace';
};

module.exports = mongoose.models.Workspace || mongoose.model('Workspace', workspaceSchema);
