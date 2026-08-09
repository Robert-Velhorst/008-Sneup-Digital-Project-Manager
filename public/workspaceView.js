(function attachWorkspaceView(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.SneupWorkspaceView = api;
})(typeof window === 'object' ? window : null, function createWorkspaceViewModule() {
  const DYNAMIC_OPERATOR_MESSAGES = Object.freeze([
    'switchable', 'locked', 'Current workspace', 'Current', 'active', 'archived', 'deleting',
    'Allowed', 'Locked', 'selected', 'available', 'owner', 'manager', 'member', 'viewer',
    'pending', 'accepted', 'revoked', 'expired', 'failed', 'not sent', 'email sent',
    'email failed', 'manual link', 'active', 'paused', 'off', 'updated', 'outside rollout',
    'low', 'medium', 'high', 'critical', 'robert', 'team', 'va', 'workspace', 'operator',
    'enabled', 'disabled'
  ]);

  const NL_MESSAGES = Object.freeze({
    'Repair derived state': 'Afgeleide status herstellen',
    'This repairs {count} current list or member cache finding(s). It does not contact Trello, retry notifications, alter approvals, or resolve ambiguous executions.': 'Dit herstelt {count} actuele bevinding(en) in de lijst- of ledencache. Trello wordt niet benaderd, meldingen worden niet opnieuw geprobeerd, goedkeuringen blijven ongewijzigd en onduidelijke uitvoeringen worden niet opgelost.',
    'Repair {count}': '{count} herstellen',
    'Repairing...': 'Herstellen...',
    'Repair complete': 'Herstel voltooid',
    'Repair failed': 'Herstel mislukt',
    '{repaired} repaired, {skipped} skipped because their state changed.': '{repaired} hersteld, {skipped} overgeslagen omdat de status is gewijzigd.',
    'Data retention policy': 'Beleid voor gegevensbewaring',
    'Run scheduled retention': 'Geplande bewaring uitvoeren',
    'Operational history days': 'Dagen bewerkingsgeschiedenis',
    'Performance history days': 'Dagen prestatiegeschiedenis',
    'Notification receipt days': 'Dagen meldingsontvangsten',
    'Revoked credential days': 'Dagen ingetrokken inloggegevens',
    'Save policy': 'Beleid opslaan',
    'Retention policy saved': 'Bewaarbeleid opgeslagen',
    'The workspace retention policy is active with the reviewed limits.': 'Het bewaarbeleid van de werkruimte is actief met de beoordeelde grenzen.',
    'Policy update failed': 'Beleid bijwerken mislukt',
    'Prune expired history': 'Verlopen geschiedenis verwijderen',
    'This permanently removes up to {count} due operational record(s). Provider actions, approvals, audit events, active credentials, pending notifications, and current project data are excluded.': 'Dit verwijdert permanent maximaal {count} vervallen bewerkingsrecord(s). Provideracties, goedkeuringen, auditgebeurtenissen, actieve inloggegevens, openstaande meldingen en actuele projectgegevens zijn uitgesloten.',
    'Workspace slug': 'Werkruimteslug',
    'Prune due records': 'Vervallen records verwijderen',
    'Retention complete': 'Bewaring voltooid',
    'Retention failed': 'Bewaring mislukt',
    '{count} old record(s) removed with audit evidence.': '{count} oude record(s) verwijderd met auditbewijs.',
    '{label} history': 'Geschiedenis van {label}',
    'Loading rollout history...': 'Uitrolgeschiedenis laden...',
    'Revision {revision}': 'Revisie {revision}',
    '{count}% rollout': '{count}% uitrol',
    'Rollout controls can pause optional workloads or expose them gradually. They cannot grant permissions, approve recommendations, execute Trello writes, disable audits, or weaken workspace isolation.': 'Uitrolbediening kan optionele werkbelastingen pauzeren of geleidelijk beschikbaar maken. Hiermee kunnen geen rechten worden verleend, aanbevelingen worden goedgekeurd, Trello-schrijfacties worden uitgevoerd, audits worden uitgeschakeld of werkruimte-isolatie worden verzwakt.',
    'Enable this capability': 'Deze mogelijkheid inschakelen',
    'Rollout percentage': 'Uitrolpercentage',
    'Reason': 'Reden',
    'Why this rollout is changing': 'Waarom deze uitrol verandert',
    'Save rollout': 'Uitrol opslaan',
    'Rollout update blocked': 'Uitrolwijziging geblokkeerd',
    'This policy only controls when Sneup creates internal follow-up or escalation candidates. It can retain or lengthen the 24-hour follow-up and 48-hour escalation baselines up to 7 days. Escalation cannot precede follow-up, and this policy never prepares or performs a provider write.': 'Dit beleid bepaalt alleen wanneer Sneup interne opvolgings- of escalatiekandidaten maakt. De basis van 24 uur voor opvolging en 48 uur voor escalatie kan behouden of verlengd worden tot 7 dagen. Escalatie kan niet vóór opvolging plaatsvinden en dit beleid bereidt nooit een providerschrijfactie voor of voert die uit.',
    'Follow-up candidate': 'Opvolgingskandidaat',
    'Escalation candidate': 'Escalatiekandidaat',
    'Create after no response (hours)': 'Maken na uitblijven van reactie (uren)',
    'Why this workspace needs longer follow-up timing': 'Waarom deze werkruimte langere opvolgingstijden nodig heeft',
    'Save timing defaults': 'Standaardtijden opslaan',
    'Timing defaults blocked': 'Standaardtijden geblokkeerd',
    'Stuck card': 'Vastgelopen kaart',
    'No activity': 'Geen activiteit',
    'Overdue card': 'Achterstallige kaart',
    'Member overloaded': 'Lid overbelast',
    'Blocking other work': 'Blokkeert ander werk',
    'No response to follow-up': 'Geen reactie op opvolging',
    'Performance milestone': 'Prestatiemijlpaal',
    'Suppress equivalent scheduled recommendations for (hours)': 'Gelijkwaardige geplande aanbevelingen onderdrukken gedurende (uren)',
    'This policy only suppresses duplicate scheduled intervention candidates. It can lengthen the 24-hour baseline up to 7 days, never shortens it, and never prepares or performs a provider write. Manual requests are not suppressed.': 'Dit beleid onderdrukt alleen dubbele geplande interventiekandidaten. Het kan de basis van 24 uur verlengen tot 7 dagen, verkort die nooit en bereidt nooit een providerschrijfactie voor of voert die uit. Handmatige verzoeken worden niet onderdrukt.',
    'Why this workspace needs longer signal cooldowns': 'Waarom deze werkruimte langere signaalwachttijden nodig heeft',
    'Save cooldown defaults': 'Standaardwachttijden opslaan',
    'Cooldown defaults blocked': 'Standaardwachttijden geblokkeerd',
    'Low-risk queue': 'Wachtrij met laag risico',
    'Medium-risk queue': 'Wachtrij met gemiddeld risico',
    'High-risk queue': 'Wachtrij met hoog risico',
    'Critical queue': 'Kritieke wachtrij',
    'Robert only': 'Alleen Robert',
    'Decision owner': 'Beslissingseigenaar',
    'Escalate to Robert after (hours)': 'Naar Robert escaleren na (uren)',
    'This policy only routes internal decision queue items. When a VA or team item reaches its review deadline, Sneup records the escalation and moves it to Robert. It never prepares or performs a provider write.': 'Dit beleid routeert alleen interne items in de besliswachtrij. Wanneer een VA- of teamitem de beoordelingsdeadline bereikt, legt Sneup de escalatie vast en verplaatst het item naar Robert. Het bereidt nooit een providerschrijfactie voor en voert die nooit uit.',
    'Why this workspace needs these queue defaults': 'Waarom deze werkruimte deze wachtrijstandaarden nodig heeft',
    'Save queue defaults': 'Wachtrijstandaarden opslaan',
    'Queue defaults blocked': 'Wachtrijstandaarden geblokkeerd',
    'This default only reschedules internal decision queue items. It never prepares or performs a provider write.': 'Deze standaard plant alleen interne besliswachtrij-items opnieuw. Er wordt nooit een providerschrijfactie voorbereid of uitgevoerd.',
    'Default snooze duration (hours)': 'Standaardduur voor uitstellen (uren)',
    'Choose between 1 hour and 7 days. People can still choose an explicit future deadline where the API permits it.': 'Kies tussen 1 uur en 7 dagen. Mensen kunnen nog steeds een expliciete toekomstige deadline kiezen waar de API dit toestaat.',
    'Why this workspace needs this default': 'Waarom deze werkruimte deze standaard nodig heeft',
    'Save workflow default': 'Workflowstandaard opslaan',
    'Workflow default blocked': 'Workflowstandaard geblokkeerd',
    'Action safety: {label}': 'Actieveiligheid: {label}',
    'Every Trello write remains approval-gated. This workspace rule can pause this action type or make its risk and decision owner stricter.': 'Elke Trello-schrijfactie blijft goedkeuringsplichtig. Deze werkruimteregel kan dit actietype pauzeren of het risico en de beslissingseigenaar strenger maken.',
    'Allow approved {label} actions to execute': 'Goedgekeurde acties voor {label} mogen uitvoeren',
    'Pause review time': 'Pauzebeoordelingstijd',
    'An expired pause stays paused until a manager reviews it; Sneup never re-enables it automatically.': 'Een verlopen pauze blijft gepauzeerd totdat een manager deze beoordeelt; Sneup schakelt deze nooit automatisch opnieuw in.',
    'Risk level': 'Risiconiveau',
    'Why this action needs this safety posture': 'Waarom deze actie deze veiligheidsinstelling nodig heeft',
    'I confirm that this may relax an existing workspace safety rule.': 'Ik bevestig dat dit een bestaande veiligheidsregel van de werkruimte kan versoepelen.',
    'Save safety rule': 'Veiligheidsregel opslaan',
    'Safety rule blocked': 'Veiligheidsregel geblokkeerd',
    'Workspace export unavailable': 'Werkruimte-export niet beschikbaar',
    'Sign in as the workspace owner before exporting workspace data.': 'Meld u aan als eigenaar van de werkruimte voordat u werkruimtegegevens exporteert.',
    'Sneup workspace export': 'Sneup-werkruimte-export',
    'Workspace export failed with status {status}': 'Werkruimte-export mislukt met status {status}',
    'Workspace export complete': 'Werkruimte-export voltooid',
    'The export contains workspace records and excludes credentials, token hashes, and encrypted notification destinations.': 'De export bevat werkruimterecords en sluit inloggegevens, tokenhashes en versleutelde meldingsbestemmingen uit.',
    'Workspace export failed': 'Werkruimte-export mislukt',
    'Workspace deletion unavailable': 'Werkruimte verwijderen niet beschikbaar',
    'Only an archived workspace can be permanently deleted by its owner.': 'Alleen een gearchiveerde werkruimte kan permanent door de eigenaar worden verwijderd.',
    'Delete archived workspace?': 'Gearchiveerde werkruimte verwijderen?',
    'This permanently removes Sneup data, account credentials, access tokens, and audit history for this workspace. Connected provider accounts are not changed.': 'Dit verwijdert permanent Sneup-gegevens, accountinloggegevens, toegangstokens en auditgeschiedenis voor deze werkruimte. Gekoppelde provideraccounts worden niet gewijzigd.',
    'I understand this deletion cannot be undone.': 'Ik begrijp dat deze verwijdering niet ongedaan kan worden gemaakt.',
    'Delete workspace': 'Werkruimte verwijderen',
    'Deleting...': 'Verwijderen...',
    'Workspace deleted': 'Werkruimte verwijderd',
    'Deletion receipt {id}. Local Sneup data for the workspace has been removed.': 'Verwijderingsbewijs {id}. Lokale Sneup-gegevens voor de werkruimte zijn verwijderd.',
    'Workspace deletion failed': 'Werkruimte verwijderen mislukt',
    'Invitation unavailable': 'Uitnodiging niet beschikbaar',
    'Choose a workspace before inviting a user.': 'Kies een werkruimte voordat u een gebruiker uitnodigt.',
    'Role': 'Rol',
    'Viewer': 'Lezer',
    'Operator': 'Beheerder',
    'Manager': 'Manager',
    'Admin': 'Admin',
    'Expires in days': 'Vervalt over dagen',
    'Delivery': 'Aflevering',
    'Secure link': 'Beveiligde link',
    'Send email': 'E-mail verzenden',
    'Create invitation': 'Uitnodiging maken',
    'Invitation failed': 'Uitnodiging mislukt',
    'Email sent.': 'E-mail verzonden.',
    'Email was not sent: {message}.': 'E-mail is niet verzonden: {message}.',
    'provider delivery failed': 'provideraflevering mislukt',
    'Secure link created.': 'Beveiligde link gemaakt.',
    'Invitation ready': 'Uitnodiging gereed',
    'Secure invitation link': 'Beveiligde uitnodigingslink',
    'Copy link': 'Link kopiëren',
    'Copied': 'Gekopieerd',
    'Revoke invitation?': 'Uitnodiging intrekken?',
    'This will invalidate the invitation for {email} immediately.': 'Dit maakt de uitnodiging voor {email} onmiddellijk ongeldig.',
    'Revoking...': 'Intrekken...',
    'Invitation revocation failed': 'Uitnodiging intrekken mislukt',
    'Retry invitation email?': 'Uitnodigingsmail opnieuw verzenden?',
    'Sneup will invalidate the prior secure link, create a fresh one-time link, and send it to {email}. The replacement is recorded in the workspace audit ledger.': 'Sneup maakt de eerdere beveiligde link ongeldig, maakt een nieuwe eenmalige link en verstuurt die naar {email}. De vervanging wordt vastgelegd in het auditlogboek van de werkruimte.',
    'Retrying...': 'Opnieuw proberen...',
    'Invitation retry failed': 'Uitnodiging opnieuw verzenden mislukt',
    'Session access unavailable': 'Sessietoegang niet beschikbaar',
    'Choose a workspace user before reviewing sessions.': 'Kies een werkruimtegebruiker voordat u sessies beoordeelt.',
    'Session access': 'Sessietoegang',
    'Loading active and historical sessions...': 'Actieve en historische sessies laden...',
    '{name} sessions': 'Sessies van {name}',
    'Review issued access for this user. Revoking a session ends its API access immediately and records a high-risk audit event.': 'Beoordeel de verleende toegang voor deze gebruiker. Een sessie intrekken beëindigt de API-toegang onmiddellijk en legt een auditgebeurtenis met hoog risico vast.',
    '{count} active session': '{count} actieve sessie',
    '{count} active sessions': '{count} actieve sessies',
    'user': 'gebruiker',
    'User session': 'Gebruikerssessie',
    'Used {date}': 'Gebruikt {date}',
    'Token protected': 'Token beschermd',
    'Revoke session': 'Sessie intrekken',
    'Revoke session?': 'Sessie intrekken?',
    'This immediately ends API access for': 'Dit beëindigt onmiddellijk de API-toegang voor',
    'this session': 'deze sessie',
    'belonging to {name}. This cannot be undone; issue a new session if access is needed again.': 'van {name}. Dit kan niet ongedaan worden gemaakt; geef een nieuwe sessie uit als opnieuw toegang nodig is.',
    'Session revocation failed': 'Sessie intrekken mislukt',
  });

  function createController(context = {}) {
    const {
      document,
      state,
      elements,
      callbacks,
      t,
      plural,
      escapeHtml,
      formatDate,
      severityClass
    } = context;
    if (!document || !state || !elements || !callbacks || !t || !plural) {
      throw new TypeError('Workspace view requires document, state, elements, callbacks, and localization');
    }

    const et = (message, params) => escapeHtml(t(message, params));
    const ep = (singular, pluralMessage, count, params) => escapeHtml(plural(singular, pluralMessage, count, params));
    const listOrEmpty = (items, renderer) => items && items.length > 0
      ? items.map(renderer).join('')
      : `<div class="empty">${et('Nothing needs attention.')}</div>`;

    function renderPolicyHistoryFilters(policyRules = []) {
      if (!elements.policyHistoryActionFilter || !elements.policyHistoryActorFilter || !elements.policyHistoryRangeFilter) return;
      const actions = policyRules
        .map(policy => ({ actionType: String(policy.actionType || ''), label: policy.label || policy.actionType }))
        .filter(policy => policy.actionType)
        .sort((left, right) => left.label.localeCompare(right.label));
      const selectedAction = actions.some(policy => policy.actionType === state.policyHistoryFilters.actionType)
        ? state.policyHistoryFilters.actionType
        : '';
      state.policyHistoryFilters.actionType = selectedAction;
      elements.policyHistoryActionFilter.innerHTML = [
        `<option value="">${et('All policies')}</option>`,
        ...actions.map(policy => `<option value="${escapeHtml(policy.actionType)}">${escapeHtml(policy.label)}</option>`)
      ].join('');
      elements.policyHistoryActionFilter.value = selectedAction;
      elements.policyHistoryActorFilter.value = String(state.policyHistoryFilters.actor || '').slice(0, 160);
      elements.policyHistoryRangeFilter.value = ['all', '7', '30', '90'].includes(String(state.policyHistoryFilters.rangeDays))
        ? String(state.policyHistoryFilters.rangeDays)
        : 'all';
    }

    function renderWorkspace(workspace) {
      const selected = workspace.id === state.activeWorkspaceId;
      return `
        <div class="item">
          <div class="item-title">
            <strong>${escapeHtml(workspace.name)}</strong>
            <span class="pill ${workspace.status === 'active' ? 'healthy' : workspace.status === 'deleting' ? 'critical' : 'review'}">${et(workspace.status)}</span>
          </div>
          <div class="meta">
            <span>${escapeHtml(workspace.slug)}</span>
            <span>${escapeHtml(workspace.plan)}</span>
            <span>${et(selected ? 'selected' : 'available')}</span>
          </div>
        </div>
      `;
    }

    function renderWorkspaceUser(user) {
      return `
        <div class="item">
          <div class="item-title">
            <strong>${escapeHtml(user.displayName)}</strong>
            <span class="pill ${user.status === 'active' ? 'healthy' : 'review'}">${et(user.role)}</span>
          </div>
          <div class="meta">
            <span>${et(user.status)}</span>
            <span>${escapeHtml(user.provider)}</span>
            <span>${escapeHtml(user.email || t('No email'))}</span>
          </div>
          <div class="item-actions">
            <button class="button" data-workspace-user-sessions="${escapeHtml(user.id)}" type="button">${et('Review sessions')}</button>
          </div>
        </div>
      `;
    }

    function renderWorkspaceInvitation(invitation) {
      const canRevoke = invitation.status === 'pending';
      const canRetryDelivery = canRevoke
        && invitation.delivery?.mode === 'email'
        && ['failed', 'not_sent'].includes(invitation.delivery?.status);
      const delivery = invitation.delivery?.status === 'sent' ? 'email sent'
        : invitation.delivery?.status === 'failed' ? 'email failed' : 'manual link';
      const retentionNotice = invitation.redactedAt ? `<span>${et('personal data removed')}</span>` : '';
      return `
        <div class="item">
          <div class="item-title">
            <strong>${escapeHtml(invitation.displayName || t('Invitation record'))}</strong>
            <span class="pill ${invitation.status === 'accepted' ? 'healthy' : invitation.status === 'pending' ? 'review' : 'critical'}">${et(invitation.status)}</span>
          </div>
          <div class="meta">
            <span>${escapeHtml(invitation.email || t('Personal data removed'))}</span>
            <span>${et(invitation.role)}</span>
            <span>${et(delivery)}</span>
            <span>${et('Expires {date}', { date: formatDate(invitation.expiresAt) })}</span>
            ${retentionNotice}
          </div>
          ${canRevoke ? `
            <div class="item-actions">
              ${canRetryDelivery ? `<button class="button" data-retry-workspace-invite-delivery="${escapeHtml(invitation.id)}" type="button">${et('Retry email')}</button>` : ''}
              <button class="button danger" data-revoke-workspace-invite="${escapeHtml(invitation.id)}" type="button">${et('Revoke invitation')}</button>
            </div>
          ` : ''}
        </div>
      `;
    }

    function renderPolicyRule(policy) {
      const canManage = state.securityContext?.permissions?.includes('policy-rules:manage');
      const isWorkflowPolicy = policy.policyKind === 'workflow';
      const isRoutingPolicy = policy.workflowType === 'decision_queue_routing';
      const isCooldownPolicy = policy.workflowType === 'scheduled_intervention_cooldown';
      const isTimingPolicy = policy.workflowType === 'scheduled_intervention_timing';
      const stateLabel = policy.enabled ? 'active' : 'paused';
      const stateClass = policy.enabled ? 'healthy' : 'critical';
      const riskClass = policy.riskLevel === 'critical' ? 'critical' : policy.riskLevel === 'high' ? 'high' : 'review';
      const pauseReview = !policy.enabled && policy.pauseReviewOverdue
        ? `<span>${et('pause review overdue')}</span>`
        : !policy.enabled && policy.pauseExpiresAt
          ? `<span>${et('review by {date}', { date: formatDate(policy.pauseExpiresAt) })}</span>`
          : '';
      const routing = policy.routingByRisk || {};
      const routingSummary = ['low', 'medium', 'high', 'critical']
        .map((risk) => {
          const entry = routing[risk];
          return entry ? t('{risk}: {owner} / {hours}h', { risk: t(risk), owner: t(entry.ownerType), hours: entry.escalationHours }) : null;
        })
        .filter(Boolean)
        .join(' | ');
      const cooldowns = Object.values(policy.cooldownHoursByTrigger || {}).map(Number).filter(Number.isFinite);
      const cooldownSummary = cooldowns.length > 0
        ? t('{count} signals, {minimum}-{maximum}h suppression', { count: cooldowns.length, minimum: Math.min(...cooldowns), maximum: Math.max(...cooldowns) })
        : t('scheduled duplicate suppression');
      const timingSummary = t('{followUp}h follow-up / {escalation}h escalation', {
        followUp: Number(policy.followUpAfterHours || 24),
        escalation: Number(policy.escalationAfterHours || 48)
      });
      return `
        <div class="item">
          <div class="item-title">
            <strong>${escapeHtml(policy.label || String(policy.actionType || '').replaceAll('_', ' '))}</strong>
            <span class="pill ${stateClass}">${et(stateLabel)}</span>
          </div>
          <div class="meta">
            ${isTimingPolicy
              ? `<span>${escapeHtml(timingSummary)}</span><span>${et('scheduled candidates only')}</span>`
              : isCooldownPolicy
                ? `<span>${escapeHtml(cooldownSummary)}</span><span>${et('scheduled signals only')}</span>`
                : isRoutingPolicy
                  ? `<span>${escapeHtml(routingSummary || t('internal queue routing'))}</span><span>${et('overdue VA/team work goes to Robert')}</span>`
                  : isWorkflowPolicy
                    ? `<span>${et('{hours}-hour default', { hours: String(policy.defaultSnoozeHours || 24) })}</span><span>${et('internal queue only')}</span>`
                    : `<span class="pill ${riskClass}">${et('{risk} risk', { risk: t(policy.riskLevel) })}</span><span>${et('{owner} decides', { owner: t(policy.ownerType) })}</span><span>${et('approval required')}</span>`}
            <span>${et(policy.configured ? 'workspace rule set' : 'baseline rule')}</span>
            ${pauseReview}
          </div>
          ${canManage ? `<div class="item-actions"><button class="button" data-policy-rule="${escapeHtml(policy.actionType)}" type="button">${et('Configure')}</button></div>` : ''}
        </div>
      `;
    }

    function renderPolicyHistory(event) {
      const after = event.afterState || {};
      const before = event.beforeState || {};
      const action = after.label || before.label || t('Trello action');
      const eventState = after.enabled === false ? 'paused' : after.enabled === true ? 'active' : 'updated';
      const stateClass = eventState === 'paused' ? 'critical' : eventState === 'active' ? 'healthy' : 'review';
      return `
        <div class="item">
          <div class="item-title">
            <strong>${escapeHtml(action)}</strong>
            <span class="pill ${stateClass}">${et(eventState)}</span>
          </div>
          <div class="meta">
            <span>${escapeHtml(formatDate(event.createdAt))}</span>
            <span>${escapeHtml(event.actor || 'sneup')}</span>
            <span>${after.riskLevel || before.riskLevel ? et('{risk} risk', { risk: t(after.riskLevel || before.riskLevel) }) : et('risk unchanged')}</span>
            ${after.relaxationConfirmed ? `<span>${et('relaxation confirmed')}</span>` : ''}
          </div>
        </div>
      `;
    }

    function renderFeatureFlag(flag) {
      const canManage = !state.securityContext?.demoMode
        && state.securityContext?.permissions?.includes('feature-flags:manage');
      const canReadHistory = !state.securityContext?.demoMode
        && flag.configured
        && state.securityContext?.permissions?.includes('audit:read');
      const stateLabel = !flag.enabled ? 'paused' : flag.effective ? 'active' : 'outside rollout';
      const stateClass = !flag.enabled ? 'critical' : flag.effective ? 'healthy' : 'review';
      const rolloutLabel = flag.rolloutPercentage >= 100
        ? t('all eligible use')
        : flag.rolloutPercentage <= 0
          ? t('no eligible use')
          : t('{percentage}% {subject} rollout', {
            percentage: flag.rolloutPercentage,
            subject: t(flag.rolloutSubject === 'workspace' ? 'workspace' : 'operator')
          });
      return `
        <div class="item">
          <div class="item-title">
            <strong>${escapeHtml(flag.label)}</strong>
            <span class="pill ${stateClass}">${et(stateLabel)}</span>
          </div>
          <p>${escapeHtml(flag.description)}</p>
          <div class="meta">
            <span>${escapeHtml(rolloutLabel)}</span>
            <span>${flag.configured ? et('revision {revision}', { revision: flag.revision }) : et('default control')}</span>
            ${flag.updatedAt ? `<span>${et('updated {date}', { date: formatDate(flag.updatedAt) })}</span>` : ''}
          </div>
          ${flag.reason ? `<div class="notice">${escapeHtml(flag.reason)}</div>` : ''}
          ${canManage || canReadHistory ? `<div class="item-actions">
            ${canReadHistory ? `<button class="button" data-feature-history="${escapeHtml(flag.key)}" type="button">${et('History')}</button>` : ''}
            ${canManage ? `<button class="button" data-feature-flag="${escapeHtml(flag.key)}" type="button">${et('Configure')}</button>` : ''}
          </div>` : ''}
        </div>
      `;
    }

    function renderIntegrityReport() {
      const report = state.integrityReport;
      if (state.integrityError) {
        elements.integrityCount.textContent = t('scan unavailable');
        elements.integrityList.innerHTML = `<div class="notice">${escapeHtml(state.integrityError)}</div>`;
        return;
      }
      if (!report) {
        elements.integrityCount.textContent = t('not scanned');
        elements.integrityList.innerHTML = `<div class="empty">${et('Run a bounded workspace scan.')}</div>`;
        return;
      }
      const canRepair = !state.securityContext?.demoMode
        && state.securityContext?.permissions?.includes('integrity:repair');
      const repairable = report.findings.filter(item => item.repairable);
      elements.integrityCount.textContent = plural('{count} finding', '{count} findings', report.summary.findings);
      const summary = `
        <div class="item">
          <div class="item-title"><strong>${et('{repairable} repairable, {review} need review', { repairable: report.summary.repairable, review: report.summary.reviewRequired })}</strong><span class="pill ${report.summary.findings ? 'review' : 'healthy'}">${et(report.truncated ? 'bounded result' : 'complete result')}</span></div>
          <div class="meta"><span>${et('Internal database only')}</span><span>${et('No provider writes')}</span><span>${escapeHtml(formatDate(report.scannedAt))}</span></div>
          ${canRepair && repairable.length > 0 ? `<div class="item-actions"><button class="button primary" data-integrity-repair type="button">${et('Repair derived state')}</button></div>` : ''}
        </div>`;
      const rows = report.findings.map(item => `
        <div class="item">
          <div class="item-title"><strong>${escapeHtml(item.label)}</strong><span class="pill ${item.repairable ? 'healthy' : severityClass(item.severity)}">${et(item.repairable ? 'repairable' : 'review required')}</span></div>
          <p>${escapeHtml(item.reason)}</p>
          <div class="meta"><span>${escapeHtml(item.category.replaceAll('_', ' '))}</span><span>${escapeHtml(item.entityType)}</span></div>
        </div>`).join('');
      elements.integrityList.innerHTML = summary + (rows || `<div class="empty">${et('No integrity drift found.')}</div>`);
      document.querySelector('[data-integrity-repair]')?.addEventListener('click', callbacks.openIntegrityRepair);
    }

    function renderRetentionReport() {
      const report = state.retentionReport;
      if (state.retentionError) {
        elements.retentionCount.textContent = t('scan unavailable');
        elements.retentionList.innerHTML = `<div class="notice">${escapeHtml(state.retentionError)}</div>`;
        return;
      }
      if (!report) {
        elements.retentionCount.textContent = t('not scanned');
        elements.retentionList.innerHTML = `<div class="empty">${et('Run a bounded retention scan.')}</div>`;
        return;
      }
      const owner = !state.securityContext?.demoMode
        && (state.securityContext?.roles || []).includes('owner')
        && state.securityContext?.permissions?.includes('data-retention:manage');
      elements.retentionCount.textContent = plural('{count} due record', '{count} due records', report.summary.due);
      const policyState = report.policy.enabled ? 'active' : 'off';
      const summary = `
        <div class="item">
          <div class="item-title"><strong>${et('Retention policy')}</strong><span class="pill ${report.policy.enabled ? 'healthy' : 'review'}">${et(policyState)}</span></div>
          <div class="meta"><span>${et('Operations {days}d', { days: report.policy.operationalDays })}</span><span>${et('Performance {days}d', { days: report.policy.performanceDays })}</span><span>${et('Notifications {days}d', { days: report.policy.notificationDays })}</span><span>${et('Credentials {days}d', { days: report.policy.credentialDays })}</span></div>
          <div class="meta"><span>${et('Audit, approvals, actions, active credentials, pending deliveries, and current project data stay protected')}</span></div>
          ${owner ? `<div class="item-actions"><button class="button" data-retention-configure type="button">${et('Configure')}</button>${report.policy.enabled && report.summary.due > 0 ? `<button class="button danger" data-retention-apply type="button">${et('Prune due records')}</button>` : ''}</div>` : ''}
        </div>`;
      const rows = report.categories.map(item => `
        <div class="item">
          <div class="item-title"><strong>${escapeHtml(item.label)}</strong><span class="pill ${item.due ? 'review' : 'healthy'}">${ep('{count} due record', '{count} due records', item.due)}${item.truncated ? '+' : ''}</span></div>
          <div class="meta"><span>${ep('{count} day', '{count} days', item.retentionDays)}</span><span>${et('Before {date}', { date: formatDate(item.cutoff) })}</span><span>${et(item.truncated ? 'More remain for a later bounded pass' : 'Complete bounded result')}</span></div>
        </div>`).join('');
      elements.retentionList.innerHTML = summary + rows;
      document.querySelector('[data-retention-configure]')?.addEventListener('click', callbacks.openRetentionPolicy);
      document.querySelector('[data-retention-apply]')?.addEventListener('click', callbacks.openRetentionApply);
    }

    function bindActions() {
      document.querySelectorAll('[data-workspace-user-sessions]').forEach((button) => {
        button.addEventListener('click', () => callbacks.openWorkspaceUserSessions(button.dataset.workspaceUserSessions));
      });
      document.querySelectorAll('[data-revoke-workspace-invite]').forEach((button) => {
        const invitation = state.workspaceInvitations.find(item => item.id === button.dataset.revokeWorkspaceInvite);
        button.addEventListener('click', () => callbacks.openInviteRevocationConfirmation(invitation));
      });
      document.querySelectorAll('[data-retry-workspace-invite-delivery]').forEach((button) => {
        const invitation = state.workspaceInvitations.find(item => item.id === button.dataset.retryWorkspaceInviteDelivery);
        button.addEventListener('click', () => callbacks.openInviteDeliveryRetryConfirmation(invitation));
      });
      document.querySelectorAll('[data-policy-rule]').forEach((button) => {
        button.addEventListener('click', () => callbacks.openPolicyRuleEditor(button.dataset.policyRule));
      });
      document.querySelectorAll('[data-feature-flag]').forEach((button) => {
        button.addEventListener('click', () => callbacks.openFeatureFlagEditor(button.dataset.featureFlag));
      });
      document.querySelectorAll('[data-feature-history]').forEach((button) => {
        button.addEventListener('click', () => callbacks.openFeatureFlagHistory(button.dataset.featureHistory));
      });
      if (!elements.policyHistoryActionFilter || !elements.policyHistoryActorFilter || !elements.policyHistoryRangeFilter) return;
      elements.policyHistoryActionFilter.onchange = () => {
        state.policyHistoryFilters.actionType = elements.policyHistoryActionFilter.value;
        callbacks.loadPolicyHistory();
      };
      elements.policyHistoryRangeFilter.onchange = () => {
        state.policyHistoryFilters.rangeDays = elements.policyHistoryRangeFilter.value;
        callbacks.loadPolicyHistory();
      };
      const applyActorFilter = () => {
        state.policyHistoryFilters.actor = elements.policyHistoryActorFilter.value.trim();
        callbacks.loadPolicyHistory();
      };
      elements.policyHistoryActorFilter.onchange = applyActorFilter;
      elements.policyHistoryActorFilter.onkeydown = (event) => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        applyActorFilter();
      };
    }

    function render(errorMessage = '') {
      const workspaces = state.workspaces || [];
      const currentWorkspaceId = state.activeWorkspaceId || state.currentWorkspace?.id || '';
      const currentWorkspace = workspaces.find(workspace => workspace.id === currentWorkspaceId)
        || state.currentWorkspace
        || workspaces[0];

      elements.workspaceCount.textContent = workspaces.length || 1;
      elements.workspaceMode.textContent = t(state.securityContext?.workspaceOverrideAllowed ? 'switchable' : 'locked');
      elements.workspaceSelect.innerHTML = workspaces.length > 0
        ? workspaces.map(workspace => `
          <option value="${escapeHtml(workspace.id)}" ${workspace.id === currentWorkspaceId ? 'selected' : ''}>${escapeHtml(workspace.name)}</option>
        `).join('')
        : `<option value="${escapeHtml(currentWorkspaceId)}">${escapeHtml(state.currentWorkspace?.name || t('Current workspace'))}</option>`;
      elements.workspaceSelect.disabled = !state.securityContext?.workspaceOverrideAllowed || workspaces.length <= 1;

      const users = state.workspaceUsers || [];
      const invitations = state.workspaceInvitations || [];
      const policyRules = state.policyRules || [];
      const policyHistory = state.policyHistory || [];
      const featureFlags = state.featureFlags || [];
      renderPolicyHistoryFilters(policyRules);
      const pendingInvitations = invitations.filter(invite => invite.status === 'pending');
      elements.workspaceMetrics.innerHTML = [
        [t('Workspace'), currentWorkspace?.name || t('Current')],
        [t('Status'), t(currentWorkspace?.status || 'active')],
        [t('Plan'), currentWorkspace?.plan || 'local'],
        [t('Users'), users.length],
        [t('Pending invites'), pendingInvitations.length],
        [t('Override'), t(state.securityContext?.workspaceOverrideAllowed ? 'Allowed' : 'Locked')],
        [t('Actor'), state.securityContext?.displayName || state.securityContext?.actorId || 'Sneup']
      ].map(([label, value]) => `
        <div class="metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>
      `).join('');

      const notice = errorMessage ? `<div class="notice">${escapeHtml(errorMessage)}</div>` : '';
      const demoNotice = state.securityContext?.demoMode || currentWorkspace?.demoMode
        ? `<div class="notice">${et('Demo workspace is read-only. Connect a database and sign in to manage people, invitations, and action safety.')}</div>`
        : '';
      elements.workspaceList.innerHTML = demoNotice + notice + listOrEmpty(workspaces, renderWorkspace);
      const canExportWorkspace = Boolean(
        currentWorkspace?.id
        && !state.securityContext?.demoMode
        && (state.securityContext?.roles || []).includes('owner')
      );
      elements.workspaceExportButton.disabled = !canExportWorkspace;
      elements.workspaceDeleteButton.disabled = !(canExportWorkspace && ['archived', 'deleting'].includes(currentWorkspace?.status));
      elements.workspaceUserCount.textContent = plural('{count} user', '{count} users', users.length);
      elements.workspaceUsers.innerHTML = listOrEmpty(users, renderWorkspaceUser);
      elements.workspaceInviteCount.textContent = plural('{count} pending invitation', '{count} pending invitations', pendingInvitations.length);
      elements.workspaceInvitations.innerHTML = listOrEmpty(invitations, renderWorkspaceInvitation);
      elements.workspaceInviteButton.disabled = !currentWorkspace?.id || !state.securityContext?.permissions?.includes('identity:manage');
      elements.policyRuleCount.textContent = plural('{count} action', '{count} actions', policyRules.length);
      elements.policyRuleList.innerHTML = state.policyRuleError
        ? `<div class="notice">${escapeHtml(state.policyRuleError)}</div>`
        : listOrEmpty(policyRules, renderPolicyRule);
      elements.policyHistoryCount.textContent = plural('{count} change', '{count} changes', policyHistory.length);
      elements.policyHistoryList.innerHTML = state.policyHistoryError
        ? `<div class="notice">${escapeHtml(state.policyHistoryError)}</div>`
        : listOrEmpty(policyHistory, renderPolicyHistory);
      elements.featureFlagCount.textContent = t('{configured}/{total} configured', {
        configured: featureFlags.filter(flag => flag.configured).length,
        total: featureFlags.length
      });
      elements.featureFlagList.innerHTML = state.featureFlagError
        ? `<div class="notice">${escapeHtml(state.featureFlagError)}</div>`
        : listOrEmpty(featureFlags, renderFeatureFlag);
      renderIntegrityReport();
      renderRetentionReport();
      bindActions();
    }

    return { render, renderIntegrityReport, renderRetentionReport };
  }

  return { createController, DYNAMIC_OPERATOR_MESSAGES, NL_MESSAGES };
});
