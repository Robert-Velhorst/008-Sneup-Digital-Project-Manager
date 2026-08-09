const crypto = require('crypto');

const MAX_TEXT = 500;
const MAX_ITEMS = 50;
const SUPPORTED_PROPOSAL_TYPES = new Set(['request_update', 'escalate_overdue', 'assign_owner']);

const boundedText = (value, max = MAX_TEXT) => String(value || '').trim().slice(0, max);
const boundedItems = (items, limit = MAX_ITEMS) => (Array.isArray(items) ? items.slice(0, limit) : []);

const publicUrl = (req) => {
  const configured = String(process.env.SNEUP_PUBLIC_URL || '').trim();
  return (configured || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
};

const selectEvidence = (items) => boundedItems(items, 10).map(item => ({
  type: boundedText(item?.type || 'system', 40),
  label: boundedText(item?.label || 'HAI evidence', 160),
  url: boundedText(item?.url, 500),
  observedAt: item?.observedAt || null
}));

const selectProposalPayload = (payload = {}) => {
  const allowed = ['boardId', 'cardId', 'memberId', 'trelloId', 'memberTrelloId', 'interventionId'];
  return Object.fromEntries(allowed
    .filter(key => payload[key] !== undefined && payload[key] !== null)
    .map(key => [key, boundedText(payload[key], 160)]));
};

const publicIdentifier = (value) => {
  if (!value) return null;
  const identifier = typeof value === 'object' ? value._id || value.id : value;
  if (!identifier || typeof identifier === 'object') return null;
  return boundedText(identifier, 160) || null;
};

const compactRecord = (item = {}) => ({
  id: publicIdentifier(item._id || item.id) || '',
  boardId: publicIdentifier(item.boardId),
  cardId: publicIdentifier(item.cardId),
  title: item.title || item.name || item.question || null,
  status: item.status || null,
  riskLevel: item.riskLevel || item.severity || null,
  ownerType: item.ownerType || null,
  dueAt: item.dueAt || null,
  recommendedAnswer: item.recommendedAnswer || null,
  requiresApproval: item.requiresApproval === true,
  sourceUrl: item.url || item.providerUrl || null
});

class HaiIntegrationService {
  getManifest(baseUrl) {
    return {
      id: 'sneup-hai',
      name: 'Sneup for HAI',
      version: 1,
      specialist: 'approval-gated digital project management',
      authentication: {
        type: 'bearer',
        recommendation: 'Issue a workspace API token scoped only to integrations:hai:read and integrations:hai:propose.'
      },
      safety: {
        providerWrites: 'never_direct',
        proposalsRequireHumanApproval: true,
        approvalEndpointExposed: false,
        executionEndpointExposed: false
      },
      capabilities: [
        { id: 'snapshot', method: 'GET', path: `${baseUrl}/api/v1/integrations/hai/snapshot`, permission: 'integrations:hai:read' },
        { id: 'propose', method: 'POST', path: `${baseUrl}/api/v1/integrations/hai/proposals`, permission: 'integrations:hai:propose', rolloutControl: 'hai_proposals' }
      ],
      openapi: `${baseUrl}/api/v1/integrations/hai/openapi.json`
    };
  }

  getOpenApi(baseUrl) {
    return {
      openapi: '3.1.0',
      info: { title: 'Sneup HAI Connector', version: '1.0.0' },
      servers: [{ url: baseUrl }],
      components: {
        securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer' } }
      },
      security: [{ bearerAuth: [] }],
      paths: {
        '/api/v1/integrations/hai/snapshot': {
          get: { operationId: 'getSneupOperationsSnapshot', summary: 'Read a bounded, redacted project operations snapshot', responses: { 200: { description: 'Operations snapshot' } } }
        },
        '/api/v1/integrations/hai/proposals': {
          post: {
            operationId: 'proposeSneupAction',
            summary: 'Create an approval-gated Sneup recommendation',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['externalId', 'title', 'reason'],
                    properties: {
                      externalId: { type: 'string', maxLength: 160 },
                      type: { type: 'string', enum: ['request_update', 'escalate_overdue', 'assign_owner', 'manual_review'] },
                      title: { type: 'string', maxLength: 200 },
                      reason: { type: 'string', maxLength: 500 },
                      severity: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
                      target: { type: 'string', maxLength: 200 },
                      payload: { type: 'object' },
                      sourceEvidence: { type: 'array', maxItems: 10 }
                    }
                  }
                }
              }
            },
            responses: {
              201: { description: 'Approval-gated proposal created' },
              200: { description: 'Existing proposal returned' },
              503: { description: 'HAI proposals are paused or rollout controls are unavailable' }
            }
          }
        }
      }
    };
  }

  normalizeProposal(body = {}) {
    const externalId = boundedText(body.externalId, 160);
    const title = boundedText(body.title, 200);
    const reason = boundedText(body.reason, 500);
    if (!externalId || !title || !reason) {
      const error = new Error('externalId, title, and reason are required');
      error.statusCode = 400;
      throw error;
    }

    const requestedType = boundedText(body.type || 'manual_review', 40);
    const type = SUPPORTED_PROPOSAL_TYPES.has(requestedType) ? requestedType : 'hai_proposal';
    const severity = ['low', 'medium', 'high', 'critical'].includes(body.severity) ? body.severity : 'medium';
    const digest = crypto.createHash('sha256').update(externalId).digest('hex').slice(0, 24);

    return {
      id: `hai-${digest}`,
      type,
      title,
      reason,
      severity,
      target: boundedText(body.target, 200),
      owner: 'HAI',
      automatable: false,
      payload: {
        ...selectProposalPayload(body.payload),
        integration: 'hai',
        externalIdHash: digest
      },
      sourceEvidence: selectEvidence(body.sourceEvidence)
    };
  }

  async createProposal(body, options = {}) {
    const command = this.normalizeProposal(body);
    return require('./operationsLedgerService').createRecommendationFromAutopilotCommand(command, {
      workspaceId: options.workspaceId,
      actor: options.actor || 'hai'
    });
  }

  async getSnapshot(options = {}) {
    const demoWorkspaceService = require('./demoWorkspaceService');
    const ledger = demoWorkspaceService.isDemoMode()
      ? demoWorkspaceService.getDemoOperationsLedger()
      : await require('./operationsLedgerService').getWorkspaceLedger({
        workspaceId: options.workspaceId,
        limit: MAX_ITEMS,
        healthLimit: 20,
        notificationLimit: 20,
        timelineLimit: 25,
        days: 30
      });

    const sections = {
      decisions: boundedItems(ledger.decisions).map(compactRecord),
      recommendations: boundedItems(ledger.recommendations).map(compactRecord),
      failedActions: boundedItems(ledger.actions).filter(item => item.status === 'failed').map(compactRecord),
      dueFollowUps: boundedItems(ledger.followUps).map(compactRecord),
      findings: boundedItems(ledger.findings).map(compactRecord),
      boardHealth: boundedItems(ledger.healthSnapshots, 20).map(compactRecord)
    };
    return {
      generatedAt: new Date().toISOString(),
      workspaceId: String(ledger.workspaceId || options.workspaceId || 'default'),
      demoMode: ledger.demoMode === true,
      summary: Object.fromEntries(Object.entries(sections).map(([key, items]) => [key, items.length])),
      ...sections,
      partialErrors: boundedItems(ledger.errors, 10).map(item => ({ section: item.section, message: boundedText(item.message, 160) }))
    };
  }
}

const haiIntegrationService = new HaiIntegrationService();

module.exports = haiIntegrationService;
module.exports.HaiIntegrationService = HaiIntegrationService;
module.exports.publicUrl = publicUrl;
