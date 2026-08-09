(function attachReportView(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.SneupReportView = api;
})(typeof window !== 'undefined' ? window : globalThis, function createReportViewModule() {
  const NL_MESSAGES = Object.freeze({
    'The report view loaded without its runtime. Try again.': 'De rapportweergave is zonder runtime geladen. Probeer het opnieuw.',
    'The report view could not be loaded. Check the connection and try again.': 'De rapportweergave kon niet worden geladen. Controleer de verbinding en probeer het opnieuw.',
    'unavailable': 'niet beschikbaar',
    'read-only': 'alleen-lezen',
    'No items yet.': 'Nog geen items.',
    'Uses current command, risk, decision, owner, date, and source-evidence context.': 'Gebruikt de huidige context voor opdrachten, risico\'s, beslissingen, eigenaren, datums en bronbewijs.'
  });

  const DYNAMIC_OPERATOR_MESSAGES = Object.freeze(Object.keys(NL_MESSAGES));

  function createController(options = {}) {
    const document = options.document;
    const state = options.state || {};
    const elements = options.elements || {};
    const callbacks = options.callbacks || {};
    const t = options.t || (value => value);
    const escapeHtml = options.escapeHtml || (value => String(value ?? ''));
    const et = (message, params) => escapeHtml(t(message, params));

    const render = (errorMessage = '') => {
      elements.reportCount.textContent = state.reports.length || 0;
      elements.reportMode.textContent = t(errorMessage ? 'unavailable' : 'read-only');
      elements.reportMode.className = `pill ${errorMessage ? 'critical' : 'healthy'}`;
      elements.reportList.innerHTML = errorMessage
        ? `<div class="empty">${escapeHtml(errorMessage)}</div>`
        : state.reports.length
          ? state.reports.map(report => `
            <div class="item report-item">
              <div class="item-title">
                <strong>${escapeHtml(report.label)}</strong>
                <span class="pill review">${et('read-only')}</span>
              </div>
              <div class="meta">${et('Uses current command, risk, decision, owner, date, and source-evidence context.')}</div>
              <div class="item-actions">
                <button class="button" data-report-download="${escapeHtml(report.id)}" data-report-format="markdown" type="button">Markdown</button>
                <button class="button primary" data-report-download="${escapeHtml(report.id)}" data-report-format="pdf" type="button">PDF</button>
              </div>
            </div>
          `).join('')
          : `<div class="empty">${et('No items yet.')}</div>`;

      document.querySelectorAll('[data-report-download]').forEach(button => {
        button.addEventListener('click', () => callbacks.downloadReport?.(button.dataset.reportDownload, button.dataset.reportFormat));
      });
    };

    return { render };
  }

  return { createController, NL_MESSAGES, DYNAMIC_OPERATOR_MESSAGES };
});
