(function attachForecastView(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.SneupForecastView = api;
})(typeof window !== 'undefined' ? window : globalThis, function createForecastViewModule() {
  const NL_MESSAGES = Object.freeze({
    'The forecast view loaded without its runtime. Try again.': 'De prognoseweergave is zonder runtime geladen. Probeer het opnieuw.',
    'The forecast view could not be loaded. Check the connection and try again.': 'De prognoseweergave kon niet worden geladen. Controleer de verbinding en probeer het opnieuw.',
    'Forecast unavailable': 'Prognose niet beschikbaar',
    'unavailable': 'niet beschikbaar',
    'demo': 'demo',
    'scenario': 'scenario',
    'analysis only': 'alleen analyse',
    'P50 delivery': 'P50-levering',
    'P80 delivery': 'P80-levering',
    'Forecast confidence': 'Zekerheid van prognose',
    'Open cards': 'Open kaarten',
    'Weekly capacity': 'Wekelijkse capaciteit',
    'Estimated work': 'Geschat werk',
    'Tracked utilization': 'Gemeten benutting',
    'Mapped allocations': 'Gekoppelde toewijzingen',
    'Board-mapped schedule': 'Aan bord gekoppelde planning',
    'Mapped calendar': 'Gekoppelde agenda',
    'No data': 'Geen gegevens',
    'No mapping': 'Geen koppeling',
    'No items yet.': 'Nog geen items.',
    'and': 'en',
    'Needs capacity': 'Capaciteit vereist',
    '{count} person': '{count} persoon',
    '{count} people': '{count} personen',
    '{count} board': '{count} bord',
    '{count} boards': '{count} borden',
    '{count} source': '{count} bron',
    '{count} sources': '{count} bronnen',
    'Portfolio': 'Portfolio',
    'unknown': 'onbekend',
    'on_track': 'op schema',
    'watch': 'bewaken',
    'at_risk': 'risico',
    '{count} open card': '{count} open kaart',
    '{count} open cards': '{count} open kaarten',
    '{percent}% modeled load': '{percent}% gemodelleerde belasting',
    '{confidence} confidence: forecast uses explicit capacity and uncertainty assumptions.': '{confidence} zekerheid: de prognose gebruikt expliciete aannames over capaciteit en onzekerheid.',
    'Assumptions': 'Aannames',
    'Temporary scenario for {count} contributor. It does not change a capacity profile, provider, work item, or decision.': 'Tijdelijk scenario voor {count} medewerker. Het wijzigt geen capaciteitsprofiel, provider, werkitem of beslissing.',
    'Temporary scenario for {count} contributors. It does not change a capacity profile, provider, work item, or decision.': 'Tijdelijk scenario voor {count} medewerkers. Het wijzigt geen capaciteitsprofiel, provider, werkitem of beslissing.',
    'Capacity scenarios are paused by this workspace rollout.': 'Capaciteitsscenario\'s zijn gepauzeerd door de uitrol van deze werkruimte.',
    'Reset scenario': 'Scenario herstellen',
    'Explore capacity scenario': 'Capaciteitsscenario verkennen',
    'Board': 'Bord',
    '{cards} open cards and {hours} modeled work hours.': '{cards} open kaarten en {hours} gemodelleerde werkuren.',
    'Confidence': 'Zekerheid',
    'No material delivery risk detected.': 'Geen materieel leveringsrisico gedetecteerd.',
    'Mapped project schedule: {hours}h/week.': 'Gekoppelde projectplanning: {hours}u/week.',
    'No provider project schedule is mapped to this board.': 'Er is geen projectplanning van een provider aan dit bord gekoppeld.',
    'Map provider projects': 'Providerprojecten koppelen',
    'Team member': 'Teamlid',
    'configured': 'geconfigureerd',
    'default': 'standaard',
    '{hours}h/week': '{hours}u/week',
    '{hours}h/day': '{hours}u/dag',
    '{percent}% allocation': '{percent}% toewijzing',
    '{hours}h focus': '{hours}u focus',
    '{hours}h planned time off': '{hours}u gepland verlof',
    'Historical card effort: {hours}h.': 'Historische kaartinspanning: {hours}u.',
    '{providers} tracked {hours}h/week recently.': '{providers} registreerde recent {hours}u/week.',
    'No matched tracked-time evidence.': 'Geen overeenkomend tijdregistratiebewijs.',
    '{providers} schedules {hours}h/week.': '{providers} plant {hours}u/week.',
    'No mapped allocation evidence.': 'Geen gekoppeld toewijzingsbewijs.',
    'Mapped calendar blocks {hours}h/week.': 'Gekoppelde agenda blokkeert {hours}u/week.',
    'No mapped calendar evidence.': 'Geen gekoppeld agendabewijs.',
    'No skills recorded.': 'Geen vaardigheden vastgelegd.',
    'Edit capacity': 'Capaciteit bewerken',
    'Capacity scenario unavailable': 'Capaciteitsscenario niet beschikbaar',
    'Sneup needs at least one active team member in the live workspace.': 'Sneup heeft minimaal een actief teamlid in de live werkruimte nodig.',
    'This is a temporary what-if analysis. It does not save a capacity profile, change provider data, update work, or queue a decision.': 'Dit is een tijdelijke wat-als-analyse. Er wordt geen capaciteitsprofiel opgeslagen, providerdata gewijzigd, werk bijgewerkt of beslissing in de wachtrij geplaatst.',
    'Contributor': 'Medewerker',
    'Weekly hours': 'Uren per week',
    'Allocation percentage': 'Toewijzingspercentage',
    'Focus hours per week': 'Focusuren per week',
    'Temporary time off (one YYYY-MM-DD to YYYY-MM-DD range per line)': 'Tijdelijk verlof (een bereik JJJJ-MM-DD tot JJJJ-MM-DD per regel)',
    'Cancel': 'Annuleren',
    'Run scenario': 'Scenario uitvoeren',
    'Project mappings: {board}': 'Projectkoppelingen: {board}',
    'Only explicit Float, Resource Guru, or Motion project IDs scope schedule evidence to this board. Mapped schedules remain analysis-only and do not change provider data or delivery capacity.': 'Alleen expliciete project-ID\'s van Float, Resource Guru of Motion begrenzen planningsbewijs tot dit bord. Gekoppelde planningen blijven alleen voor analyse en wijzigen geen providerdata of leveringscapaciteit.',
    'Provider project IDs (one provider: ID per line)': 'Project-ID\'s van providers (een provider: ID per regel)',
    'Save project mappings': 'Projectkoppelingen opslaan',
    'Capacity: {member}': 'Capaciteit: {member}',
    'Capacity updates are analysis inputs only. They do not change any provider account or work item.': 'Capaciteitswijzigingen zijn alleen analyse-invoer. Ze wijzigen geen provideraccount of werkitem.',
    'Skills (comma-separated)': 'Vaardigheden (door komma\'s gescheiden)',
    'Capacity evidence IDs (one provider: ID per line)': 'ID\'s voor capaciteitsbewijs (een provider: ID per regel)',
    'Planned time off (one YYYY-MM-DD to YYYY-MM-DD range per line)': 'Gepland verlof (een bereik JJJJ-MM-DD tot JJJJ-MM-DD per regel)',
    'Save capacity': 'Capaciteit opslaan',
    'Scenario reset': 'Scenario hersteld',
    'Sneup restored the live analysis without changing any capacity profile.': 'Sneup heeft de live analyse hersteld zonder een capaciteitsprofiel te wijzigen.',
    'Scenario ready': 'Scenario gereed',
    'Sneup calculated this temporary delivery range without changing live capacity.': 'Sneup heeft dit tijdelijke leveringsbereik berekend zonder live capaciteit te wijzigen.',
    'Scenario failed': 'Scenario mislukt',
    'Project mappings saved': 'Projectkoppelingen opgeslagen',
    'Sneup refreshed board-scoped schedule evidence without changing provider data.': 'Sneup heeft bordgebonden planningsbewijs vernieuwd zonder providerdata te wijzigen.',
    'Project mapping update failed': 'Bijwerken van projectkoppeling mislukt',
    'Capacity saved': 'Capaciteit opgeslagen',
    'Sneup refreshed the analysis-only delivery forecast.': 'Sneup heeft de leveringsprognose voor alleen analyse vernieuwd.',
    'Capacity update failed': 'Bijwerken van capaciteit mislukt'
  });

  const DYNAMIC_OPERATOR_MESSAGES = Object.freeze(Object.keys(NL_MESSAGES));

  function createController(options = {}) {
    const document = options.document;
    const state = options.state || {};
    const elements = options.elements || {};
    const callbacks = options.callbacks || {};
    const t = options.t || (value => value);
    const plural = options.plural || ((singular, pluralMessage, count) => String(count === 1 ? singular : pluralMessage).replace('{count}', count));
    const escapeHtml = options.escapeHtml || (value => String(value ?? ''));
    const getLocale = options.getLocale || (() => 'en');
    const isFeatureEnabled = options.isFeatureEnabled || (() => false);
    const et = (message, params) => escapeHtml(t(message, params));
    const ep = (singular, pluralMessage, count, params) => escapeHtml(plural(singular, pluralMessage, count, params));

    const listOrEmpty = (items, renderer) => items.length
      ? items.map(renderer).join('')
      : `<div class="empty">${et('No items yet.')}</div>`;

    const formatForecastDate = (value) => {
      if (!value) return t('Needs capacity');
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return t('Needs capacity');
      try {
        return new Intl.DateTimeFormat(getLocale(), { month: 'short', day: 'numeric' }).format(date);
      } catch (error) {
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      }
    };

    const formatProviderNames = (providers = []) => {
      const labels = providers.map(provider => ({
        harvest: 'Harvest', everhour: 'Everhour', timeneye: 'Lucen Track', toggl_track: 'Toggl Track',
        clockify: 'Clockify', float: 'Float', resource_guru: 'Resource Guru', motion: 'Motion',
        google_workspace: 'Google Workspace', microsoft_365: 'Microsoft 365'
      }[provider] || provider)).filter(Boolean);
      if (labels.length <= 1) return labels[0] || 'connected time tools';
      return `${labels.slice(0, -1).join(', ')} ${t('and')} ${labels[labels.length - 1]}`;
    };

    const healthClass = health => health === 'at_risk' ? 'high' : health === 'watch' ? 'review' : 'healthy';

    const renderForecastSummary = (forecast = {}, scenario = null) => {
      const canManageCapacity = forecast.mode !== 'demo' && state.securityContext?.permissions?.includes('capacity:manage');
      const canRunScenarios = canManageCapacity && isFeatureEnabled('forecast_scenarios');
      const overrideCount = Number(scenario?.overrideCount) || 0;
      return `
        <div class="item forecast-summary">
          <div class="item-title">
            <strong>${escapeHtml(forecast.boardName || t('Portfolio'))}</strong>
            <span class="pill ${healthClass(forecast.health)}">${et(forecast.health || 'unknown')}</span>
          </div>
          <div class="meta"><span>P50 ${escapeHtml(formatForecastDate(forecast.p50?.date))}</span><span>P80 ${escapeHtml(formatForecastDate(forecast.p80?.date))}</span><span>${ep('{count} open card', '{count} open cards', Number(forecast.openCards) || 0)}</span><span>${et('{percent}% modeled load', { percent: forecast.utilizationPercent ?? 'n/a' })}</span></div>
          <div class="meta">${et('{confidence} confidence: forecast uses explicit capacity and uncertainty assumptions.', { confidence: forecast.confidenceLabel || 'low evidence' })}</div>
          ${(forecast.risks || []).length ? `<div class="forecast-risks">${forecast.risks.map(risk => `<span class="pill high">${escapeHtml(risk)}</span>`).join('')}</div>` : ''}
          <details class="payload"><summary>${et('Assumptions')}</summary><div class="forecast-assumptions">${(forecast.assumptions || []).map(item => `<p>${escapeHtml(item)}</p>`).join('')}</div></details>
          ${scenario?.active ? `<div class="notice">${ep('Temporary scenario for {count} contributor. It does not change a capacity profile, provider, work item, or decision.', 'Temporary scenario for {count} contributors. It does not change a capacity profile, provider, work item, or decision.', overrideCount)}</div>` : ''}
          ${canManageCapacity && !canRunScenarios ? `<div class="notice">${et('Capacity scenarios are paused by this workspace rollout.')}</div>` : ''}
          ${canRunScenarios ? `<div class="item-actions">${scenario?.active ? `<button class="button" data-forecast-scenario-reset type="button">${et('Reset scenario')}</button>` : ''}<button class="button primary" data-forecast-scenario type="button">${et('Explore capacity scenario')}</button></div>` : ''}
        </div>
      `;
    };

    const renderBoardForecast = (forecast = {}) => {
      const editable = Boolean(state.securityContext?.permissions?.includes('capacity:manage'));
      return `
        <article class="connector-card forecast-card">
          <div class="connector-top"><div><h3>${escapeHtml(forecast.boardName || t('Board'))}</h3><p>${et('{cards} open cards and {hours} modeled work hours.', { cards: forecast.openCards || 0, hours: forecast.workHours || 0 })}</p></div><span class="pill ${healthClass(forecast.health)}">${et(forecast.health || 'unknown')}</span></div>
          <div class="forecast-dates"><span><strong>P50</strong>${escapeHtml(formatForecastDate(forecast.p50?.date))}</span><span><strong>P80</strong>${escapeHtml(formatForecastDate(forecast.p80?.date))}</span><span><strong>${et('Confidence')}</strong>${forecast.confidence || 0}%</span></div>
          <div class="meta">${(forecast.risks || []).slice(0, 2).map(escapeHtml).join(' | ') || et('No material delivery risk detected.')}</div>
          <div class="meta">${forecast.mappedProjectScheduleEntriesNext28Days ? et('Mapped project schedule: {hours}h/week.', { hours: forecast.mappedProjectScheduleWeeklyHours || 0 }) : et('No provider project schedule is mapped to this board.')}</div>
          ${editable && forecast.boardId ? `<div class="connector-actions"><button class="button" type="button" data-board-project-mappings="${escapeHtml(forecast.boardId)}">${et('Map provider projects')}</button></div>` : ''}
        </article>
      `;
    };

    const renderCapacityMember = (member = {}) => {
      const editable = Boolean(state.securityContext?.permissions?.includes('capacity:manage'));
      const tracked = member.trackedTimeEntriesLast28Days
        ? et('{providers} tracked {hours}h/week recently.', { providers: formatProviderNames(member.trackedTimeProvidersLast28Days), hours: member.trackedTimeWeeklyHours || 0 })
        : et('No matched tracked-time evidence.');
      const allocation = member.scheduledAllocationEntriesNext28Days
        ? et('{providers} schedules {hours}h/week.', { providers: formatProviderNames(member.scheduledAllocationProvidersNext28Days), hours: member.scheduledAllocationWeeklyHours || 0 })
        : et('No mapped allocation evidence.');
      const calendar = member.calendarEventsNext28Days
        ? et('Mapped calendar blocks {hours}h/week.', { hours: member.calendarBusyWeeklyHours || 0 })
        : et('No mapped calendar evidence.');
      return `
        <div class="item">
          <div class="item-title"><strong>${escapeHtml(member.name || t('Team member'))}</strong><span class="pill ${member.configured ? 'healthy' : 'review'}">${et(member.configured ? 'configured' : 'default')}</span></div>
          <div class="meta"><span>${et('{hours}h/week', { hours: member.weeklyAvailableHours || 0 })}</span><span>${et('{hours}h/day', { hours: member.dailyAvailableHours || 0 })}</span><span>${et('{percent}% allocation', { percent: member.allocationPercent || 0 })}</span><span>${et('{hours}h focus', { hours: member.focusHoursPerWeek || 0 })}</span>${member.timeOffHours ? `<span>${et('{hours}h planned time off', { hours: member.timeOffHours })}</span>` : ''}</div>
          <div class="meta">${et('Historical card effort: {hours}h.', { hours: member.historicalCardHours || 0 })} ${tracked} ${allocation} ${calendar} ${(member.skills || []).map(escapeHtml).join(' | ') || et('No skills recorded.')}</div>
          ${editable ? `<div class="item-actions"><button class="button" type="button" data-capacity-member="${escapeHtml(member.memberId)}">${et('Edit capacity')}</button></div>` : ''}
        </div>
      `;
    };

    const bindActions = () => {
      document.querySelectorAll('[data-capacity-member]').forEach(button => button.addEventListener('click', () => callbacks.openCapacityEditor?.(button.dataset.capacityMember)));
      document.querySelectorAll('[data-board-project-mappings]').forEach(button => button.addEventListener('click', () => callbacks.openBoardProjectMappingsEditor?.(button.dataset.boardProjectMappings)));
      document.querySelectorAll('[data-forecast-scenario]').forEach(button => button.addEventListener('click', () => callbacks.openForecastScenario?.()));
      document.querySelectorAll('[data-forecast-scenario-reset]').forEach(button => button.addEventListener('click', () => callbacks.resetForecastScenario?.()));
    };

    const render = (errorMessage = '') => {
      const forecast = state.forecast;
      if (!forecast) {
        elements.forecastCount.textContent = '0';
        elements.forecastMode.textContent = t('unavailable');
        elements.forecastMode.className = 'pill critical';
        elements.forecastMetrics.innerHTML = '';
        elements.portfolioForecast.innerHTML = `<div class="empty">${escapeHtml(errorMessage || t('Forecast unavailable'))}</div>`;
        elements.forecastCapacity.innerHTML = '';
        elements.forecastBoards.innerHTML = '';
        return;
      }

      const portfolio = forecast.portfolio || {};
      const members = forecast.memberCapacity || [];
      const boards = forecast.boards || [];
      const utilization = forecast.dataQuality?.utilization || {};
      const allocations = forecast.dataQuality?.allocations || {};
      const calendar = forecast.dataQuality?.calendar || {};
      const scenario = forecast.scenario || null;
      elements.forecastCount.textContent = String(boards.filter(board => board.health !== 'on_track').length);
      elements.forecastMode.textContent = t(forecast.mode === 'demo' ? 'demo' : scenario?.active ? 'scenario' : 'analysis only');
      elements.forecastMode.className = `pill ${forecast.mode === 'demo' || scenario?.active ? 'review' : 'healthy'}`;
      elements.forecastCapacityCount.textContent = plural('{count} person', '{count} people', members.length);
      elements.forecastBoardCount.textContent = plural('{count} board', '{count} boards', boards.length);
      elements.forecastMetrics.innerHTML = [
        [t('P50 delivery'), formatForecastDate(portfolio.p50?.date)],
        [t('P80 delivery'), formatForecastDate(portfolio.p80?.date)],
        [t('Forecast confidence'), `${portfolio.confidence || 0}%`],
        [t('Open cards'), portfolio.openCards || 0],
        [t('Weekly capacity'), `${portfolio.weeklyAvailableHours || 0}h`],
        [t('Estimated work'), `${portfolio.workHours || 0}h`],
        [t('Tracked utilization'), utilization.entries ? `${utilization.weeklyHours || 0}h/week, ${plural('{count} source', '{count} sources', (utilization.activeProviders || []).length)}` : t('No data')],
        [t('Mapped allocations'), allocations.matchedEntries ? `${allocations.matchedWeeklyHours || 0}h/week` : t('No data')],
        [t('Board-mapped schedule'), allocations.mappedProjectEntries ? `${allocations.mappedProjectWeeklyHours || 0}h/week` : t('No mapping')],
        [t('Mapped calendar'), calendar.matchedEntries ? `${calendar.matchedWeeklyHours || 0}h/week` : t('No data')]
      ].map(([label, value]) => `<div class="metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join('');
      elements.portfolioForecast.innerHTML = renderForecastSummary(portfolio, scenario);
      elements.forecastCapacity.innerHTML = listOrEmpty(members, renderCapacityMember);
      elements.forecastBoards.innerHTML = listOrEmpty(boards, renderBoardForecast);
      bindActions();
    };

    const openForecastScenarioForm = () => {
      const members = (state.forecast?.memberCapacity || []).filter(member => member.memberId);
      if (!members.length) {
        callbacks.openNotice?.(t('Capacity scenario unavailable'), t('Sneup needs at least one active team member in the live workspace.'));
        return null;
      }
      const selected = members[0];
      elements.modalTitle.textContent = t('Explore capacity scenario');
      elements.modalBody.innerHTML = `
        <form id="forecastScenarioForm" data-draft-key="forecast-scenario" data-draft-fields="memberId,weeklyHours,allocationPercent,focusHoursPerWeek,timeOff" data-template-fields="weeklyHours,allocationPercent,focusHoursPerWeek">
          <div class="notice">${et('This is a temporary what-if analysis. It does not save a capacity profile, change provider data, update work, or queue a decision.')}</div>
          <div class="field"><label for="forecastScenarioMember">${et('Contributor')}</label><select id="forecastScenarioMember" name="memberId">${members.map(member => `<option value="${escapeHtml(member.memberId)}">${escapeHtml(member.name || t('Team member'))}</option>`).join('')}</select></div>
          <div class="field"><label for="forecastScenarioWeeklyHours">${et('Weekly hours')}</label><input id="forecastScenarioWeeklyHours" name="weeklyHours" type="number" min="1" max="80" value="${escapeHtml(selected.weeklyHours || 32)}" required></div>
          <div class="field"><label for="forecastScenarioAllocation">${et('Allocation percentage')}</label><input id="forecastScenarioAllocation" name="allocationPercent" type="number" min="0" max="100" value="${escapeHtml(selected.allocationPercent ?? 100)}" required></div>
          <div class="field"><label for="forecastScenarioFocus">${et('Focus hours per week')}</label><input id="forecastScenarioFocus" name="focusHoursPerWeek" type="number" min="0" max="80" value="${escapeHtml(selected.focusHoursPerWeek || 0)}" required></div>
          <div class="field"><label for="forecastScenarioTimeOff">${et('Temporary time off (one YYYY-MM-DD to YYYY-MM-DD range per line)')}</label><textarea id="forecastScenarioTimeOff" name="timeOff">${escapeHtml((selected.timeOff || []).map(item => `${String(item.startDate || '').slice(0, 10)} to ${String(item.endDate || '').slice(0, 10)}${item.label ? ` | ${item.label}` : ''}`).join('\n'))}</textarea></div>
          <div class="toolbar modal-actions"><button class="button" type="button" id="cancelForecastScenario">${et('Cancel')}</button><button class="button primary" type="submit">${et('Run scenario')}</button></div>
        </form>
      `;
      elements.modal.classList.add('open');
      const form = document.getElementById('forecastScenarioForm');
      callbacks.enhanceForm?.(form);
      document.getElementById('cancelForecastScenario').addEventListener('click', () => callbacks.closeModal?.());
      form.elements.memberId.addEventListener('change', () => {
        const member = members.find(item => String(item.memberId) === String(form.elements.memberId.value));
        if (!member) return;
        form.elements.weeklyHours.value = member.weeklyHours || 32;
        form.elements.allocationPercent.value = member.allocationPercent ?? 100;
        form.elements.focusHoursPerWeek.value = member.focusHoursPerWeek || 0;
        form.elements.timeOff.value = (member.timeOff || []).map(item => `${String(item.startDate || '').slice(0, 10)} to ${String(item.endDate || '').slice(0, 10)}${item.label ? ` | ${item.label}` : ''}`).join('\n');
      });
      return { form, members };
    };

    const openBoardProjectMappingsForm = (boardId) => {
      const board = (state.forecast?.boards || []).find(item => String(item.boardId) === String(boardId));
      if (!board) return null;
      const mappings = (board.externalProjectMappings || []).map(item => `${item.provider}: ${item.projectId}`).join('\n');
      elements.modalTitle.textContent = t('Project mappings: {board}', { board: board.boardName || 'board' });
      elements.modalBody.innerHTML = `
        <form id="boardProjectMappingsForm" data-draft-key="board-project-mappings:${escapeHtml(boardId)}" data-draft-fields="externalProjectMappings">
          <div class="notice">${et('Only explicit Float, Resource Guru, or Motion project IDs scope schedule evidence to this board. Mapped schedules remain analysis-only and do not change provider data or delivery capacity.')}</div>
          <div class="field"><label for="boardProjectMappings">${et('Provider project IDs (one provider: ID per line)')}</label><textarea id="boardProjectMappings" name="externalProjectMappings" placeholder="float: 123&#10;resource_guru: 456&#10;motion: project_123">${escapeHtml(mappings)}</textarea></div>
          <div class="toolbar modal-actions"><button class="button" type="button" id="cancelBoardProjectMappings">${et('Cancel')}</button><button class="button primary" type="submit">${et('Save project mappings')}</button></div>
        </form>
      `;
      elements.modal.classList.add('open');
      const form = document.getElementById('boardProjectMappingsForm');
      callbacks.enhanceForm?.(form);
      document.getElementById('cancelBoardProjectMappings').addEventListener('click', () => callbacks.closeModal?.());
      return { form, board };
    };

    const openCapacityForm = (memberId) => {
      const member = (state.forecast?.memberCapacity || []).find(item => String(item.memberId) === String(memberId));
      if (!member) return null;
      const externalIdentities = (member.externalIdentities || []).map(item => `${item.provider}: ${item.externalId}`).join('\n');
      elements.modalTitle.textContent = t('Capacity: {member}', { member: member.name || 'team member' });
      elements.modalBody.innerHTML = `
        <form id="capacityProfileForm" data-draft-key="capacity-profile:${escapeHtml(memberId)}" data-draft-fields="weeklyHours,allocationPercent,focusHoursPerWeek,skills,externalIdentities,timeOff" data-template-fields="weeklyHours,allocationPercent,focusHoursPerWeek">
          <div class="notice">${et('Capacity updates are analysis inputs only. They do not change any provider account or work item.')}</div>
          <div class="field"><label for="capacityWeeklyHours">${et('Weekly hours')}</label><input id="capacityWeeklyHours" name="weeklyHours" type="number" min="1" max="80" value="${escapeHtml(member.weeklyHours || 32)}" required></div>
          <div class="field"><label for="capacityAllocation">${et('Allocation percentage')}</label><input id="capacityAllocation" name="allocationPercent" type="number" min="0" max="100" value="${escapeHtml(member.allocationPercent ?? 100)}" required></div>
          <div class="field"><label for="capacityFocus">${et('Focus hours per week')}</label><input id="capacityFocus" name="focusHoursPerWeek" type="number" min="0" max="80" value="${escapeHtml(member.focusHoursPerWeek || 0)}" required></div>
          <div class="field"><label for="capacitySkills">${et('Skills (comma-separated)')}</label><input id="capacitySkills" name="skills" type="text" value="${escapeHtml((member.skills || []).join(', '))}"></div>
          <div class="field"><label for="capacityExternalIdentities">${et('Capacity evidence IDs (one provider: ID per line)')}</label><textarea id="capacityExternalIdentities" name="externalIdentities" placeholder="float: 123&#10;motion: user_123&#10;google_workspace: person@example.com">${escapeHtml(externalIdentities)}</textarea></div>
          <div class="field"><label for="capacityTimeOff">${et('Planned time off (one YYYY-MM-DD to YYYY-MM-DD range per line)')}</label><textarea id="capacityTimeOff" name="timeOff">${escapeHtml((member.timeOff || []).map(item => `${String(item.startDate || '').slice(0, 10)} to ${String(item.endDate || '').slice(0, 10)}${item.label ? ` | ${item.label}` : ''}`).join('\n'))}</textarea></div>
          <div class="toolbar modal-actions"><button class="button" type="button" id="cancelCapacityEdit">${et('Cancel')}</button><button class="button primary" type="submit">${et('Save capacity')}</button></div>
        </form>
      `;
      elements.modal.classList.add('open');
      const form = document.getElementById('capacityProfileForm');
      callbacks.enhanceForm?.(form);
      document.getElementById('cancelCapacityEdit').addEventListener('click', () => callbacks.closeModal?.());
      return { form, member };
    };

    return {
      render,
      bindActions,
      renderForecastSummary,
      renderBoardForecast,
      renderCapacityMember,
      openForecastScenarioForm,
      openBoardProjectMappingsForm,
      openCapacityForm
    };
  }

  return { createController, NL_MESSAGES, DYNAMIC_OPERATOR_MESSAGES };
});
