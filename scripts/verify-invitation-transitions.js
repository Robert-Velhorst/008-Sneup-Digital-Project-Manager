const assert = require('node:assert/strict');
const { Types } = require('mongoose');
const WorkspaceInvite = require('../src/models/WorkspaceInvite');
const SessionToken = require('../src/models/SessionToken');
const User = require('../src/models/User');
const AuditEvent = require('../src/models/AuditEvent');
const { withTimeout } = require('../src/utils/runtimeShutdown');

// Pause one real MongoDB read so both HTTP race orderings are deterministic.
const pauseRead = predicate => {
  const original = WorkspaceInvite.findOne;
  let release;
  let observed;
  let used = false;
  const entered = new Promise(resolve => { observed = resolve; });
  const resume = new Promise(resolve => { release = resolve; });
  WorkspaceInvite.findOne = function(filter, ...args) {
    const query = original.call(this, filter, ...args);
    if (!used && predicate(filter)) {
      used = true;
      const execute = query.exec.bind(query);
      query.exec = async () => {
        const document = await execute();
        observed();
        await resume;
        return document;
      };
    }
    return query;
  };
  return {
    entered: () => withTimeout(entered, { timeoutMs: 5000, message: 'Invitation race read was not observed', code: 'INVITE_FIXTURE_TIMEOUT' }),
    release,
    restore: () => { release(); WorkspaceInvite.findOne = original; }
  };
};

const verifyInvitationTransitions = async ({ request, workspaceId, adminToken }) => {
  await WorkspaceInvite.init();
  const issue = async name => {
    const response = await request(`/workspaces/${workspaceId}/invitations`, adminToken, {
      method: 'POST', body: { email: `${name}@example.invalid`, displayName: name, role: 'viewer', deliveryMode: 'manual' }
    });
    assert.equal(response.status, 201);
    const data = response.body.data;
    const url = new URL(data.inviteUrl);
    assert.equal(url.origin, 'https://sneup.verify.invalid');
    assert.equal(data.delivery.status, 'not_sent');
    return { ...data, raw: url.searchParams.get('invite') };
  };
  const accept = invite => request('/workspaces/invitations/accept', null, { method: 'POST', body: { token: invite.raw } });
  const revoke = invite => request(`/workspaces/${workspaceId}/invitations/${invite.invite.id}/revoke`, adminToken, { method: 'POST', body: {} });
  const auditCount = (invite, action) => AuditEvent.countDocuments({ workspaceId, entityId: new Types.ObjectId(invite.invite.id), action });
  const sessions = invite => SessionToken.countDocuments({ workspaceId, userId: invite.user.id });
  let checks = 0;

  const accepted = await issue('accept-first');
  const staleRevoker = pauseRead(filter => String(filter._id) === accepted.invite.id);
  let pendingRevocation;
  try {
    pendingRevocation = revoke(accepted);
    await staleRevoker.entered();
    const onboarding = await accept(accepted);
    assert.equal(onboarding.status, 201);
    staleRevoker.release();
    assert.equal((await pendingRevocation).status, 409);
    assert.equal((await WorkspaceInvite.findById(accepted.invite.id)).status, 'accepted');
    assert.equal(await auditCount(accepted, 'workspace_invite_accepted'), 1);
    assert.equal(await auditCount(accepted, 'workspace_invite_revoked'), 0);
    assert.equal(await sessions(accepted), 1);
    assert.equal((await request('/workspaces/current', onboarding.body.data.sessionToken)).status, 200);
    assert.equal((await accept(accepted)).status, 400);
    checks += 8;
  } finally {
    staleRevoker.restore();
    if (pendingRevocation) await pendingRevocation.catch(() => {});
  }

  const revoked = await issue('revoke-first');
  const staleAcceptor = pauseRead(filter => filter.tokenPrefix === WorkspaceInvite.prefixFor(revoked.raw));
  let pendingAcceptance;
  try {
    pendingAcceptance = accept(revoked);
    await staleAcceptor.entered();
    assert.equal((await revoke(revoked)).status, 200);
    staleAcceptor.release();
    assert.equal((await pendingAcceptance).status, 400);
    assert.equal((await WorkspaceInvite.findById(revoked.invite.id)).status, 'revoked');
    assert.equal((await User.findById(revoked.user.id)).status, 'invited');
    assert.equal(await sessions(revoked), 0);
    assert.equal(await auditCount(revoked, 'workspace_invite_revoked'), 1);
    assert.equal(await auditCount(revoked, 'workspace_invite_accepted'), 0);
    checks += 7;
  } finally {
    staleAcceptor.restore();
    if (pendingAcceptance) await pendingAcceptance.catch(() => {});
  }

  const repeated = await issue('revoke-race');
  const firstRevoker = pauseRead(filter => String(filter._id) === repeated.invite.id);
  let firstRevocation;
  try {
    firstRevocation = revoke(repeated);
    await firstRevoker.entered();
    const winner = await revoke(repeated);
    assert.equal(winner.status, 200);
    firstRevoker.release();
    assert.equal((await firstRevocation).status, 409);
    const stored = await WorkspaceInvite.findById(repeated.invite.id);
    assert.equal(stored.revokedAt.toISOString(), winner.body.data.invite.revokedAt);
    assert.equal(await auditCount(repeated, 'workspace_invite_revoked'), 1);
    checks += 4;
  } finally {
    firstRevoker.restore();
    if (firstRevocation) await firstRevocation.catch(() => {});
  }

  const expired = await issue('expiry-race');
  await WorkspaceInvite.updateOne({ _id: expired.invite.id }, { $set: { expiresAt: new Date(Date.now() - 60000) } });
  const expiryRead = pauseRead(filter => filter.tokenPrefix === WorkspaceInvite.prefixFor(expired.raw));
  let pendingExpiry;
  try {
    pendingExpiry = accept(expired);
    await expiryRead.entered();
    assert.equal((await revoke(expired)).status, 200);
    expiryRead.release();
    assert.equal((await pendingExpiry).status, 400);
    assert.equal((await WorkspaceInvite.findById(expired.invite.id)).status, 'revoked');
    assert.equal(await sessions(expired), 0);
    assert.equal(await auditCount(expired, 'workspace_invite_revoked'), 1);
    checks += 5;
  } finally {
    expiryRead.restore();
    if (pendingExpiry) await pendingExpiry.catch(() => {});
  }

  const expiredControl = await issue('expired-control');
  await WorkspaceInvite.updateOne({ _id: expiredControl.invite.id }, { $set: { expiresAt: new Date(Date.now() - 60000) } });
  assert.equal((await accept(expiredControl)).status, 400);
  assert.equal((await WorkspaceInvite.findById(expiredControl.invite.id)).status, 'expired');
  assert.equal(await sessions(expiredControl), 0);
  checks += 3;
  return checks;
};

module.exports = { verifyInvitationTransitions };
