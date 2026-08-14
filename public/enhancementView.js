(function attachEnhancementView(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.SneupEnhancementView = api;
})(typeof window !== 'undefined' ? window : globalThis, function createEnhancementViewModule() {
  const NL_MESSAGES = Object.freeze({
    'The enhancement view loaded without its runtime. Try again.': 'De verbeterweergave is zonder runtime geladen. Probeer het opnieuw.',
    'The enhancement view could not be loaded. Check the connection and try again.': 'De verbeterweergave kon niet worden geladen. Controleer de verbinding en probeer het opnieuw.',
    'All areas': 'Alle gebieden',
    'Total': 'Totaal',
    'Ready': 'Gereed',
    'In progress': 'In uitvoering',
    'Needs research': 'Onderzoek nodig',
    'Done': 'Gereed',
    'Blocked': 'Geblokkeerd',
    'AI evaluation': 'AI-evaluatie',
    'not run': 'niet uitgevoerd',
    'By area': 'Per gebied',
    'Evaluation scenarios': 'Evaluatiescenario\'s',
    '{passed}/{total} passed': '{passed}/{total} geslaagd',
    '{count} total': '{count} totaal',
    'Priority {priority}': 'Prioriteit {priority}',
    'Status {status}': 'Status {status}',
    'Effort {effort}': 'Inspanning {effort}',
    'No impact summary yet.': 'Nog geen impactsamenvatting.',
    'Next step': 'Volgende stap',
    'No next step recorded.': 'Geen volgende stap vastgelegd.',
    'Nothing needs attention.': 'Niets vereist aandacht.'
  });

  const DYNAMIC_OPERATOR_MESSAGES = Object.freeze(Object.keys(NL_MESSAGES));
  const STATUS_LABELS = Object.freeze({
    ready: 'Ready',
    'in-progress': 'In progress',
    'needs-research': 'Needs research',
    done: 'Done',
    blocked: 'Blocked'
  });

  function createController(options = {}) {
    const document = options.document;
    const state = options.state || {};
    const elements = options.elements || {};
    const callbacks = options.callbacks || {};
    const t = options.t || (value => value);
    const escapeHtml = options.escapeHtml || (value => String(value ?? ''));

    const statusLabel = status => t(STATUS_LABELS[status] || status || 'Unknown');
    const statusClass = (status) => {
      if (status === 'ready' || status === 'done') return 'healthy';
      if (status === 'in-progress') return 'review';
      if (status === 'blocked') return 'critical';
      return 'high';
    };
    const priorityClass = (priority) => {
      if (priority === 'P0') return 'critical';
      if (priority === 'P1') return 'high';
      if (priority === 'P2') return 'review';
      return 'healthy';
    };

    const renderFilters = () => {
      document.querySelectorAll('[data-enhancement-priority]').forEach((button) => {
        button.classList.toggle('active', button.dataset.enhancementPriority === state.enhancementPriority);
      });
      document.querySelectorAll('[data-enhancement-status]').forEach((button) => {
        button.classList.toggle('active', button.dataset.enhancementStatus === state.enhancementStatus);
      });
    };

    const loadForFilter = () => callbacks.loadEnhancements?.();

    document.querySelectorAll('[data-enhancement-priority]').forEach((button) => {
      button.addEventListener('click', () => {
        const priority = button.dataset.enhancementPriority;
        if (state.enhancementPriority === priority) return;
        state.enhancementPriority = priority;
        renderFilters();
        loadForFilter();
      });
    });
    document.querySelectorAll('[data-enhancement-status]').forEach((button) => {
      button.addEventListener('click', () => {
        const status = button.dataset.enhancementStatus;
        if (state.enhancementStatus === status) return;
        state.enhancementStatus = status;
        renderFilters();
        loadForFilter();
      });
    });
    elements.enhancementAreaFilter?.addEventListener('change', () => {
      const area = elements.enhancementAreaFilter.value;
      if (state.enhancementArea === area) return;
      state.enhancementArea = area;
      loadForFilter();
    });

    const renderEnhancement = item => `
      <div class="item" data-enhancement="${escapeHtml(item.id)}" data-enhancement-status="${escapeHtml(item.status)}">
        <div class="item-title">
          <strong>${escapeHtml(item.title)}</strong>
          <span class="pill ${statusClass(item.status)}">${escapeHtml(statusLabel(item.status))}</span>
        </div>
        <div class="item-title">
          <span>${escapeHtml(item.id)} - ${escapeHtml(item.area)} - ${escapeHtml(item.priority)}</span>
          <span class="pill ${priorityClass(item.priority)}">${escapeHtml(item.area)}</span>
        </div>
        <div class="meta">
          <span>${escapeHtml(t('Priority {priority}', { priority: item.priority }))}</span>
          <span>${escapeHtml(t('Status {status}', { status: statusLabel(item.status) }))}</span>
          <span>${escapeHtml(t('Effort {effort}', { effort: item.effort }))}</span>
        </div>
        <div class="meta">${escapeHtml(item.impact || t('No impact summary yet.'))}</div>
        <details class="payload">
          <summary>${escapeHtml(t('Next step'))}</summary>
          <pre>${escapeHtml(item.nextStep || t('No next step recorded.'))}</pre>
        </details>
      </div>
    `;

    const renderAreas = (summary) => {
      const byArea = summary.byArea || {};
      const currentArea = state.enhancementArea;
      const areaKeys = Object.keys(byArea).sort();
      const selectedArea = areaKeys.includes(currentArea) ? currentArea : 'all';
      state.enhancementArea = selectedArea;
      if (!elements.enhancementAreaFilter) return;

      const signature = JSON.stringify(areaKeys);
      if (!elements.enhancementAreaFilter.dataset.areaSignature || currentArea === 'all') {
        elements.enhancementAreaFilter.dataset.areaSignature = signature;
        elements.enhancementAreaFilter.innerHTML = [
          `<option value="all">${escapeHtml(t('All areas'))}</option>`,
          ...areaKeys.map(area => `<option value="${escapeHtml(area)}">${escapeHtml(area)}</option>`)
        ].join('');
      }
      elements.enhancementAreaFilter.value = selectedArea;
    };

    const render = (errorMessage = '') => {
      const enhancements = state.enhancements || [];
      const summary = state.enhancementSummary || {};
      const statuses = enhancements.reduce((acc, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
      }, {});
      const byPriority = summary.byPriority || {};
      const byStatus = summary.byStatus || {};
      const evaluation = state.recommendationEvaluation;

      renderFilters();
      renderAreas(summary);
      elements.enhancementCount.textContent = enhancements.length;
      elements.enhancementStatusSummary.textContent = t('{count} total', { count: enhancements.length });
      elements.enhancementMetrics.innerHTML = [
        [t('Total'), enhancements.length],
        ['P0', byPriority.P0 || 0],
        ['P1', byPriority.P1 || 0],
        ['P2', byPriority.P2 || 0],
        ['P3', byPriority.P3 || 0],
        [t('Ready'), byStatus.ready || statuses.ready || 0],
        [t('In progress'), byStatus['in-progress'] || statuses['in-progress'] || 0],
        [t('Needs research'), byStatus['needs-research'] || statuses['needs-research'] || 0],
        [t('Done'), byStatus.done || statuses.done || 0],
        [t('Blocked'), byStatus.blocked || statuses.blocked || 0],
        [t('AI evaluation'), evaluation ? `${evaluation.score}%` : t('not run')]
      ].map(([label, value]) => `
        <div class="metric">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(value)}</strong>
        </div>
      `).join('');

      const areas = Object.entries(summary.byArea || {})
        .map(([name, count]) => `${name}: ${count}`)
        .sort((left, right) => left.localeCompare(right))
        .join(' | ');
      if (areas) {
        elements.enhancementMetrics.innerHTML += `<div class="metric"><span>${escapeHtml(t('By area'))}</span><strong>${escapeHtml(areas)}</strong></div>`;
      }
      if (evaluation) {
        const result = t('{passed}/{total} passed', { passed: evaluation.passed, total: evaluation.total });
        elements.enhancementMetrics.innerHTML += `<div class="metric"><span>${escapeHtml(t('Evaluation scenarios'))}</span><strong>${escapeHtml(result)}</strong></div>`;
      }

      const notice = errorMessage ? `<div class="notice">${escapeHtml(errorMessage)}</div>` : '';
      const items = enhancements.length
        ? enhancements.map(renderEnhancement).join('')
        : `<div class="empty">${escapeHtml(t('Nothing needs attention.'))}</div>`;
      elements.enhancementsList.innerHTML = notice + items;
    };

    return { render, renderFilters };
  }

  return { createController, NL_MESSAGES, DYNAMIC_OPERATOR_MESSAGES };
});
