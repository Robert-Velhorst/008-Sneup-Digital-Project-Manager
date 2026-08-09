(function attachConnectorView(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.SneupConnectorView = api;
})(typeof window === 'object' ? window : null, function createConnectorViewModule() {
  const SELECTION_ACTIONS = Object.freeze([
    ['[data-jira-site]', 'jiraSite', 'openJiraSiteModal'],
    ['[data-confluence-site]', 'confluenceSite', 'openConfluenceSiteModal'],
    ['[data-asana-workspace]', 'asanaWorkspace', 'openAsanaWorkspaceModal'],
    ['[data-basecamp-account]', 'basecampAccount', 'openBasecampAccountModal'],
    ['[data-resource-guru-account]', 'resourceGuruAccount', 'openResourceGuruAccountModal'],
    ['[data-figma-team]', 'figmaTeam', 'openFigmaTeamModal'],
    ['[data-sharepoint-site]', 'sharepointSite', 'openSharePointSiteModal'],
    ['[data-mural-workspace]', 'muralWorkspace', 'openMuralWorkspaceModal'],
    ['[data-xero-tenant]', 'xeroTenant', 'openXeroTenantModal'],
    ['[data-procore-company]', 'procoreCompany', 'openProcoreCompanyModal']
  ]);

  const SYNC_COUNT_FIELDS = Object.freeze([
    ['repositories', '{count} repository', '{count} repositories'],
    ['boards', '{count} board', '{count} boards'],
    ['sites', '{count} Jira site', '{count} Jira sites'],
    ['workspaces', '{count} Asana workspace', '{count} Asana workspaces'],
    ['projects', '{count} project', '{count} projects'],
    ['tasks', '{count} task', '{count} tasks'],
    ['todoLists', '{count} to-do list', '{count} to-do lists'],
    ['channels', '{count} channel', '{count} channels'],
    ['calendars', '{count} calendar', '{count} calendars'],
    ['events', '{count} event', '{count} events'],
    ['taskLists', '{count} task list', '{count} task lists'],
    ['todoTasks', '{count} To Do task', '{count} To Do tasks'],
    ['files', '{count} file', '{count} files'],
    ['issues', '{count} issue', '{count} issues'],
    ['items', '{count} item', '{count} items'],
    ['forms', '{count} form', '{count} forms'],
    ['workflows', '{count} automation', '{count} automations'],
    ['reports', '{count} report', '{count} reports'],
    ['salesInvoices', '{count} sales invoice', '{count} sales invoices'],
    ['spaces', '{count} space', '{count} spaces'],
    ['pages', '{count} page', '{count} pages'],
    ['dataSources', '{count} data source', '{count} data sources']
  ]);

  const DYNAMIC_OPERATOR_MESSAGES = Object.freeze([
    'Project and work management', 'Software delivery', 'Communication', 'Calendar and email',
    'Docs and knowledge', 'Files and assets', 'Whiteboard and design', 'Time, finance, and resourcing',
    'CRM, support, and stakeholders', 'Automation, forms, and data', 'Incident, quality, and monitoring',
    'needs attention', 'disabled', 'connected', 'linked', 'ready', 'setup', 'retired', 'legacy', 'unavailable',
    'scope review', 'read-only', 'Jira site selected', 'Select Jira site', 'Confluence site selected',
    'Select Confluence site', 'Asana workspace selected', 'Select Asana workspace', 'Basecamp account selected',
    'Select Basecamp account', 'Resource Guru account selected', 'Select Resource Guru account',
    'Figma team selected', 'Configure Figma team', 'SharePoint site selected', 'Select SharePoint site',
    'Xero organisation selected', 'Select Xero organisation', 'Procore company selected',
    'Select Procore company', 'Mural workspace selected', 'Select Mural workspace', 'Reconnect', 'Connect'
  ]);

  const sourceLabel = source => ({
    github_api: 'GitHub API',
    trello_api: 'Trello API',
    jira_api: 'Jira API',
    asana_api: 'Asana API',
    slack_api: 'Slack API',
    google_workspace_api: 'Google Workspace API',
    microsoft_graph: 'Microsoft Graph',
    linear_graphql: 'Linear GraphQL',
    notion_api: 'Notion API',
    monday_api: 'monday.com API',
    clickup_api: 'ClickUp API',
    azure_devops_api: 'Azure DevOps API',
    wrike_api: 'Wrike API',
    smartsheet_api: 'Smartsheet API',
    airtable_api: 'Airtable API',
    todoist_api: 'Todoist API',
    shortcut_api: 'Shortcut API',
    bitbucket_api: 'Bitbucket API',
    basecamp_api: 'Basecamp API',
    scoro_project_task_metadata: 'Scoro API',
    plane_project_work_item_metadata: 'Plane API',
    openproject_project_work_package_metadata: 'OpenProject API',
    microsoft_project_planner_graph: 'Microsoft Graph Planner',
    quip_thread_metadata: 'Quip thread index',
    xero_sales_invoice_metadata: 'Xero invoices',
    google_forms_metadata: 'Google Forms metadata',
    data_studio_asset_metadata: 'Data Studio API',
    zapier_automation_metadata: 'Zapier Workflow API',
    mural_active_mural_metadata: 'Mural metadata',
    confluence_page_space_metadata: 'Confluence metadata',
    proofhub_api_v3: 'ProofHub API v3'
  }[source] || 'Sync');

  function createController(context = {}) {
    const {
      document,
      window,
      state,
      elements,
      callbacks,
      t,
      plural,
      escapeHtml,
      formatDate,
      isFeatureEnabled
    } = context;
    if (!document || !window || !state || !elements || !callbacks) {
      throw new TypeError('Connector view requires document, window, state, elements, and callbacks');
    }

    const et = (message, params) => escapeHtml(t(message, params));
    const ep = (singular, pluralMessage, count, params) => escapeHtml(plural(singular, pluralMessage, count, params));
    const spanCount = (count, singular, pluralMessage) => `<span>${ep(singular, pluralMessage, count)}</span>`;

    function renderSafety() {
      const safety = state.connectorSafety;
      if (!safety) {
        elements.connectorSafety.innerHTML = '';
        return;
      }
      const liveAdapters = state.connectorSyncReadiness?.ready || 0;
      const syncRollout = isFeatureEnabled('connector_sync')
        ? plural('{count} provider sync adapter is live. Signals are read-only.', '{count} provider sync adapters are live. Signals are read-only.', liveAdapters)
        : t('Read-only connector synchronization is paused by this workspace rollout.');
      elements.connectorSafety.innerHTML = `
        <div>
          <strong>${ep('{count} tool is write-blocked', '{count} tools are write-blocked', safety.providerWritesBlocked)}</strong>
          <span>${escapeHtml(syncRollout)} ${ep('{count} account link requires a scope review.', '{count} account links require a scope review.', safety.scopeReviews)}</span>
        </div>
        <span>${ep('{count} broad provider grant flagged', '{count} broad provider grants flagged', safety.providerScopeReviews)}</span>
      `;
    }

    function renderCategories() {
      const allCount = state.connectorCatalogTotal || state.connectorTotal || state.connectors.length;
      const rows = [{ id: 'all', name: 'All tools', count: allCount }, ...state.categories];
      elements.categoryList.innerHTML = rows.map(category => `
        <button class="${state.category === category.id ? 'active' : ''}" data-category="${escapeHtml(category.id)}" type="button">
          <span>${et(category.name)}</span>
          <span>${escapeHtml(category.count)}</span>
        </button>
      `).join('');
      document.querySelectorAll('[data-category]').forEach((button) => {
        button.addEventListener('click', () => {
          state.category = button.dataset.category;
          callbacks.loadConnectors();
        });
      });
    }

    function renderSyncSummary(account, canSync) {
      const lastSync = account?.metadata?.lastWorkSignalSync || {};
      if (!canSync || !lastSync.finishedAt) return '';
      const counts = [spanCount(lastSync.signalCount || 0, '{count} signal', '{count} signals')];
      SYNC_COUNT_FIELDS.forEach(([field, singular, pluralMessage]) => {
        if (lastSync[field]) counts.push(spanCount(lastSync[field], singular, pluralMessage));
      });
      return `<div class="meta"><span>${escapeHtml(sourceLabel(lastSync.source))} ${escapeHtml(formatDate(lastSync.finishedAt))}</span>${counts.join('')}</div>`;
    }

    function renderCredentialRotation(rotation) {
      if (!rotation?.required) return '';
      if (rotation.status === 'unknown') {
        return `<div class="connector-policy review">${et('Credential rotation date is unavailable. Rotate the credential to establish a review deadline.')}</div>`;
      }
      if (rotation.status === 'overdue') {
        const days = Math.abs(rotation.daysUntilDue);
        return `<div class="connector-policy review">${ep('Credential rotation is overdue by {count} day.', 'Credential rotation is overdue by {count} days.', days)}</div>`;
      }
      if (rotation.status === 'due_soon') {
        return `<div class="connector-policy">${ep('Rotate this credential within {count} day.', 'Rotate this credential within {count} days.', rotation.daysUntilDue)}</div>`;
      }
      return `<div class="connector-policy">${et('Credential rotation is current. Next review {date}.', { date: formatDate(rotation.dueAt) })}</div>`;
    }

    function renderSyncFreshness(freshness, canSync) {
      if (!canSync || !freshness) return '';
      if (freshness.status === 'stale') {
        const hours = Math.abs(freshness.hoursUntilDue);
        return `<div class="connector-policy review">${ep('Sync review is overdue by {count} hour. Run a read-only sync to refresh this connector.', 'Sync review is overdue by {count} hours. Run a read-only sync to refresh this connector.', hours)}</div>`;
      }
      if (freshness.status === 'not_synced') {
        return `<div class="connector-policy review">${et('No completed read-only sync yet. Run a sync before relying on this connector in operations.')}</div>`;
      }
      return `<div class="connector-policy">${et('Sync is current. Freshness review {date}.', { date: formatDate(freshness.dueAt) })}</div>`;
    }

    function renderConnector(connector, account) {
      const connected = Boolean(account);
      const initials = connector.name.split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase();
      const configured = connector.auth.configured;
      const authLabel = connector.auth.displayType || (connector.auth.type === 'oauth2' ? 'OAuth' : connector.auth.type.replaceAll('_', ' '));
      const safety = connector.safety || {};
      const syncReady = connector.syncReadiness?.accountConnectionAvailable === true;
      const catalogAvailability = connector.syncReadiness?.availabilityStatus || 'unavailable';
      const accountStatus = account?.status || '';
      const connectionLabel = connected && accountStatus === 'failed' ? 'needs attention'
        : connected && accountStatus === 'disabled' ? 'disabled'
          : connected ? (syncReady ? 'connected' : 'linked') : syncReady ? (configured ? 'ready' : 'setup') : catalogAvailability === 'retired' ? 'retired' : catalogAvailability === 'legacy' ? 'legacy' : 'unavailable';
      const connectionStatusClass = connected && accountStatus === 'failed' ? 'high'
        : connected && accountStatus === 'disabled' ? 'review'
          : connected && syncReady ? 'connected' : connected || (syncReady && configured) ? 'review' : 'high';
      const adapterSummary = syncReady
        ? t('Read-only sync adapter available.')
        : connector.syncReadiness?.reason || t('Account connection is not available yet.');
      const fields = account?.metadata?.fields || {};
      const isJira = connector.id === 'jira_software' || connector.id === 'jira_service_management';
      const isConfluence = connector.id === 'confluence';
      const isAsana = connector.id === 'asana';
      const isBasecamp = connector.id === 'basecamp';
      const isResourceGuru = connector.id === 'resource_guru';
      const isFigma = connector.id === 'figma';
      const isSharePoint = connector.id === 'sharepoint';
      const isXero = connector.id === 'xero';
      const isProcore = connector.id === 'procore';
      const isMural = connector.id === 'mural';
      const isGenericWebhook = connector.id === 'webhook_generic';
      const genericWebhookEndpoint = isGenericWebhook && account ? `${window.location.origin}/api/webhooks/generic/${account.id}` : '';
      const canSync = Boolean(isFeatureEnabled('connector_sync') && account && syncReady && !isGenericWebhook
        && (!isFigma || fields.figmaTeamId) && (!isConfluence || fields.confluenceCloudId)
        && (!isSharePoint || fields.sharePointSiteId) && (!isXero || fields.xeroTenantId)
        && (!isProcore || fields.procoreCompanyId) && (!isMural || fields.muralWorkspaceId));
      const consentSummary = account?.consent?.acknowledgedAt
        ? `<div class="meta"><span>${et('Scope review {date}', { date: formatDate(account.consent.acknowledgedAt) })}</span><span>${escapeHtml(account.consent.acknowledgedBy || t('local user'))}</span></div>`
        : '';
      const selectionButtons = [
        isJira && account ? ['jira-site', fields.cloudId ? 'Jira site selected' : 'Select Jira site'] : null,
        isConfluence && account ? ['confluence-site', fields.confluenceCloudId ? 'Confluence site selected' : 'Select Confluence site'] : null,
        isAsana && account ? ['asana-workspace', fields.asanaWorkspaceGid ? 'Asana workspace selected' : 'Select Asana workspace'] : null,
        isBasecamp && account ? ['basecamp-account', fields.basecampAccountId ? 'Basecamp account selected' : 'Select Basecamp account'] : null,
        isResourceGuru && account ? ['resource-guru-account', fields.resourceGuruAccountId ? 'Resource Guru account selected' : 'Select Resource Guru account'] : null,
        isFigma && account ? ['figma-team', fields.figmaTeamId ? 'Figma team selected' : 'Configure Figma team'] : null,
        isSharePoint && account ? ['sharepoint-site', fields.sharePointSiteId ? 'SharePoint site selected' : 'Select SharePoint site'] : null,
        isXero && account ? ['xero-tenant', fields.xeroTenantId ? 'Xero organisation selected' : 'Select Xero organisation'] : null,
        isProcore && account ? ['procore-company', fields.procoreCompanyId ? 'Procore company selected' : 'Select Procore company'] : null,
        isMural && account ? ['mural-workspace', fields.muralWorkspaceId ? 'Mural workspace selected' : 'Select Mural workspace'] : null
      ].filter(Boolean).map(([attribute, label]) => `<button class="button" data-${attribute}="${escapeHtml(account.id)}" type="button">${et(label)}</button>`).join('');
      const workerResponseBindingCount = account?.metadata?.inboundWorkerResponses?.bindingCount || 0;

      return `
        <div class="connector-card">
          <div class="connector-top">
            <div class="connector-identity">
              <div class="connector-logo">${escapeHtml(initials)}</div>
              <div>
                <h3>${escapeHtml(connector.name)}</h3>
                <div class="meta"><span>${et(connector.categoryName)}</span><span>${escapeHtml(authLabel)}</span><span>${et(safety.scopeRisk === 'review' ? 'scope review' : 'read-only')}</span></div>
              </div>
            </div>
            <span class="pill ${connectionStatusClass}">${et(connectionLabel)}</span>
          </div>
          <p>${escapeHtml(connector.description)}</p>
          ${syncReady ? `<div class="connector-policy ${safety.scopeRisk === 'review' ? 'review' : ''}">${safety.summary ? escapeHtml(safety.summary) : et('Read-only ingestion only.')}</div>` : ''}
          <div class="meta"><span>${isGenericWebhook ? et('HMAC-verified inbound event adapter available.') : escapeHtml(adapterSummary)}</span></div>
          ${consentSummary}
          ${renderCredentialRotation(account?.credentialRotation)}
          ${renderSyncFreshness(account?.syncFreshness, canSync)}
          ${renderSyncSummary(account, canSync)}
          ${genericWebhookEndpoint ? `<div class="connector-policy"><code>${escapeHtml(genericWebhookEndpoint)}</code><span>${et('Send a compact JSON event and sign its exact request body.')} <code>x-sneup-signature: sha256=&lt;HMAC-SHA256&gt;</code> ${et('Include a stable delivery ID for retry-safe delivery.')} <code>x-sneup-delivery-id</code></span></div>` : ''}
          <div class="connector-actions">
            <span class="meta">${connector.sync.slice(0, 3).map(escapeHtml).join(' | ')}</span>
            ${selectionButtons}
            ${genericWebhookEndpoint ? `<button class="button" data-copy-webhook-endpoint="${escapeHtml(genericWebhookEndpoint)}" type="button">${et('Copy endpoint')}</button>` : ''}
            ${isGenericWebhook && account ? `<button class="button" data-worker-response-bindings="${escapeHtml(account.id)}" type="button">${workerResponseBindingCount ? et('Response mappings ({count})', { count: workerResponseBindingCount }) : et('Configure response mappings')}</button>` : ''}
            ${canSync ? `<button class="button" data-connector-sync="${escapeHtml(account.id)}" type="button">${et('Sync now')}</button>` : ''}
            ${syncReady ? (connected && connector.auth.type !== 'oauth2'
              ? `<button class="button primary" data-rotate-credential="${escapeHtml(account.id)}" type="button">${et('Rotate credential')}</button>`
              : `<button class="button ${configured ? 'primary' : ''}" data-connect="${escapeHtml(connector.id)}" type="button">${et(connected ? 'Reconnect' : 'Connect')}</button>`) : ''}
          </div>
        </div>
      `;
    }

    function bindActions() {
      document.querySelectorAll('[data-connect]').forEach(button => button.addEventListener('click', () => callbacks.startConnection(button.dataset.connect)));
      document.querySelectorAll('[data-rotate-credential]').forEach((button) => {
        button.addEventListener('click', () => {
          const account = state.accounts.find(item => item.id === button.dataset.rotateCredential);
          if (account) callbacks.startConnection(account.connectorId, { account });
        });
      });
      document.querySelectorAll('[data-connector-sync]').forEach(button => button.addEventListener('click', () => callbacks.syncConnectorAccount(button.dataset.connectorSync)));
      SELECTION_ACTIONS.forEach(([selector, datasetKey, callbackName]) => {
        document.querySelectorAll(selector).forEach(button => button.addEventListener('click', () => callbacks[callbackName](button.dataset[datasetKey])));
      });
      document.querySelectorAll('[data-load-more-connectors]').forEach(button => button.addEventListener('click', () => callbacks.loadConnectors({ append: true })));
      document.querySelectorAll('[data-copy-webhook-endpoint]').forEach((button) => {
        button.addEventListener('click', async () => {
          try {
            await window.navigator.clipboard.writeText(button.dataset.copyWebhookEndpoint);
            callbacks.openNotice(t('Webhook endpoint copied'), t('Configure the source to send a signed metadata-only event to this endpoint.'));
          } catch (error) {
            callbacks.openNotice(t('Webhook endpoint'), button.dataset.copyWebhookEndpoint);
          }
        });
      });
      document.querySelectorAll('[data-worker-response-bindings]').forEach(button => button.addEventListener('click', () => callbacks.openWorkerResponseBindingsModal(button.dataset.workerResponseBindings)));
    }

    function render() {
      elements.connectorCount.textContent = state.connectorCatalogTotal || state.connectorTotal || state.connectors.length;
      elements.connectedCount.textContent = plural('{count} connected account', '{count} connected accounts', state.accounts.length);
      renderCategories();
      const selectedCategory = state.categories.find(category => category.id === state.category);
      const readinessLabel = state.connectorReadiness === 'ready' ? t('ready to connect')
        : state.connectorReadiness === 'catalog_only' ? t('catalog only') : '';
      elements.connectorHeading.textContent = [selectedCategory ? t(selectedCategory.name) : t('All connectors'), readinessLabel].filter(Boolean).join(' - ');
      document.querySelectorAll('[data-connector-readiness]').forEach(button => button.classList.toggle('active', button.dataset.connectorReadiness === state.connectorReadiness));
      renderSafety();
      const accountsByConnectorId = new Map(state.accounts.map(account => [account.connectorId, account]));
      elements.connectorGrid.innerHTML = state.connectorTotal === 0
        ? `<div class="empty">${et('No connectors match this view.')}</div>`
        : state.connectors.map(connector => renderConnector(connector, accountsByConnectorId.get(connector.id))).join('');
      elements.connectorPagination.innerHTML = state.connectorTotal > 0
        ? `<span class="meta">${et('Showing {shown} of {total} tools', { shown: state.connectors.length, total: state.connectorTotal })}</span>${state.connectors.length < state.connectorTotal ? `<button class="button" data-load-more-connectors type="button">${et('Show more')}</button>` : ''}`
        : '';
      bindActions();
    }

    return { render };
  }

  return { createController, SELECTION_ACTIONS, SYNC_COUNT_FIELDS, DYNAMIC_OPERATOR_MESSAGES };
});
