(function attachWorkSignalsView(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.SneupWorkSignalsView = api;
})(typeof window !== 'undefined' ? window : globalThis, function createWorkSignalsViewModule() {
  const NL_MESSAGES = Object.freeze({
    'The Work Signals view loaded without its runtime. Try again.': 'De weergave Werkssignalen is zonder runtime geladen. Probeer het opnieuw.',
    'The Work Signals view could not be loaded. Check the connection and try again.': 'De weergave Werkssignalen kon niet worden geladen. Controleer de verbinding en probeer het opnieuw.',
    'No items yet.': 'Nog geen items.',
    'Signals': 'Signalen',
    'Open': 'Open',
    'open': 'open',
    'in progress': 'bezig',
    'blocked': 'geblokkeerd',
    'critical': 'kritiek',
    'high': 'hoog',
    'medium': 'gemiddeld',
    'low': 'laag',
    'stale': 'verouderd',
    'confirmed': 'bevestigd',
    'refreshed': 'vernieuwd',
    'dismissed': 'verworpen',
    'contract only': 'alleen contract',
    'graph decision': 'graafbeslissing',
    'Blocked': 'Geblokkeerd',
    'Critical': 'Kritiek',
    'Providers': 'Providers',
    'Graph items': 'Graafitems',
    'Graph actors': 'Graafactoren',
    'Graph dependencies': 'Graafafhankelijkheden',
    'Stale graph edges': 'Verouderde graafverbindingen',
    'Implemented adapters': 'Geimplementeerde adapters',
    'Connected adapters': 'Gekoppelde adapters',
    '{count} provider': '{count} provider',
    '{count} providers': '{count} providers',
    'Work signals need MongoDB/live data: {error}': 'Werkssignalen hebben MongoDB/livegegevens nodig: {error}',
    'Normalized graph: {items} items, {containers} containers, {dependencies} dependencies, {events} events.': 'Genormaliseerde graaf: {items} items, {containers} containers, {dependencies} afhankelijkheden, {events} gebeurtenissen.',
    'Graph decisions: {robert} Robert, {va} VA, {team} team.': 'Graafbeslissingen: {robert} Robert, {va} VA, {team} team.',
    'Cross-tool decision generation is paused by this workspace rollout. Synced signals and dependency evidence remain read-only and visible.': 'Besluitvorming tussen tools is gepauzeerd door de uitrol van deze werkruimte. Gesynchroniseerde signalen en afhankelijkheidsbewijs blijven alleen-lezen en zichtbaar.',
    'Graph trust: {count} stale edges need review; {coverage}% of reviewable edges have an outcome.': 'Graafvertrouwen: {count} verouderde verbindingen moeten worden beoordeeld; {coverage}% van de beoordeelbare verbindingen heeft een uitkomst.',
    'Outcomes: {outcomes}.': 'Uitkomsten: {outcomes}.',
    'Connector detail: {detail}.': 'Connectordetail: {detail}.',
    '{count} confirmed': '{count} bevestigd',
    '{count} refreshed': '{count} vernieuwd',
    '{count} dismissed': '{count} verworpen',
    '{provider}: {stale} stale, {pending} pending': '{provider}: {stale} verouderd, {pending} in afwachting',
    'No owner': 'Geen eigenaar',
    'Due {date}': 'Vervalt {date}',
    'No description captured yet.': 'Nog geen beschrijving vastgelegd.',
    'evidence': 'bewijs',
    'Open source': 'Bron openen',
    'Graph decision': 'Graafbeslissing',
    'work graph': 'werkgraaf',
    'decision': 'beslissing',
    '{risk} risk': 'risico {risk}',
    '{score} graph score': '{score} graafscore',
    'Review graph evidence before queuing.': 'Beoordeel graafbewijs voordat u het in de wachtrij plaatst.',
    'Inspect graph': 'Graaf bekijken',
    'Queue Yes/No': 'Ja/Nee in wachtrij plaatsen',
    '{count} dependency': '{count} afhankelijkheid',
    '{count} dependencies': '{count} afhankelijkheden',
    '{count} blocking downstream': '{count} blokkeert verderop',
    '{count} blocker': '{count} blokkering',
    '{count} blockers': '{count} blokkeringen',
    '{count} related': '{count} gerelateerd',
    'No normalized graph item is linked to this Trello context yet. Sync connector work signals to enrich dependency context.': 'Er is nog geen genormaliseerd graafitem aan deze Trello-context gekoppeld. Synchroniseer connectorwerksignalen om de afhankelijkheidscontext te verrijken.',
    'Graph Context': 'Graafcontext',
    'linked': 'gekoppeld',
    'empty': 'leeg',
    '{count} graph item': '{count} graafitem',
    '{count} graph items': '{count} graafitems',
    '{count} decision': '{count} beslissing',
    '{count} decisions': '{count} beslissingen',
    '{count} graph recommendation': '{count} graafaanbeveling',
    '{count} graph recommendations': '{count} graafaanbevelingen',
    'Linked Source Items': 'Gekoppelde bronitems',
    'Linked Graph Items': 'Gekoppelde graafitems',
    'Graph Decision Candidates': 'Kandidaten voor graafbeslissingen',
    'Graph Dependency Edges': 'Graafafhankelijkheidsverbindingen',
    'Graph Recommendation History': 'Geschiedenis van graafaanbevelingen',
    'Provider': 'Provider',
    'Type': 'Type',
    'Direction': 'Richting',
    'All': 'Alles',
    '{count} visible graph row': '{count} zichtbare graafrij',
    '{count} visible graph rows': '{count} zichtbare graafrijen',
    'Work graph detail': 'Werkgraafdetail',
    'Work item': 'Werkitem',
    'unknown': 'onbekend',
    'provider': 'provider',
    'no external id': 'geen externe id',
    'Open source item': 'Bronitem openen',
    'Decision Candidate': 'Beslissingskandidaat',
    'Dependency Edges': 'Afhankelijkheidsverbindingen',
    'Queued Recommendation History': 'Geschiedenis van aanbevelingen in wachtrij',
    'Recent Graph Events': 'Recente graafgebeurtenissen',
    'Done': 'Gereed',
    'Linked source': 'Gekoppelde bron',
    'Decision candidate': 'Beslissingskandidaat',
    '{score} score': 'score {score}',
    '{confidence}% confidence': '{confidence}% zekerheid',
    'Review required.': 'Beoordeling vereist.',
    'Source': 'Bron',
    'Target': 'Doel',
    'Linked work item': 'Gekoppeld werkitem',
    'needs review': 'moet worden beoordeeld',
    'fresh': 'actueel',
    'related': 'gerelateerd',
    'Dependency relationship': 'Afhankelijkheidsrelatie',
    'resolved': 'afgehandeld',
    'seen {date}': 'gezien {date}',
    'unreviewed': 'niet beoordeeld',
    'Open target': 'Doel openen',
    'Confirm edge': 'Verbinding bevestigen',
    'Refresh trust': 'Vertrouwen vernieuwen',
    'Dismiss edge': 'Verbinding verwerpen',
    'Recommendation': 'Aanbeveling',
    'pending': 'in afwachting',
    'manual review': 'handmatige beoordeling',
    'team': 'team',
    'Review queued recommendation.': 'Beoordeel de aanbeveling in de wachtrij.',
    'Graph event': 'Graafgebeurtenis',
    'synced': 'gesynchroniseerd',
    'connected': 'gekoppeld',
    'adapter': 'adapter',
    'contract': 'contract',
    'No sync targets declared': 'Geen synchronisatiedoelen opgegeven'
  });

  const DYNAMIC_OPERATOR_MESSAGES = Object.freeze(Object.keys(NL_MESSAGES));

  function createController(options = {}) {
    const document = options.document;
    const state = options.state || {};
    const els = options.elements || {};
    const callbacks = options.callbacks || {};
    const t = options.t || ((value) => value);
    const plural = options.plural || ((singular, pluralMessage, count) => String(count === 1 ? singular : pluralMessage).replace('{count}', count));
    const escapeHtml = options.escapeHtml || ((value) => String(value ?? ''));
    const hostFormatDate = options.formatDate || ((value) => String(value || ''));
    const severityClass = options.severityClass || (() => 'review');
    const signalClass = options.signalClass || (() => 'review');
    const isFeatureEnabled = options.isFeatureEnabled || (() => false);
    const safeExternalUrl = options.safeExternalUrl || (() => '');
    const et = (message, params) => escapeHtml(t(message, params));
    const ep = (singular, pluralMessage, count, params) => escapeHtml(plural(singular, pluralMessage, count, params));
    const unique = (values) => [...new Set((values || []).filter(Boolean))];
    const cssEscape = (value) => {
      if (options.window?.CSS?.escape) return options.window.CSS.escape(String(value || ''));
      return String(value || '').replace(/[^a-zA-Z0-9_-]/g, '\\$&');
    };
    const statusText = (value, fallback) => et(String(value || fallback).replaceAll('_', ' '));
    const formatDate = (value) => {
      if (!value) return t('No date');
      try {
        return hostFormatDate(value);
      } catch (error) {
        return t('No date');
      }
    };
    const listOrEmpty = (items, renderer) => items.length
      ? items.map(renderer).join('')
      : `<div class="empty">${et('No items yet.')}</div>`;
    const externalLink = (url, label) => {
      const safeUrl = safeExternalUrl(url);
      return safeUrl
        ? `<a class="button" href="${escapeHtml(safeUrl)}" target="_blank" rel="noreferrer">${et(label)}</a>`
        : '';
    };

    const openGraphItemDetail = callbacks.openGraphItemDetail || (() => {});
    const queueGraphDecision = callbacks.queueGraphDecision || (() => {});
    const reviewGraphDependency = callbacks.reviewGraphDependency || (() => {});
    const closeModal = callbacks.closeModal || (() => {});

    function countByOwner(items, ownerType) {
      return items.filter(item => item.ownerType === ownerType).length;
    }

    function renderDependencySummary(summary = {}) {
      const total = Number(summary.dependencyCount) || 0;
      if (!total) return '';
      const blocking = Number(summary.blockingCount) || 0;
      const blockers = Number(summary.blockedByCount) || 0;
      const related = Number(summary.relatedCount) || 0;
      return `
        <div class="meta">
          <span>${ep('{count} dependency', '{count} dependencies', total)}</span>
          <span>${et('{count} blocking downstream', { count: blocking })}</span>
          <span>${ep('{count} blocker', '{count} blockers', blockers)}</span>
          <span>${et('{count} related', { count: related })}</span>
        </div>
      `;
    }

    function bindGraphActions() {
      document.querySelectorAll('[data-graph-detail]').forEach((button) => {
        button.addEventListener('click', () => openGraphItemDetail(button.dataset.graphDetail));
      });
      document.querySelectorAll('[data-graph-queue]').forEach((button) => {
        button.addEventListener('click', () => queueGraphDecision(button.dataset.graphQueue));
      });
      document.querySelectorAll('[data-graph-dependency-review]').forEach((button) => {
        button.addEventListener('click', () => reviewGraphDependency(
          button.dataset.graphDependencyReview,
          button.dataset.graphDependencyAction
        ));
      });
    }

    function activeGraphFilter(group) {
      return document.querySelector(`[data-graph-filter="${cssEscape(group)}"].active`)?.dataset.graphFilterValue || 'all';
    }

    function applyGraphLedgerFilters() {
      const provider = activeGraphFilter('provider');
      const type = activeGraphFilter('type');
      const direction = activeGraphFilter('direction');
      let visible = 0;

      document.querySelectorAll('[data-graph-ledger-row]').forEach((row) => {
        const providers = (row.dataset.graphProviders || '').split('|').filter(Boolean);
        const dependencyType = row.dataset.graphDependencyType || '';
        const rowDirection = row.dataset.graphDirection || '';
        const providerMatches = provider === 'all' || providers.includes(provider);
        const typeMatches = type === 'all' || dependencyType === type || !dependencyType;
        const directionMatches = direction === 'all' || rowDirection === direction || !rowDirection;
        const shouldShow = providerMatches && typeMatches && directionMatches;
        row.classList.toggle('graph-hidden', !shouldShow);
        if (shouldShow) visible += 1;
      });

      document.querySelectorAll('[data-graph-filter-count]').forEach((node) => {
        node.textContent = plural('{count} visible graph row', '{count} visible graph rows', visible);
      });
    }

    function bindGraphLedgerFilters() {
      document.querySelectorAll('[data-graph-filter]').forEach((button) => {
        button.addEventListener('click', () => {
          const group = button.dataset.graphFilter;
          document.querySelectorAll(`[data-graph-filter="${cssEscape(group)}"]`).forEach((peer) => {
            peer.classList.toggle('active', peer === button);
          });
          applyGraphLedgerFilters();
        });
      });
      applyGraphLedgerFilters();
    }

    function graphRowAttrs({ providers = [], dependencyType = '', direction = '' } = {}) {
      return [
        'data-graph-ledger-row',
        `data-graph-providers="${escapeHtml(unique(providers).join('|'))}"`,
        `data-graph-dependency-type="${escapeHtml(dependencyType)}"`,
        `data-graph-direction="${escapeHtml(direction)}"`
      ].join(' ');
    }

    function renderGraphDetailSection(title, items, renderer) {
      return `
        <section>
          <div class="panel-head evidence-head">
            <h2>${et(title)}</h2>
            <span class="pill review">${items.length}</span>
          </div>
          <div class="list">${listOrEmpty(items.slice(0, 8), renderer)}</div>
        </section>
      `;
    }

    function renderGraphLinkedItem(item = {}) {
      return `
        <div class="item" ${graphRowAttrs({ providers: [item.sourceProvider] })}>
          <div class="item-title">
            <strong>${escapeHtml(item.title || item.externalId || t('Linked source'))}</strong>
            <span class="pill review">${escapeHtml(item.sourceProvider || t('provider'))}</span>
          </div>
          <div class="meta">
            <span>${escapeHtml(item.externalId || item.canonicalKey || t('no external id'))}</span>
            <span>${statusText(item.status, 'unknown')}</span>
          </div>
          <div class="item-actions">
            ${externalLink(item.url, 'Open source')}
            ${item.id ? `<button class="button" data-graph-detail="${escapeHtml(item.id)}" type="button">${et('Inspect graph')}</button>` : ''}
            ${item.id ? `<button class="button primary" data-graph-queue="${escapeHtml(item.id)}" type="button">${et('Queue Yes/No')}</button>` : ''}
          </div>
        </div>
      `;
    }

    function renderGraphCandidateDetail(candidate = {}) {
      const provider = candidate.sourceProvider || candidate.actionPayload?.sourceProvider || 'work_graph';
      const itemId = candidate.workItemId || candidate.actionPayload?.workItemId;
      const providerUrl = candidate.providerUrl || candidate.actionPayload?.providerUrl;
      return `
        <div class="item" ${graphRowAttrs({ providers: [provider] })}>
          <div class="item-title">
            <strong>${escapeHtml(candidate.title || candidate.recommendedAction || t('Decision candidate'))}</strong>
            <span class="pill ${severityClass(candidate.riskLevel)}">${statusText(candidate.ownerType, 'team')}</span>
          </div>
          <div class="meta">
            <span>${escapeHtml(provider)}</span>
            <span>${statusText(candidate.findingType, 'graph_decision')}</span>
            <span>${statusText(candidate.actionType, 'manual_review')}</span>
            <span>${et('{score} score', { score: Math.round(candidate.graphScore || 0) })}</span>
            <span>${et('{confidence}% confidence', { confidence: Math.round((candidate.confidence || 0) * 100) })}</span>
          </div>
          <div class="meta">${escapeHtml(candidate.approvalReason || candidate.description || candidate.recommendedAction || t('Review required.'))}</div>
          ${renderDependencySummary(candidate.dependencySummary)}
          <div class="item-actions">
            ${externalLink(providerUrl, 'Open source')}
            ${itemId ? `<button class="button" data-graph-detail="${escapeHtml(itemId)}" type="button">${et('Inspect graph')}</button>` : ''}
            ${itemId ? `<button class="button primary" data-graph-queue="${escapeHtml(itemId)}" type="button">${et('Queue Yes/No')}</button>` : ''}
          </div>
        </div>
      `;
    }

    function renderGraphDependency(dependency = {}) {
      const peer = dependency.peerItem || dependency.targetItem || dependency.unresolvedTarget || dependency.sourceItem || {};
      const freshness = dependency.freshnessStatus || 'fresh';
      const providers = [
        dependency.sourceProvider,
        dependency.targetProvider,
        dependency.sourceItem?.sourceProvider,
        dependency.targetItem?.sourceProvider,
        dependency.unresolvedTarget?.sourceProvider,
        peer.sourceProvider
      ];
      const edgeLabel = dependency.sourceItem && dependency.targetItem
        ? `${dependency.sourceItem.title || dependency.sourceItem.externalId || t('Source')} -> ${dependency.targetItem.title || dependency.targetItem.externalId || t('Target')}`
        : dependency.externalId;
      const targetUrl = dependency.targetItem?.url || dependency.unresolvedTarget?.url || dependency.targetUrl;
      return `
        <div class="item" ${graphRowAttrs({ providers, dependencyType: dependency.dependencyType, direction: dependency.direction })}>
          <div class="item-title">
            <strong>${escapeHtml(peer.title || edgeLabel || t('Linked work item'))}</strong>
            <span class="pill review">${statusText(dependency.dependencyType, 'unknown')}</span>
            ${freshness === 'stale' ? `<span class="pill critical">${et('needs review')}</span>` : `<span class="pill healthy">${et('fresh')}</span>`}
          </div>
          <div class="meta">
            <span>${statusText(dependency.direction, 'related')}</span>
            <span>${escapeHtml(dependency.relationship || t('Dependency relationship'))}</span>
            <span>${statusText(dependency.resolutionStatus, 'resolved')}</span>
            <span>${statusText(freshness, 'fresh')}</span>
            <span>${et('{confidence}% confidence', { confidence: Math.round((dependency.confidence || 0) * 100) })}</span>
          </div>
          <div class="meta">
            <span>${escapeHtml(peer.sourceProvider || dependency.targetProvider || dependency.sourceProvider || t('provider'))}</span>
            <span>${escapeHtml(peer.externalId || dependency.targetExternalId || t('no external id'))}</span>
            <span>${statusText(peer.status, 'unknown')}</span>
            ${dependency.lastSeenAt ? `<span>${et('seen {date}', { date: formatDate(dependency.lastSeenAt) })}</span>` : ''}
            <span>${statusText(dependency.reviewStatus, 'unreviewed')}</span>
          </div>
          ${dependency.staleReason ? `<div class="meta">${escapeHtml(dependency.staleReason)}</div>` : ''}
          <div class="item-actions">
            ${externalLink(dependency.sourceItem?.url, 'Open source')}
            ${externalLink(targetUrl, 'Open target')}
            ${peer.id ? `<button class="button" data-graph-detail="${escapeHtml(peer.id)}" type="button">${et('Inspect graph')}</button>` : ''}
            ${freshness === 'stale' && dependency.id ? `
              <button class="button" data-graph-dependency-review="${escapeHtml(dependency.id)}" data-graph-dependency-action="confirm" type="button">${et('Confirm edge')}</button>
              <button class="button" data-graph-dependency-review="${escapeHtml(dependency.id)}" data-graph-dependency-action="refresh" type="button">${et('Refresh trust')}</button>
              <button class="button danger" data-graph-dependency-review="${escapeHtml(dependency.id)}" data-graph-dependency-action="dismiss" type="button">${et('Dismiss edge')}</button>
            ` : ''}
          </div>
        </div>
      `;
    }

    function renderGraphRecommendationHistory(recommendation = {}) {
      const provider = recommendation.sourceProvider || 'work_graph';
      return `
        <div class="item" ${graphRowAttrs({ providers: [provider] })}>
          <div class="item-title">
            <strong>${escapeHtml(recommendation.title || recommendation.recommendedAction || t('Recommendation'))}</strong>
            <span class="pill ${severityClass(recommendation.riskLevel)}">${statusText(recommendation.status, 'pending')}</span>
          </div>
          <div class="meta">
            <span>${escapeHtml(provider)}</span>
            <span>${statusText(recommendation.actionType, 'manual_review')}</span>
            <span>${statusText(recommendation.ownerType, 'team')}</span>
            <span>${formatDate(recommendation.createdAt)}</span>
          </div>
          <div class="meta">${escapeHtml(recommendation.approvalReason || recommendation.recommendedAction || t('Review queued recommendation.'))}</div>
          <div class="item-actions">
            ${externalLink(recommendation.providerUrl, 'Open source')}
            ${recommendation.workItemId ? `<button class="button" data-graph-detail="${escapeHtml(recommendation.workItemId)}" type="button">${et('Inspect graph')}</button>` : ''}
          </div>
        </div>
      `;
    }

    function renderGraphEvent(event = {}) {
      return `
        <div class="item">
          <div class="item-title">
            <strong>${escapeHtml(event.summary || event.eventType || t('Graph event'))}</strong>
            <span class="pill review">${statusText(event.eventType, 'synced')}</span>
          </div>
          <div class="meta">
            <span>${formatDate(event.occurredAt)}</span>
            <span>${escapeHtml(event.sourceProvider || t('provider'))}</span>
          </div>
        </div>
      `;
    }

    function renderGraphFilterGroup(label, group, values = []) {
      if (!values.length) return '';
      return `
        <div class="graph-filter-group">
          <span>${et(label)}</span>
          <div class="segmented graph-filter-buttons" data-graph-filter-group="${escapeHtml(group)}">
            <button class="active" data-graph-filter="${escapeHtml(group)}" data-graph-filter-value="all" type="button">${et('All')}</button>
            ${values.map(value => `
              <button data-graph-filter="${escapeHtml(group)}" data-graph-filter-value="${escapeHtml(value)}" type="button">${escapeHtml(value)}</button>
            `).join('')}
          </div>
        </div>
      `;
    }

    function renderGraphLedgerFilters(graphContext = {}) {
      const filters = graphContext.filters || {};
      const providers = filters.providers || [];
      const dependencyTypes = filters.dependencyTypes || [];
      const directions = filters.directions || [];
      if (!providers.length && !dependencyTypes.length && !directions.length) return '';

      return `
        <div class="graph-filter-panel">
          ${renderGraphFilterGroup('Provider', 'provider', providers)}
          ${renderGraphFilterGroup('Type', 'type', dependencyTypes)}
          ${renderGraphFilterGroup('Direction', 'direction', directions)}
          <span class="meta graph-filter-count" data-graph-filter-count>${ep('{count} visible graph row', '{count} visible graph rows', 0)}</span>
        </div>
      `;
    }

    function renderGraphLedgerContext(graphContext = {}) {
      const counts = graphContext.counts || {};
      const hasGraph = (counts.items || 0) > 0 || (counts.dependencies || 0) > 0 || (counts.decisions || 0) > 0;
      const notice = hasGraph
        ? ''
        : `<div class="notice">${et('No normalized graph item is linked to this Trello context yet. Sync connector work signals to enrich dependency context.')}</div>`;

      return `
        <section>
          <div class="panel-head evidence-head">
            <h2>${et('Graph Context')}</h2>
            <span class="pill ${hasGraph ? 'healthy' : 'review'}">${et(hasGraph ? 'linked' : 'empty')}</span>
          </div>
          <div class="item">
            <div class="meta">
              <span>${ep('{count} graph item', '{count} graph items', counts.items || 0)}</span>
              <span>${ep('{count} dependency', '{count} dependencies', counts.dependencies || 0)}</span>
              <span>${ep('{count} decision', '{count} decisions', counts.decisions || 0)}</span>
              <span>${ep('{count} graph recommendation', '{count} graph recommendations', counts.recommendations || 0)}</span>
            </div>
          </div>
          ${notice}
          ${renderGraphLedgerFilters(graphContext)}
          ${renderGraphDetailSection('Linked Source Items', graphContext.sourceLinks || [], renderGraphLinkedItem)}
          ${renderGraphDetailSection('Linked Graph Items', graphContext.items || [], renderGraphLinkedItem)}
          ${renderGraphDetailSection('Graph Decision Candidates', graphContext.candidates || [], renderGraphCandidateDetail)}
          ${renderGraphDetailSection('Graph Dependency Edges', graphContext.dependencies || [], renderGraphDependency)}
          ${renderGraphDetailSection('Graph Recommendation History', graphContext.recommendations || [], renderGraphRecommendationHistory)}
        </section>
      `;
    }

    function renderGraphReviewQuality(graph = {}) {
      const metrics = graph.reviewMetrics || {};
      const providers = (graph.providerReviewQuality || [])
        .filter(provider => provider.pendingReview || provider.stale || provider.reviewed)
        .slice(0, 5);
      if (!metrics.pendingReview && !providers.length) return '';

      const providerSummary = providers.map(provider => t('{provider}: {stale} stale, {pending} pending', {
        provider: provider.provider,
        stale: provider.stale || 0,
        pending: provider.pendingReview || 0
      })).join(' | ');
      const outcomeSummary = [
        metrics.confirmed ? t('{count} confirmed', { count: metrics.confirmed }) : '',
        metrics.refreshed ? t('{count} refreshed', { count: metrics.refreshed }) : '',
        metrics.dismissed ? t('{count} dismissed', { count: metrics.dismissed }) : ''
      ].filter(Boolean).join(', ');
      const base = t('Graph trust: {count} stale edges need review; {coverage}% of reviewable edges have an outcome.', {
        count: metrics.pendingReview || 0,
        coverage: metrics.reviewCoverage || 0
      });
      const outcomes = outcomeSummary ? ` ${t('Outcomes: {outcomes}.', { outcomes: outcomeSummary })}` : '';
      const detail = providerSummary ? ` ${t('Connector detail: {detail}.', { detail: providerSummary })}` : '';
      return `<div class="notice">${escapeHtml(base + outcomes + detail)}</div>`;
    }

    function renderWorkSignal(signal = {}) {
      const evidence = signal.evidenceRefs || [];
      const sourceUrl = safeExternalUrl(signal.url);
      return `
        <div class="item">
          <div class="item-title">
            <strong>${escapeHtml(signal.title)}</strong>
            <span class="pill ${signalClass(signal)}">${statusText(signal.priority || signal.status, 'unknown')}</span>
          </div>
          <div class="meta">
            <span>${escapeHtml(signal.provider)}</span>
            <span>${statusText(signal.sourceType, 'unknown')}</span>
            <span>${statusText(signal.status, 'unknown')}</span>
            <span>${escapeHtml((signal.owners || []).join(', ') || t('No owner'))}</span>
            <span>${et('Due {date}', { date: formatDate(signal.dueAt) })}</span>
          </div>
          <div class="meta">${escapeHtml(signal.description || t('No description captured yet.'))}</div>
          ${evidence.length > 0 ? `<div class="meta">${evidence.slice(0, 3).map(item => escapeHtml(item.label || item.type || item.externalId || t('evidence'))).join(' | ')}</div>` : ''}
          ${sourceUrl ? `<div class="meta"><a href="${escapeHtml(sourceUrl)}" rel="noreferrer" target="_blank">${et('Open source')}</a></div>` : ''}
        </div>
      `;
    }

    function renderGraphDecisionCandidate(candidate = {}) {
      const dependencySummary = candidate.dependencySummary || candidate.actionPayload?.dependencySummary || {};
      const itemId = candidate.workItemId || candidate.actionPayload?.workItemId;
      return `
        <div class="item">
          <div class="item-title">
            <strong>${escapeHtml(candidate.title || candidate.recommendedAction || t('Graph decision'))}</strong>
            <span class="pill ${severityClass(candidate.riskLevel)}">${statusText(candidate.ownerType, 'team')}</span>
          </div>
          <div class="meta">
            <span>${escapeHtml(candidate.sourceProvider || candidate.actionPayload?.sourceProvider || t('work graph'))}</span>
            <span>${statusText(candidate.findingType, 'decision')}</span>
            <span>${et('{risk} risk', { risk: t(candidate.riskLevel || 'medium') })}</span>
            <span>${et('{score} graph score', { score: Math.round(candidate.graphScore || 0) })}</span>
          </div>
          <div class="meta">${escapeHtml(candidate.description || candidate.recommendedAction || t('Review graph evidence before queuing.'))}</div>
          ${renderDependencySummary(dependencySummary)}
          <div class="item-actions">
            <button class="button" data-graph-detail="${escapeHtml(itemId)}" type="button" ${itemId ? '' : 'disabled'}>${et('Inspect graph')}</button>
            <button class="button primary" data-graph-queue="${escapeHtml(itemId)}" type="button" ${itemId ? '' : 'disabled'}>${et('Queue Yes/No')}</button>
          </div>
        </div>
      `;
    }

    function renderWorkSignalContract(contract = {}, connected) {
      const implemented = contract.adapterStatus === 'implemented';
      return `
        <div class="item">
          <div class="item-title">
            <strong>${escapeHtml(contract.connectorName)}</strong>
            <span class="pill ${connected ? 'connected' : implemented ? 'healthy' : 'review'}">${et(connected ? 'connected' : implemented ? 'adapter' : 'contract')}</span>
          </div>
          <div class="meta">
            <span>${escapeHtml(contract.category)}</span>
            <span>${escapeHtml(contract.authType)}</span>
            <span>${escapeHtml(contract.outputModel)}</span>
            <span>${statusText(contract.adapterStatus, 'contract_only')}</span>
          </div>
          <div class="meta">${(contract.syncTargets || []).slice(0, 5).map(escapeHtml).join(' | ') || et('No sync targets declared')}</div>
          <div class="meta">${escapeHtml(contract.safeWritePolicy)}</div>
        </div>
      `;
    }

    function render() {
      document.querySelectorAll('[data-signal-filter]').forEach((button) => {
        button.classList.toggle('active', button.dataset.signalFilter === state.signalFilter);
      });

      const signals = state.workSignals || [];
      const contracts = state.workSignalContracts || [];
      const graph = state.workGraph || { counts: {}, byStatus: {}, byProvider: {}, reviewMetrics: {}, providerReviewQuality: [], items: [] };
      const graphCandidates = state.workGraphCandidates || [];
      const providers = unique(signals.map(signal => signal.provider));
      const connectedProviderIds = new Set((state.accounts || []).map(account => account.connectorId));
      const connectedContracts = contracts.filter(contract => connectedProviderIds.has(contract.connectorId));
      const implementedContracts = contracts.filter(contract => contract.adapterStatus === 'implemented');
      const openSignals = signals.filter(signal => ['open', 'in_progress'].includes(signal.status));
      const blockedSignals = signals.filter(signal => signal.status === 'blocked');
      const criticalSignals = signals.filter(signal => signal.priority === 'critical');

      els.workSignalCount.textContent = signals.length;
      els.workSignalContractCount.textContent = plural('{count} provider', '{count} providers', contracts.length);
      els.workSignalMetrics.innerHTML = [
        ['Signals', signals.length],
        ['Open', openSignals.length],
        ['Blocked', blockedSignals.length],
        ['Critical', criticalSignals.length],
        ['Providers', providers.length],
        ['Graph items', graph.counts.items || 0],
        ['Graph actors', graph.counts.actors || 0],
        ['Graph dependencies', graph.counts.dependencies || 0],
        ['Stale graph edges', graph.reviewMetrics?.pendingReview || 0],
        ['Graph decisions', graphCandidates.length],
        ['Implemented adapters', implementedContracts.length],
        ['Connected adapters', connectedContracts.length]
      ].map(([label, value]) => `
        <div class="metric">
          <span>${et(label)}</span>
          <strong>${escapeHtml(value)}</strong>
        </div>
      `).join('');

      const filteredSignals = state.signalFilter === 'all'
        ? signals
        : signals.filter(signal => signal.status === state.signalFilter);
      const notice = state.workSignalError
        ? `<div class="notice">${et('Work signals need MongoDB/live data: {error}', { error: state.workSignalError })}</div>`
        : '';
      const graphNotice = graph.counts.items
        ? `<div class="notice">${et('Normalized graph: {items} items, {containers} containers, {dependencies} dependencies, {events} events.', {
          items: graph.counts.items,
          containers: graph.counts.containers || 0,
          dependencies: graph.counts.dependencies || 0,
          events: graph.counts.events || 0
        })}</div>`
        : '';
      const graphReviewNotice = renderGraphReviewQuality(graph);
      const graphDecisionNotice = graphCandidates.length
        ? `<div class="notice">${et('Graph decisions: {robert} Robert, {va} VA, {team} team.', {
          robert: countByOwner(graphCandidates, 'robert'),
          va: countByOwner(graphCandidates, 'va'),
          team: countByOwner(graphCandidates, 'team')
        })}</div>`
        : !isFeatureEnabled('work_graph_decisions')
          ? `<div class="notice">${et('Cross-tool decision generation is paused by this workspace rollout. Synced signals and dependency evidence remain read-only and visible.')}</div>`
          : '';
      const graphDecisionCards = graphCandidates.length
        ? `<div class="list graph-decision-list">${graphCandidates.map(renderGraphDecisionCandidate).join('')}</div>`
        : '';
      els.workSignalList.innerHTML = notice + graphNotice + graphReviewNotice + graphDecisionNotice + graphDecisionCards + listOrEmpty(filteredSignals, renderWorkSignal);
      els.workSignalContracts.innerHTML = listOrEmpty(
        connectedContracts.length > 0 ? connectedContracts : contracts.slice(0, 12),
        contract => renderWorkSignalContract(contract, connectedProviderIds.has(contract.connectorId))
      );
      bindGraphActions();
    }

    function renderGraphItemDetailModal(detail = {}) {
      const item = detail.item || {};
      const candidate = detail.candidate || null;
      const recommendations = detail.recommendations || [];
      const sourceUrl = safeExternalUrl(item.url);
      els.modalTitle.textContent = t('Work graph detail');
      els.modalBody.innerHTML = `
        <div class="notice-stack">
          <div class="item">
            <div class="item-title">
              <strong>${escapeHtml(item.title || t('Work item'))}</strong>
              <span class="pill ${signalClass(item)}">${statusText(item.priority || item.status, 'unknown')}</span>
            </div>
            <div class="meta">
              <span>${escapeHtml(item.sourceProvider || t('provider'))}</span>
              <span>${escapeHtml(item.externalId || item.canonicalKey || t('no external id'))}</span>
              <span>${statusText(item.status, 'unknown')}</span>
              <span>${et('Due {date}', { date: formatDate(item.dueAt) })}</span>
            </div>
            <div class="meta">${escapeHtml(item.description || t('No description captured yet.'))}</div>
            ${sourceUrl ? `<div class="meta"><a href="${escapeHtml(sourceUrl)}" target="_blank" rel="noreferrer">${et('Open source item')}</a></div>` : ''}
            ${renderDependencySummary(detail.dependencySummary)}
          </div>
          ${renderGraphDetailSection('Decision Candidate', candidate ? [candidate] : [], renderGraphCandidateDetail)}
          ${renderGraphDetailSection('Dependency Edges', detail.dependencies || [], renderGraphDependency)}
          ${renderGraphDetailSection('Queued Recommendation History', recommendations, renderGraphRecommendationHistory)}
          ${renderGraphDetailSection('Recent Graph Events', detail.events || [], renderGraphEvent)}
          <div class="toolbar modal-actions">
            <button class="button" type="button" id="graphDetailQueue" ${item.id ? '' : 'disabled'}>${et('Queue Yes/No')}</button>
            <button class="button primary" type="button" id="graphDetailClose">${et('Done')}</button>
          </div>
        </div>
      `;
      els.modal.classList.add('open');
      document.getElementById('graphDetailClose').addEventListener('click', closeModal);
      document.getElementById('graphDetailQueue').addEventListener('click', () => queueGraphDecision(item.id));
      bindGraphActions();
    }

    return {
      bindGraphActions,
      bindGraphLedgerFilters,
      render,
      renderGraphItemDetailModal,
      renderGraphLedgerContext,
      renderGraphDependency,
      renderGraphLinkedItem,
      renderWorkSignal
    };
  }

  return { createController, DYNAMIC_OPERATOR_MESSAGES, NL_MESSAGES };
});
