const crypto = require('crypto');
const mongoose = require('mongoose');
const JobControl = require('../models/JobControl');
const logger = require('../utils/logger');

const DEFAULT_LEASE_DURATION_MS = 5 * 60 * 1000;
const LEASE_HEARTBEAT_MS = 60 * 1000;
const PROTECTED_TRIGGERS = new Set(['scheduled', 'startup', 'manual', 'api', 'worker']);

class JobLeaseService {
  constructor(options = {}) {
    this.JobControl = options.JobControl || JobControl;
    this.isDatabaseReady = options.isDatabaseReady || (() => mongoose.connection.readyState === 1);
    this.now = options.now || (() => new Date());
    this.randomUUID = options.randomUUID || crypto.randomUUID;
    this.setInterval = options.setInterval || setInterval;
    this.clearInterval = options.clearInterval || clearInterval;
    this.logger = options.logger || logger;
    this.instanceId = options.instanceId || this.randomUUID();
  }

  shouldProtect(triggerType) {
    return PROTECTED_TRIGGERS.has(String(triggerType || 'scheduled'));
  }

  async acquire(options = {}) {
    if (!this.shouldProtect(options.triggerType) || !this.isDatabaseReady()) {
      return { acquired: true, protected: false };
    }

    const now = this.now();
    const token = this.randomUUID();
    const durationMs = options.durationMs || DEFAULT_LEASE_DURATION_MS;
    const lease = {
      workspaceId: options.workspaceId,
      jobName: options.jobName,
      token,
      durationMs,
      protected: true
    };

    try {
      const control = await this.JobControl.findOneAndUpdate({
        workspaceId: options.workspaceId,
        jobName: options.jobName,
        status: { $ne: 'paused' },
        $or: [
          { leaseExpiresAt: null },
          { leaseExpiresAt: { $lte: now } }
        ]
      }, {
        $set: {
          leaseToken: token,
          leaseOwner: this.instanceId,
          leaseAcquiredAt: now,
          leaseHeartbeatAt: now,
          leaseExpiresAt: new Date(now.getTime() + durationMs)
        },
        $setOnInsert: { status: 'active' }
      }, {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true
      });

      return control
        ? { ...lease, acquired: true }
        : { ...lease, acquired: false };
    } catch (error) {
      if (error?.code === 11000) return { ...lease, acquired: false };
      throw error;
    }
  }

  startHeartbeat(lease) {
    if (!lease?.protected || !lease.acquired) return null;
    const timer = this.setInterval(() => {
      void this.renew(lease).catch(error => {
        this.logger.warn('Failed to renew distributed job lease', {
          jobName: lease.jobName,
          code: error.code
        });
      });
    }, Math.min(LEASE_HEARTBEAT_MS, Math.max(1000, Math.floor(lease.durationMs / 3))));
    timer.unref?.();
    return timer;
  }

  stopHeartbeat(timer) {
    if (timer) this.clearInterval(timer);
  }

  async renew(lease) {
    if (!lease?.protected || !lease.acquired || !this.isDatabaseReady()) return false;
    const now = this.now();
    const result = await this.JobControl.updateOne({
      workspaceId: lease.workspaceId,
      jobName: lease.jobName,
      leaseToken: lease.token
    }, {
      $set: {
        leaseHeartbeatAt: now,
        leaseExpiresAt: new Date(now.getTime() + lease.durationMs)
      }
    });
    return result.matchedCount === 1;
  }

  async release(lease) {
    if (!lease?.protected || !lease.acquired || !this.isDatabaseReady()) return false;
    const result = await this.JobControl.updateOne({
      workspaceId: lease.workspaceId,
      jobName: lease.jobName,
      leaseToken: lease.token
    }, {
      $unset: {
        leaseToken: '',
        leaseOwner: '',
        leaseAcquiredAt: '',
        leaseHeartbeatAt: '',
        leaseExpiresAt: ''
      }
    });
    return result.matchedCount === 1;
  }
}

const jobLeaseService = new JobLeaseService();

module.exports = jobLeaseService;
module.exports.DEFAULT_LEASE_DURATION_MS = DEFAULT_LEASE_DURATION_MS;
module.exports.JobLeaseService = JobLeaseService;
module.exports.PROTECTED_TRIGGERS = PROTECTED_TRIGGERS;
