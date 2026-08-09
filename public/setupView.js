(function attachSetupView(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.SneupSetupView = api;
})(typeof window === 'object' ? window : null, function createSetupViewModule() {
  const NL_MESSAGES = Object.freeze({
    'Current runtime check': 'Huidige runtimecontrole',
    'Configuration and safety status': 'Configuratie- en veiligheidsstatus',
    'Check again': 'Opnieuw controleren',
    'Support file': 'Ondersteuningsbestand',
    'Checking this runtime...': 'Deze runtime wordt gecontroleerd...',
    'Checking...': 'Controleren...',
    'Creating...': 'Aanmaken...',
    'Demo workspace': 'Demowerkruimte',
    'Connected workspace': 'Gekoppelde werkruimte',
    'Connect workspace': 'Werkruimte koppelen',
    'Set up Sneup': 'Sneup instellen',
    'Choose how this device starts. You can return here whenever your workspace is ready.': 'Kies hoe dit apparaat start. U kunt hier terugkomen zodra uw werkruimte gereed is.',
    'Sneup startup mode': 'Opstartmodus van Sneup',
    'This device stores only the startup mode. Sneup does not collect credentials during setup.': 'Dit apparaat bewaart alleen de opstartmodus. Sneup verzamelt tijdens het instellen geen inloggegevens.',
    'Save and restart': 'Opslaan en opnieuw starten',
    'Restarting...': 'Opnieuw starten...',
    'Saved': 'Opgeslagen',
    'Explore Sneup with local sample activity. No provider account is connected.': 'Verken Sneup met lokale voorbeeldactiviteit. Er is geen provideraccount gekoppeld.',
    'Sneup will restart and attempt your database-backed workspace. If MongoDB is unavailable, live mode stops and offers a read-only demo restart.': 'Sneup start opnieuw en probeert uw databasewerkruimte te openen. Als MongoDB niet beschikbaar is, stopt de livemodus en wordt een alleen-lezen demoherstart aangeboden.',
    'Sneup is running its local demo workspace. No provider account is connected.': 'Sneup gebruikt de lokale demowerkruimte. Er is geen provideraccount gekoppeld.',
    'Sneup is connected to its running workspace. Account connections and approval controls use this active runtime.': 'Sneup is gekoppeld aan de actieve werkruimte. Accountkoppelingen en goedkeuringscontroles gebruiken deze runtime.',
    'Runtime mode is selected when Sneup starts. This browser reflects that active mode and does not change it.': 'De runtimemodus wordt gekozen wanneer Sneup start. Deze browser toont de actieve modus en wijzigt deze niet.',
    'Live workspace prerequisites are ready.': 'De vereisten voor de livewerkruimte zijn gereed.',
    'The read-only demo workspace is ready.': 'De alleen-lezen demowerkruimte is gereed.',
    'Next: {action}': 'Volgende: {action}',
    'Runtime check unavailable.': 'Runtimecontrole niet beschikbaar.',
    'Startup preference was not saved: {message}': 'De opstartvoorkeur is niet opgeslagen: {message}',
    'Sneup could not save this startup mode.': 'Sneup kon deze opstartmodus niet opslaan.',
    'Startup preference saved. Close and reopen Sneup to apply it.': 'De opstartvoorkeur is opgeslagen. Sluit en open Sneup opnieuw om deze toe te passen.',
    '{fileName} was created and opened in File Explorer.': '{fileName} is aangemaakt en geopend in Verkenner.',
    'Support file failed: {message}': 'Ondersteuningsbestand mislukt: {message}',
    'Sneup could not create the file.': 'Sneup kon het bestand niet aanmaken.',
    '{count} check needs attention.': '{count} controle vereist aandacht.',
    '{count} checks need attention.': '{count} controles vereisen aandacht.'
  });

  function createController({
    document,
    state,
    elements,
    t,
    plural,
    escapeHtml,
    desktop = {},
    callbacks = {},
    AbortController: AbortControllerClass = globalThis.AbortController
  } = {}) {
    if (!document || !state || !elements || typeof t !== 'function' || typeof escapeHtml !== 'function') {
      throw new Error('Setup view requires document, state, elements, translation, and escaping helpers');
    }

    const et = (message, params) => escapeHtml(t(message, params));
    let diagnosticsController = null;
    let diagnosticsRun = 0;
    let saveInProgress = false;

    const cancelDiagnostics = () => {
      diagnosticsRun += 1;
      diagnosticsController?.abort();
      diagnosticsController = null;
    };

    const diagnosticsMarkup = () => `
      <section class="setup-diagnostics" aria-labelledby="setupDiagnosticsTitle">
        <div class="setup-diagnostics-head">
          <div>
            <strong id="setupDiagnosticsTitle">${et('Current runtime check')}</strong>
            <span>${et('Configuration and safety status')}</span>
          </div>
          <div class="toolbar">
            <button class="button" type="button" id="refreshSetupDiagnostics">${et('Check again')}</button>
            ${desktop.canCreateSupportBundle ? `<button class="button" type="button" id="createSetupSupportBundle">${et('Support file')}</button>` : ''}
          </div>
        </div>
        <div id="setupDiagnosticsResult" class="setup-diagnostics-result" aria-live="polite">
          <p class="setup-check-loading">${et('Checking this runtime...')}</p>
        </div>
        <p class="setup-support-result" id="setupSupportResult" aria-live="polite"></p>
      </section>
    `;

    function renderDiagnostics(report = {}) {
      const target = document.getElementById('setupDiagnosticsResult');
      if (!target) return;
      state.runtimeDiagnostics = report;
      state.runtimeMode = report.mode || state.runtimeMode;
      const errorCount = Number(report.counts?.error) || 0;
      const warningCount = Number(report.counts?.warning) || 0;
      const summary = report.liveCriticalPathReady
        ? t('Live workspace prerequisites are ready.')
        : report.mode === 'demo' && report.ready
          ? t('The read-only demo workspace is ready.')
          : errorCount
            ? plural('{count} check needs attention.', '{count} checks need attention.', errorCount)
            : plural('{count} check needs attention.', '{count} checks need attention.', warningCount);
      const labels = { ok: t('Ready'), warning: t('Review'), error: t('Required') };
      target.innerHTML = `
        <div class="setup-diagnostics-summary status-${escapeHtml(report.status)}">
          <strong>${escapeHtml(summary)}</strong>
          ${report.nextAction ? `<span>${et('Next: {action}', { action: report.nextAction.action })}</span>` : ''}
        </div>
        <ul class="setup-check-list">
          ${(report.checks || []).map((check) => `
            <li class="setup-check status-${escapeHtml(check.status)}">
              <span class="setup-check-status">${escapeHtml(labels[check.status] || t(check.status))}</span>
              <div>
                <strong>${escapeHtml(check.title)}</strong>
                <span>${escapeHtml(check.summary)}</span>
                ${check.action ? `<small>${escapeHtml(check.action)}</small>` : ''}
              </div>
            </li>
          `).join('')}
        </ul>
      `;
    }

    async function loadDiagnostics() {
      diagnosticsController?.abort();
      diagnosticsController = AbortControllerClass ? new AbortControllerClass() : null;
      const run = ++diagnosticsRun;
      const refresh = document.getElementById('refreshSetupDiagnostics');
      if (refresh) {
        refresh.disabled = true;
        refresh.textContent = t('Checking...');
      }
      try {
        const data = await callbacks.loadDiagnostics?.({ signal: diagnosticsController?.signal });
        if (run !== diagnosticsRun) return;
        renderDiagnostics(data?.diagnostics || data || {});
      } catch (error) {
        if (run !== diagnosticsRun || error?.name === 'AbortError') return;
        const target = document.getElementById('setupDiagnosticsResult');
        if (target) target.innerHTML = `<div class="notice">${et('Runtime check unavailable.')} ${escapeHtml(error.message)}</div>`;
      } finally {
        if (run === diagnosticsRun) {
          diagnosticsController = null;
          const currentRefresh = document.getElementById('refreshSetupDiagnostics');
          if (currentRefresh) {
            currentRefresh.disabled = false;
            currentRefresh.textContent = t('Check again');
          }
        }
      }
    }

    function bindDiagnostics() {
      document.getElementById('refreshSetupDiagnostics')?.addEventListener('click', loadDiagnostics);
      const supportButton = document.getElementById('createSetupSupportBundle');
      if (!supportButton) return;
      let supportInProgress = false;
      supportButton.addEventListener('click', async () => {
        if (supportInProgress) return;
        supportInProgress = true;
        const result = document.getElementById('setupSupportResult');
        supportButton.disabled = true;
        supportButton.textContent = t('Creating...');
        if (result) result.textContent = '';
        try {
          const bundle = await callbacks.createSupportBundle?.();
          if (result) result.textContent = t('{fileName} was created and opened in File Explorer.', { fileName: bundle.fileName });
        } catch (error) {
          if (result) result.textContent = t('Support file failed: {message}', { message: error.message || t('Sneup could not create the file.') });
        } finally {
          supportInProgress = false;
          if (supportButton.isConnected) {
            supportButton.disabled = false;
            supportButton.textContent = t('Support file');
          }
        }
      });
    }

    function prepareOpen() {
      cancelDiagnostics();
      saveInProgress = false;
      callbacks.registerModalCleanup?.(cancelDiagnostics);
      elements.modal.classList.add('open');
    }

    function openBrowserRuntime() {
      const isDemoRuntime = state.runtimeMode === 'demo';
      elements.modalTitle.textContent = t(isDemoRuntime ? 'Demo workspace' : 'Connected workspace');
      elements.modalBody.innerHTML = `
        <div class="setup-flow">
          <p class="setup-intro">${isDemoRuntime
    ? et('Sneup is running its local demo workspace. No provider account is connected.')
    : et('Sneup is connected to its running workspace. Account connections and approval controls use this active runtime.')}</p>
          <div class="notice">${et('Runtime mode is selected when Sneup starts. This browser reflects that active mode and does not change it.')}</div>
          ${diagnosticsMarkup()}
          <div class="toolbar modal-actions">
            <button class="button primary" type="button" id="openRuntimeConnectors">${et('Connect tools')}</button>
          </div>
        </div>
      `;
      prepareOpen();
      bindDiagnostics();
      loadDiagnostics();
      document.getElementById('openRuntimeConnectors')?.addEventListener('click', callbacks.openConnectors);
    }

    function openDesktopRuntime() {
      let selectedMode = ['demo', 'live'].includes(state.setupMode) ? state.setupMode : 'demo';
      const modeDetails = {
        demo: {
          title: 'Demo workspace',
          copy: 'Explore Sneup with local sample activity. No provider account is connected.'
        },
        live: {
          title: 'Connect workspace',
          copy: 'Sneup will restart and attempt your database-backed workspace. If MongoDB is unavailable, live mode stops and offers a read-only demo restart.'
        }
      };
      const renderSelection = () => {
        const detail = modeDetails[selectedMode];
        document.querySelectorAll('[data-setup-mode]').forEach((button) => {
          const isSelected = button.dataset.setupMode === selectedMode;
          button.classList.toggle('active', isSelected);
          button.setAttribute('aria-pressed', String(isSelected));
        });
        const title = document.getElementById('setupModeTitle');
        const copy = document.getElementById('setupModeCopy');
        if (title) title.textContent = t(detail.title);
        if (copy) copy.textContent = t(detail.copy);
      };

      elements.modalTitle.textContent = t('Set up Sneup');
      elements.modalBody.innerHTML = `
        <div class="setup-flow">
          <p class="setup-intro">${et('Choose how this device starts. You can return here whenever your workspace is ready.')}</p>
          <div class="segmented setup-mode" role="group" aria-label="${et('Sneup startup mode')}">
            <button data-setup-mode="demo" type="button">${et('Demo workspace')}</button>
            <button data-setup-mode="live" type="button">${et('Connect workspace')}</button>
          </div>
          <div class="setup-selection" aria-live="polite">
            <strong id="setupModeTitle"></strong>
            <p id="setupModeCopy"></p>
          </div>
          <div class="notice">${et('This device stores only the startup mode. Sneup does not collect credentials during setup.')}</div>
          ${diagnosticsMarkup()}
          <p class="setup-support-result" id="setupSaveResult" aria-live="polite"></p>
          <div class="toolbar modal-actions">
            <button class="button primary" type="button" id="completeSetup">${et('Save and restart')}</button>
          </div>
        </div>
      `;
      prepareOpen();
      renderSelection();
      bindDiagnostics();
      loadDiagnostics();

      document.querySelectorAll('[data-setup-mode]').forEach((button) => {
        button.addEventListener('click', () => {
          if (saveInProgress) return;
          selectedMode = button.dataset.setupMode;
          renderSelection();
        });
      });
      document.getElementById('completeSetup')?.addEventListener('click', async (event) => {
        if (saveInProgress) return;
        saveInProgress = true;
        const button = event.currentTarget;
        const result = document.getElementById('setupSaveResult');
        button.disabled = true;
        button.textContent = t('Restarting...');
        if (result) result.textContent = '';
        try {
          const saved = await callbacks.saveStartupMode?.(selectedMode);
          if (saved?.restarting) return;
          if (result) result.textContent = t('Startup preference saved. Close and reopen Sneup to apply it.');
          button.textContent = t('Saved');
          return;
        } catch (error) {
          if (result) result.textContent = t('Startup preference was not saved: {message}', {
            message: error.message || t('Sneup could not save this startup mode.')
          });
        }
        saveInProgress = false;
        if (button.isConnected) {
          button.disabled = false;
          button.textContent = t('Save and restart');
        }
      });
    }

    function open() {
      if (desktop.canSaveStartupMode) openDesktopRuntime();
      else openBrowserRuntime();
      return true;
    }

    return { open, loadDiagnostics, renderDiagnostics, cancelDiagnostics };
  }

  return { createController, NL_MESSAGES };
});
