const mongoose = require('mongoose');
const WorkspaceInvite = require('../src/models/WorkspaceInvite');

describe('atomic invitation revocation', () => {
  afterEach(() => jest.restoreAllMocks());

  const pending = () => new WorkspaceInvite({
    workspaceId: new mongoose.Types.ObjectId(), userId: new mongoose.Types.ObjectId(),
    email: 'person@example.invalid', displayName: 'Person', role: 'viewer',
    tokenPrefix: 'sneup_invite_fixture', tokenHash: 'a'.repeat(64), status: 'pending',
    expiresAt: new Date(Date.now() + 60000)
  });

  test.each(['accepted', 'revoked', 'expired'])('cannot overwrite a concurrent %s winner', async status => {
    const invite = pending();
    const stored = { ...invite.toObject(), status };
    invite.save = jest.fn(async () => {
      stored.status = invite.status;
      return invite;
    });
    const update = jest.spyOn(WorkspaceInvite, 'findOneAndUpdate').mockResolvedValue(null);

    expect(await invite.revoke('admin')).toBeNull();
    expect(stored.status).toBe(status);
    expect(invite.save).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith({ _id: invite._id, workspaceId: invite.workspaceId, status: 'pending' }, {
      $set: { status: 'revoked', revokedAt: expect.any(Date), revokedBy: 'admin' }
    }, { new: true });
  });

  test('returns and updates the winning document without a second save', async () => {
    const invite = pending();
    const revoked = new WorkspaceInvite({ ...invite.toObject(), status: 'revoked', revokedBy: 'admin', revokedAt: new Date() });
    invite.save = jest.fn();
    jest.spyOn(WorkspaceInvite, 'findOneAndUpdate').mockResolvedValue(revoked);

    expect(await invite.revoke('admin')).toBe(invite);
    expect(invite.status).toBe('revoked');
    expect(invite.revokedBy).toBe('admin');
    expect(invite.save).not.toHaveBeenCalled();
  });
});
