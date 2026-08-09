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

  const NL_MESSAGES = Object.freeze({
    'Connector selection unavailable': 'Connectorselectie niet beschikbaar',
    'Configure Figma team': 'Figma-team instellen',
    'Figma team ID': 'Figma-team-ID',
    'Numeric ID from the Figma team URL': 'Numerieke ID uit de Figma-team-URL',
    "Sneup uses the selected team's project and file metadata only. It does not read design content, nodes, comments, users, thumbnails, URLs, or versions.": 'Sneup gebruikt alleen project- en bestandsmetadata van het geselecteerde team. Ontwerpinhoud, nodes, opmerkingen, gebruikers, miniaturen, URL\'s en versies worden niet gelezen.',
    'Use this team': 'Dit team gebruiken',
    'Figma team configured': 'Figma-team ingesteld',
    'Sneup will use this team for the next read-only metadata sync.': 'Sneup gebruikt dit team voor de volgende alleen-lezen metadatasynchronisatie.',
    'Figma team configuration': 'Figma-teamconfiguratie',
    'Select SharePoint site': 'SharePoint-site selecteren',
    'Followed SharePoint site': 'Gevolgde SharePoint-site',
    'Select a site': 'Selecteer een site',
    'Sneup reads only root file and folder metadata from this selected followed site. It does not read contents, links, permissions, pages, lists, versions, or sharing details.': 'Sneup leest alleen metadata van bestanden en mappen in de hoofdmap van deze geselecteerde gevolgde site. Inhoud, koppelingen, machtigingen, pagina\'s, lijsten, versies en deelgegevens worden niet gelezen.',
    'Use this site': 'Deze site gebruiken',
    'SharePoint site selected': 'SharePoint-site geselecteerd',
    'Sneup will use this site for the next read-only metadata sync.': 'Sneup gebruikt deze site voor de volgende alleen-lezen metadatasynchronisatie.',
    'SharePoint site selection': 'SharePoint-siteselectie',
    'No followed SharePoint sites are available for this account. Follow a site in SharePoint, then reconnect it with the approved read-only scope.': 'Er zijn geen gevolgde SharePoint-sites beschikbaar voor dit account. Volg een site in SharePoint en koppel daarna opnieuw met het goedgekeurde alleen-lezen bereik.',
    'Select Mural workspace': 'Mural-werkruimte selecteren',
    'Mural workspace': 'Mural-werkruimte',
    'Select a workspace': 'Selecteer een werkruimte',
    'Sneup reads active mural metadata from this selected workspace only. It does not read mural content, widgets, comments, templates, rooms, people, URLs, or sharing details.': 'Sneup leest alleen metadata van actieve murals uit deze geselecteerde werkruimte. Muralinhoud, widgets, opmerkingen, sjablonen, kamers, personen, URL\'s en deelgegevens worden niet gelezen.',
    'Use this workspace': 'Deze werkruimte gebruiken',
    'Mural workspace selected': 'Mural-werkruimte geselecteerd',
    'Sneup will use this workspace for the next read-only metadata sync.': 'Sneup gebruikt deze werkruimte voor de volgende alleen-lezen metadatasynchronisatie.',
    'Mural workspace selection': 'Mural-werkruimteselectie',
    'No Mural workspaces are available for this account. Reconnect it with the approved read-only scopes.': 'Er zijn geen Mural-werkruimtes beschikbaar voor dit account. Koppel opnieuw met de goedgekeurde alleen-lezen bereiken.',
    'Select Xero organisation': 'Xero-organisatie selecteren',
    'Authorized Xero organisation': 'Geautoriseerde Xero-organisatie',
    'Select an organisation': 'Selecteer een organisatie',
    'Sneup reads only capped sales-invoice status and date metadata from this organisation. It does not retain contacts, invoice numbers, amounts, payment details, line items, or links.': 'Sneup leest alleen begrensde status- en datummetadata van verkoopfacturen uit deze organisatie. Contacten, factuurnummers, bedragen, betalingsgegevens, regels en koppelingen worden niet bewaard.',
    'Use this organisation': 'Deze organisatie gebruiken',
    'Xero organisation selected': 'Xero-organisatie geselecteerd',
    'Sneup will use this organisation for the next read-only invoice metadata sync.': 'Sneup gebruikt deze organisatie voor de volgende alleen-lezen synchronisatie van factuurmetadata.',
    'Xero organisation selection': 'Xero-organisatieselectie',
    'No Xero organisations are available for this account. Reconnect it with the approved invoice read scope.': 'Er zijn geen Xero-organisaties beschikbaar voor dit account. Koppel opnieuw met het goedgekeurde leesbereik voor facturen.',
    'Select Procore company': 'Procore-bedrijf selecteren',
    'Authorized Procore company ID': 'Geautoriseerde Procore-bedrijfs-ID',
    'Sneup verifies project-read access before saving this company. It then reads only capped active-project name, status, and schedule metadata. Budgets, contracts, RFIs, drawings, people, addresses, descriptions, attachments, links, and provider writes stay out of Sneup.': 'Sneup controleert leestoegang tot projecten voordat dit bedrijf wordt opgeslagen. Daarna worden alleen begrensde naam-, status- en planningsmetadata van actieve projecten gelezen. Budgetten, contracten, RFI\'s, tekeningen, personen, adressen, beschrijvingen, bijlagen, koppelingen en providerschrijfacties blijven buiten Sneup.',
    'Use this company': 'Dit bedrijf gebruiken',
    'Procore company selected': 'Procore-bedrijf geselecteerd',
    'Sneup will use this company for the next read-only active-project metadata sync.': 'Sneup gebruikt dit bedrijf voor de volgende alleen-lezen synchronisatie van actieve-projectmetadata.',
    'Procore company selection': 'Procore-bedrijfsselectie',
    'Select Resource Guru account': 'Resource Guru-account selecteren',
    'Authorized Resource Guru account': 'Geautoriseerd Resource Guru-account',
    'Select an account': 'Selecteer een account',
    'Sneup will only ingest read-only project and booking schedule metadata from this account.': 'Sneup verwerkt uit dit account alleen alleen-lezen metadata van projecten en boekingsplanningen.',
    'Use this account': 'Dit account gebruiken',
    'Resource Guru account selected': 'Resource Guru-account geselecteerd',
    'Sneup will use this account for the next read-only sync.': 'Sneup gebruikt dit account voor de volgende alleen-lezen synchronisatie.',
    'Resource Guru account selection': 'Resource Guru-accountselectie',
    'No Resource Guru accounts are currently authorized for this connection. Reconnect it with Resource Guru access.': 'Er zijn momenteel geen Resource Guru-accounts geautoriseerd voor deze koppeling. Koppel opnieuw met Resource Guru-toegang.',
    'Select Basecamp account': 'Basecamp-account selecteren',
    'Authorized Basecamp account': 'Geautoriseerd Basecamp-account',
    'Sneup will only ingest read-only project and to-do metadata from this account.': 'Sneup verwerkt uit dit account alleen alleen-lezen project- en taakmetadata.',
    'Basecamp account selected': 'Basecamp-account geselecteerd',
    'Basecamp account selection': 'Basecamp-accountselectie',
    'No Basecamp 3 accounts are currently authorized for this connection. Reconnect it with Basecamp access.': 'Er zijn momenteel geen Basecamp 3-accounts geautoriseerd voor deze koppeling. Koppel opnieuw met Basecamp-toegang.',
    'Select Asana workspace': 'Asana-werkruimte selecteren',
    'Authorized workspace': 'Geautoriseerde werkruimte',
    'organization': 'organisatie',
    'Sneup will only ingest read-only project tasks from the selected workspace.': 'Sneup verwerkt alleen alleen-lezen projecttaken uit de geselecteerde werkruimte.',
    'Asana workspace selected': 'Asana-werkruimte geselecteerd',
    'Sneup will use this workspace for the next read-only sync.': 'Sneup gebruikt deze werkruimte voor de volgende alleen-lezen synchronisatie.',
    'Asana workspace selection': 'Asana-werkruimteselectie',
    'No Asana workspaces are currently authorized for this account. Reconnect it with workspace read access.': 'Er zijn momenteel geen Asana-werkruimtes geautoriseerd voor dit account. Koppel opnieuw met leestoegang tot werkruimtes.',
    'Select Confluence site': 'Confluence-site selecteren',
    'Authorized Confluence site': 'Geautoriseerde Confluence-site',
    'Sneup will ingest space and page metadata only. It does not read page bodies, comments, attachments, users, descriptions, URLs, or version messages.': 'Sneup verwerkt alleen ruimte- en paginametadata. Pagina-inhoud, opmerkingen, bijlagen, gebruikers, beschrijvingen, URL\'s en versieberichten worden niet gelezen.',
    'Confluence site selected': 'Confluence-site geselecteerd',
    'Confluence site selection': 'Confluence-siteselectie',
    'No Confluence sites are currently authorized for this account. Reconnect it with page and space read access.': 'Er zijn momenteel geen Confluence-sites geautoriseerd voor dit account. Koppel opnieuw met leestoegang tot pagina\'s en ruimtes.',
    'Select Jira site': 'Jira-site selecteren',
    'Authorized Jira site': 'Geautoriseerde Jira-site',
    'Sneup will only ingest read-only work signals from the selected site.': 'Sneup verwerkt alleen alleen-lezen werksignalen van de geselecteerde site.',
    'Jira site selected': 'Jira-site geselecteerd',
    'Sneup will use this site for the next read-only sync.': 'Sneup gebruikt deze site voor de volgende alleen-lezen synchronisatie.',
    'Jira site selection': 'Jira-siteselectie',
    'No Jira sites are currently authorized for this account. Reconnect it with Jira read access.': 'Er zijn momenteel geen Jira-sites geautoriseerd voor dit account. Koppel opnieuw met Jira-leestoegang.'
  });

  const SELECTION_FORMS = Object.freeze({
    figma_team: {
      title: 'Configure Figma team', fieldName: 'figmaTeamId', fieldId: 'figmaTeamId', fieldLabel: 'Figma team ID',
      selectedField: 'figmaTeamId', input: { inputmode: 'numeric', pattern: '[0-9]{1,24}', maxlength: '24', placeholder: 'Numeric ID from the Figma team URL' },
      notice: "Sneup uses the selected team's project and file metadata only. It does not read design content, nodes, comments, users, thumbnails, URLs, or versions.",
      submitLabel: 'Use this team', successTitle: 'Figma team configured', successMessage: 'Sneup will use this team for the next read-only metadata sync.', errorTitle: 'Figma team configuration'
    },
    sharepoint_site: {
      title: 'Select SharePoint site', fieldName: 'sharePointSiteId', fieldId: 'sharePointSiteId', fieldLabel: 'Followed SharePoint site', selectedField: 'sharePointSiteId',
      optionsKey: 'sites', optionId: 'sharePointSiteId', placeholder: 'Select a site', notice: 'Sneup reads only root file and folder metadata from this selected followed site. It does not read contents, links, permissions, pages, lists, versions, or sharing details.',
      submitLabel: 'Use this site', successTitle: 'SharePoint site selected', successMessage: 'Sneup will use this site for the next read-only metadata sync.', errorTitle: 'SharePoint site selection', emptyMessage: 'No followed SharePoint sites are available for this account. Follow a site in SharePoint, then reconnect it with the approved read-only scope.'
    },
    mural_workspace: {
      title: 'Select Mural workspace', fieldName: 'muralWorkspaceId', fieldId: 'muralWorkspaceId', fieldLabel: 'Mural workspace', selectedField: 'muralWorkspaceId',
      optionsKey: 'workspaces', optionId: 'muralWorkspaceId', placeholder: 'Select a workspace', notice: 'Sneup reads active mural metadata from this selected workspace only. It does not read mural content, widgets, comments, templates, rooms, people, URLs, or sharing details.',
      submitLabel: 'Use this workspace', successTitle: 'Mural workspace selected', successMessage: 'Sneup will use this workspace for the next read-only metadata sync.', errorTitle: 'Mural workspace selection', emptyMessage: 'No Mural workspaces are available for this account. Reconnect it with the approved read-only scopes.'
    },
    xero_tenant: {
      title: 'Select Xero organisation', fieldName: 'xeroTenantId', fieldId: 'xeroTenantId', fieldLabel: 'Authorized Xero organisation', selectedField: 'xeroTenantId',
      optionsKey: 'tenants', optionId: 'xeroTenantId', placeholder: 'Select an organisation', notice: 'Sneup reads only capped sales-invoice status and date metadata from this organisation. It does not retain contacts, invoice numbers, amounts, payment details, line items, or links.',
      submitLabel: 'Use this organisation', successTitle: 'Xero organisation selected', successMessage: 'Sneup will use this organisation for the next read-only invoice metadata sync.', errorTitle: 'Xero organisation selection', emptyMessage: 'No Xero organisations are available for this account. Reconnect it with the approved invoice read scope.'
    },
    procore_company: {
      title: 'Select Procore company', fieldName: 'procoreCompanyId', fieldId: 'procoreCompanyId', fieldLabel: 'Authorized Procore company ID', selectedField: 'procoreCompanyId',
      input: { inputmode: 'numeric', pattern: '[0-9]{1,20}', maxlength: '20' }, notice: 'Sneup verifies project-read access before saving this company. It then reads only capped active-project name, status, and schedule metadata. Budgets, contracts, RFIs, drawings, people, addresses, descriptions, attachments, links, and provider writes stay out of Sneup.',
      submitLabel: 'Use this company', successTitle: 'Procore company selected', successMessage: 'Sneup will use this company for the next read-only active-project metadata sync.', errorTitle: 'Procore company selection'
    },
    resource_guru_account: {
      title: 'Select Resource Guru account', fieldName: 'resourceGuruAccountId', fieldId: 'resourceGuruAccountId', fieldLabel: 'Authorized Resource Guru account', selectedField: 'resourceGuruAccountId',
      optionsKey: 'accounts', optionId: 'resourceGuruAccountId', placeholder: 'Select an account', notice: 'Sneup will only ingest read-only project and booking schedule metadata from this account.',
      submitLabel: 'Use this account', successTitle: 'Resource Guru account selected', successMessage: 'Sneup will use this account for the next read-only sync.', errorTitle: 'Resource Guru account selection', emptyMessage: 'No Resource Guru accounts are currently authorized for this connection. Reconnect it with Resource Guru access.'
    },
    basecamp_account: {
      title: 'Select Basecamp account', fieldName: 'basecampAccountId', fieldId: 'basecampAccountId', fieldLabel: 'Authorized Basecamp account', selectedField: 'basecampAccountId',
      optionsKey: 'accounts', optionId: 'basecampAccountId', placeholder: 'Select an account', notice: 'Sneup will only ingest read-only project and to-do metadata from this account.',
      submitLabel: 'Use this account', successTitle: 'Basecamp account selected', successMessage: 'Sneup will use this account for the next read-only sync.', errorTitle: 'Basecamp account selection', emptyMessage: 'No Basecamp 3 accounts are currently authorized for this connection. Reconnect it with Basecamp access.'
    },
    asana_workspace: {
      title: 'Select Asana workspace', fieldName: 'workspaceGid', fieldId: 'asanaWorkspaceGid', fieldLabel: 'Authorized workspace', selectedField: 'asanaWorkspaceGid',
      optionsKey: 'workspaces', optionId: 'workspaceGid', placeholder: 'Select a workspace', organizationSuffix: true, notice: 'Sneup will only ingest read-only project tasks from the selected workspace.',
      submitLabel: 'Use this workspace', successTitle: 'Asana workspace selected', successMessage: 'Sneup will use this workspace for the next read-only sync.', errorTitle: 'Asana workspace selection', emptyMessage: 'No Asana workspaces are currently authorized for this account. Reconnect it with workspace read access.'
    },
    confluence_site: {
      title: 'Select Confluence site', fieldName: 'cloudId', fieldId: 'confluenceCloudId', fieldLabel: 'Authorized Confluence site', selectedField: 'confluenceCloudId',
      optionsKey: 'sites', optionId: 'cloudId', placeholder: 'Select a site', urlSuffix: true, notice: 'Sneup will ingest space and page metadata only. It does not read page bodies, comments, attachments, users, descriptions, URLs, or version messages.',
      submitLabel: 'Use this site', successTitle: 'Confluence site selected', successMessage: 'Sneup will use this site for the next read-only metadata sync.', errorTitle: 'Confluence site selection', emptyMessage: 'No Confluence sites are currently authorized for this account. Reconnect it with page and space read access.'
    },
    jira_site: {
      title: 'Select Jira site', fieldName: 'cloudId', fieldId: 'jiraCloudId', fieldLabel: 'Authorized Jira site', selectedField: 'cloudId',
      optionsKey: 'sites', optionId: 'cloudId', placeholder: 'Select a site', urlSuffix: true, notice: 'Sneup will only ingest read-only work signals from the selected site.',
      submitLabel: 'Use this site', successTitle: 'Jira site selected', successMessage: 'Sneup will use this site for the next read-only sync.', errorTitle: 'Jira site selection', emptyMessage: 'No Jira sites are currently authorized for this account. Reconnect it with Jira read access.'
    }
  });

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

    function openSelectionForm({ kind, accountId, account, data = {} } = {}) {
      const config = SELECTION_FORMS[kind];
      if (!config || !accountId || !account || !elements.modal || !elements.modalTitle || !elements.modalBody) return false;

      const availableOptions = config.optionsKey
        ? (Array.isArray(data[config.optionsKey]) ? data[config.optionsKey].slice(0, 100) : [])
        : null;
      if (availableOptions && availableOptions.length === 0) {
        callbacks.openNotice(t(config.errorTitle), t(config.emptyMessage));
        return false;
      }

      const storedValue = account.metadata?.fields?.[config.selectedField] || '';
      const selectedValue = storedValue || (availableOptions?.length === 1 ? availableOptions[0][config.optionId] : '');
      const control = availableOptions
        ? `<select id="${config.fieldId}" name="${config.fieldName}" required>
            <option value="" ${selectedValue ? '' : 'selected'} disabled>${et(config.placeholder)}</option>
            ${availableOptions.map((option) => {
              const value = String(option[config.optionId] || '');
              const suffix = config.organizationSuffix && option.organization ? ` (${et('organization')})`
                : config.urlSuffix && option.url ? ` (${escapeHtml(option.url)})` : '';
              return `<option value="${escapeHtml(value)}" ${value === String(selectedValue) ? 'selected' : ''}>${escapeHtml(option.name || value)}${suffix}</option>`;
            }).join('')}
          </select>`
        : `<input id="${config.fieldId}" name="${config.fieldName}" type="text" required value="${escapeHtml(selectedValue)}" ${Object.entries(config.input || {}).map(([key, value]) => `${key}="${escapeHtml(key === 'placeholder' ? t(value) : value)}"`).join(' ')}>`;

      elements.modalTitle.textContent = t(config.title);
      elements.modalBody.innerHTML = `
        <form id="connectorSelectionForm">
          <div class="field">
            <label for="${config.fieldId}">${et(config.fieldLabel)}</label>
            ${control}
          </div>
          <div class="notice">${et(config.notice)}</div>
          <div class="toolbar modal-actions">
            <button class="button" type="button" id="cancelConnectorSelection">${et('Cancel')}</button>
            <button class="button primary" type="submit">${et(config.submitLabel)}</button>
          </div>
        </form>
      `;
      elements.modal.classList.add('open');

      const form = document.getElementById('connectorSelectionForm');
      const submitButton = form.querySelector('button[type="submit"]');
      document.getElementById('cancelConnectorSelection').addEventListener('click', callbacks.closeModal);
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (submitButton.disabled) return;
        submitButton.disabled = true;
        submitButton.textContent = t('Saving...');
        try {
          const body = Object.fromEntries(new window.FormData(form).entries());
          await callbacks.saveConnectorSelection(kind, accountId, body);
          callbacks.closeModal();
          callbacks.openNotice(t(config.successTitle), t(config.successMessage));
          await callbacks.loadConnectors();
        } catch (error) {
          submitButton.disabled = false;
          submitButton.textContent = t(config.submitLabel);
          callbacks.openNotice(t(config.errorTitle), error.message);
        }
      });
      return true;
    }

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

    return { openSelectionForm, render };
  }

  return { createController, SELECTION_ACTIONS, SELECTION_FORMS, SYNC_COUNT_FIELDS, DYNAMIC_OPERATOR_MESSAGES, NL_MESSAGES };
});
