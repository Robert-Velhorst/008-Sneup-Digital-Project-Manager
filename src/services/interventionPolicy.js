const WRITE_ACTIONS = new Set([
  'comment',
  'follow_up',
  'reassign',
  'escalate',
  'move_card',
  'add_label',
  'set_due_date',
  'add_checklist',
  'performance_notification',
  'trello_webhook_create',
  'trello_webhook_update',
  'trello_webhook_delete'
]);

const HIGH_RISK_ACTIONS = new Set([
  'move_card',
  'set_due_date',
  'escalate',
  'trello_webhook_create',
  'trello_webhook_update',
  'trello_webhook_delete'
]);

const DEFAULT_REASONS = {
  comment: 'Posting a Trello comment can notify workers and change the project record.',
  follow_up: 'Posting a follow-up can notify workers and should be deliberate.',
  reassign: 'Changing card ownership affects worker accountability and workload.',
  escalate: 'Escalation changes accountability and may notify senior owners.',
  move_card: 'Moving cards changes workflow state.',
  add_label: 'Adding labels changes visible card classification.',
  set_due_date: 'Changing due dates affects delivery commitments.',
  add_checklist: 'Adding checklist items changes the required work on a card.',
  performance_notification: 'Performance notifications affect worker accountability.',
  trello_webhook_create: 'Creating a Trello webhook sends board events to an external callback and changes provider configuration.',
  trello_webhook_update: 'Changing a Trello webhook redirects board events to a different external callback.',
  trello_webhook_delete: 'Deleting a Trello webhook stops real-time board updates and changes provider configuration.'
};

const classifyAction = (actionType, options = {}) => {
  const severity = options.severity || 'medium';
  const highRisk = HIGH_RISK_ACTIONS.has(actionType) || severity === 'critical';
  const mediumRisk = WRITE_ACTIONS.has(actionType);

  if (!mediumRisk) {
    return {
      actionType,
      riskLevel: 'low',
      requiresApproval: false,
      ownerType: 'system',
      approvalReason: 'Internal analysis-only action.'
    };
  }

  const riskLevel = highRisk ? 'high' : severity === 'high' ? 'high' : 'medium';

  return {
    actionType,
    riskLevel,
    requiresApproval: true,
    ownerType: highRisk ? 'robert' : 'team',
    approvalReason: DEFAULT_REASONS[actionType] || 'This action can modify Trello or worker accountability.'
  };
};

const classifyIntervention = (intervention) => classifyAction(intervention.type, {
  severity: intervention.severity,
  metadata: intervention.metadata
});

const getWriteActionTypes = () => [...WRITE_ACTIONS];

module.exports = {
  classifyAction,
  classifyIntervention,
  getWriteActionTypes
};
