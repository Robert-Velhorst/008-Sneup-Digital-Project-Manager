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
    'generating': 'wordt gegenereerd',
    'Report download failed': 'Rapport downloaden mislukt',
    'Report generation timed out. Try again.': 'Het genereren van het rapport duurde te lang. Probeer het opnieuw.',
    'Sneup returned an unexpected report format. Try again.': 'Sneup gaf een onverwacht rapportformaat terug. Probeer het opnieuw.',
    'Sneup returned an empty report. Try again.': 'Sneup gaf een leeg rapport terug. Probeer het opnieuw.',
    'The report exceeds the 5 MB download limit.': 'Het rapport overschrijdt de downloadlimiet van 5 MB.',
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
    let renderError = '';
    const renderDownloadState = () => {
      let generating = false;
      document.querySelectorAll('[data-report-download]').forEach(button => {
        const pending = Boolean(callbacks.isReportDownloading?.(button.dataset.reportDownload, button.dataset.reportFormat));
        button.disabled = pending;
        button.setAttribute('aria-busy', String(pending));
        generating ||= pending;
      });
      elements.reportMode.textContent = t(renderError ? 'unavailable' : generating ? 'generating' : 'read-only');
      elements.reportMode.setAttribute('aria-live', 'polite');
    };

    const render = (errorMessage = '') => {
      renderError = errorMessage;
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
      renderDownloadState();
    };

    return { render, renderDownloadState };
  }

  return { createController, NL_MESSAGES, DYNAMIC_OPERATOR_MESSAGES };
});
