(function attachHelpCenter(root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.SneupHelpCenter = api;
})(typeof window === 'object' ? window : null, function createHelpCenterModule(root) {
  const HELP_TOPICS = [
    {
      id: 'overview',
      title: 'Overview',
      category: 'Daily command',
      summary: 'Start here to see what needs attention now, what can proceed automatically, and where delivery confidence is changing.',
      steps: [
        'Read the operations brief for the smallest set of decisions that unblock work.',
        'Use the focus queue and team load together before changing priorities.',
        'Open a board or evidence link when a risk needs source-level confirmation.'
      ],
      notes: [
        'The overview is advisory. It does not approve or execute provider changes.',
        'Refresh only when you need newer source data; each view otherwise loads on demand.'
      ],
      action: { id: 'view:overview', label: 'Open overview' }
    },
    {
      id: 'approvals',
      title: 'Approvals and ledger',
      category: 'Human decisions',
      summary: 'Review exact proposed changes, their evidence, and every attempt recorded in the operations ledger.',
      steps: [
        'Filter the decision queue by owner and open the item blocking the most work.',
        'Compare the protected target, exact payload, risk, policy result, expiry, and source evidence.',
        'Approve or reject only the displayed payload. A changed payload requires a new approval.',
        'Reconcile an ambiguous attempt from observed provider evidence instead of retrying it blindly.'
      ],
      notes: [
        'Approval authorizes one bounded payload; it is not permission for future related changes.',
        'The audit trail and action attempts remain the source of truth after execution.'
      ],
      action: { id: 'view:approvals', label: 'Review decisions' }
    },
    {
      id: 'connectors',
      title: 'Connectors',
      category: 'Accounts and tools',
      summary: 'Connect project, communication, document, scheduling, and delivery tools through reviewed read-only access.',
      steps: [
        'Search by provider or category, then check whether the connector is ready, requires setup, or is catalog-only.',
        'Review requested scopes before leaving Sneup for provider consent or entering a credential.',
        'After connection, select the intended account, workspace, or site and run a read-only sync.',
        'Review stale credentials and disconnect accounts that are no longer needed.'
      ],
      notes: [
        'A listed connector is not claimed live until its account authorization and sync succeed.',
        'Provider writes remain blocked here; proposed changes enter the approval ledger.'
      ],
      action: { id: 'view:connectors', label: 'Open connectors' }
    },
    {
      id: 'signals',
      title: 'Cross-tool signals',
      category: 'Normalized work',
      summary: 'Inspect read-only work signals from connected systems without treating unlike provider records as identical.',
      steps: [
        'Use filters to isolate stale, blocked, unmapped, or low-quality signals.',
        'Open source evidence before acting on a normalized status or dependency.',
        'Review mapping candidates and contracts when records are missing a project or board relationship.'
      ],
      notes: [
        'Signal quality reflects available provider evidence, not certainty about team intent.',
        'Mapping changes affect Sneup analysis only and do not edit provider records.'
      ],
      action: { id: 'view:signals', label: 'Inspect signals' }
    },
    {
      id: 'forecasts',
      title: 'Forecasts',
      category: 'Capacity and delivery',
      summary: 'Compare workload, capacity, time off, and mapped schedule evidence to find delivery pressure early.',
      steps: [
        'Start with portfolio confidence and boards at risk, then inspect the contributing capacity assumptions.',
        'Maintain each person\'s working hours, allocation, focus time, skills, and planned time off.',
        'Use a temporary scenario to explore a change before saving any capacity input.',
        'Map provider project IDs only when the schedule evidence belongs to the selected board.'
      ],
      notes: [
        'Scenarios are temporary and never change provider data or queued decisions.',
        'Forecasts are decision support, not delivery guarantees.'
      ],
      action: { id: 'view:forecasts', label: 'Open forecasts' }
    },
    {
      id: 'reports',
      title: 'Reports',
      category: 'Stakeholder updates',
      summary: 'Generate evidence-backed status, stand-up, risk, and client views from the current workspace state.',
      steps: [
        'Choose the report whose audience and time horizon match the update you need.',
        'Review risks, decisions, confidence, and source links before sharing an export.',
        'Refresh workspace data first when the report must reflect a newly completed sync.'
      ],
      notes: [
        'A generated report reflects the evidence available at generation time.',
        'Keep approval details and internal evidence within the intended audience.'
      ],
      action: { id: 'view:reports', label: 'Open reports' }
    },
    {
      id: 'enhancements',
      title: 'Enhancements',
      category: 'Product improvement',
      summary: 'Review the prioritized improvement backlog and the evidence behind each recommendation.',
      steps: [
        'Filter by priority, status, and product area to find the next actionable improvement.',
        'Compare user value, effort, risk, and implementation evidence before changing status.',
        'Keep external prerequisites visible instead of marking a recommendation complete without proof.'
      ],
      notes: [
        'Backlog priority is advisory and should be revisited when operating evidence changes.',
        'Live-provider and infrastructure gates cannot be completed by local code alone.'
      ],
      action: { id: 'view:enhancements', label: 'Open enhancements' }
    },
    {
      id: 'workspaces',
      title: 'Workspace administration',
      category: 'Access and governance',
      summary: 'Manage workspace lifecycle, people, sessions, action policies, feature rollouts, integrity, retention, and export.',
      steps: [
        'Confirm the selected workspace before inviting people, changing roles, or editing policies.',
        'Use integrity and retention previews before any repair or deletion is confirmed.',
        'Export workspace data before archival or permanent deletion when records must be retained.',
        'Review safety history after policy or rollout changes.'
      ],
      notes: [
        'Destructive and safety-relaxing actions require owner-level confirmation and are audited.',
        'Archived workspaces cannot perform provider writes.'
      ],
      action: { id: 'view:workspaces', label: 'Open administration' }
    },
    {
      id: 'setup',
      title: 'Setup and live readiness',
      category: 'Getting connected',
      summary: 'Check whether this runtime is a safe local demo or a fully configured live workspace, and see exact remediation for missing prerequisites.',
      steps: [
        'Open Set up and review all eight redacted runtime checks.',
        'Use demo mode to explore locally without provider accounts or database writes.',
        'For live mode, configure the database, purpose-separated secrets, Trello access, and optional ngrok settings outside the browser.',
        'Create a redacted support file from the Windows app when diagnostics need to be shared.'
      ],
      notes: [
        'Sneup never asks for production secrets in the setup screen.',
        'Remote access fails closed when its authentication or tunnel configuration is weak.'
      ],
      action: { id: 'setup', label: 'Open setup' }
    },
    {
      id: 'decision-safety',
      title: 'Decision safety',
      category: 'Approval boundaries',
      summary: 'Understand the controls that keep recommendations, approvals, executions, and reconciliations separate.',
      steps: [
        'Treat a recommendation as analysis until an exact payload is prepared.',
        'Verify target, action, payload, evidence, policy, approver, and expiry before approval.',
        'After approval, execution claims the action once and records the provider result.',
        'If the provider result is ambiguous, inspect the provider and reconcile the ledger without sending again.'
      ],
      notes: [
        'Emergency stop, workspace status, policy, approval, expiry, and idempotency are checked before a provider write.',
        'Chat, forecasts, reports, signals, and help content cannot approve an action.'
      ],
      action: { id: 'view:approvals', label: 'Open safety ledger' }
    },
    {
      id: 'privacy',
      title: 'Privacy and data control',
      category: 'Workspace data',
      summary: 'Control what Sneup retains, exports, repairs, and removes while preserving evidence required for accountability.',
      steps: [
        'Use workspace export for a streamed copy of workspace records with sensitive fields redacted.',
        'Preview retention candidates and integrity findings before applying a bounded change.',
        'Revoke or disconnect accounts that should no longer supply read-only signals.',
        'Archive before requesting permanent workspace deletion.'
      ],
      notes: [
        'Credentials, tokens, connection strings, and confirmation text are excluded from local draft storage.',
        'Audit, approval, provider-attempt, and current-work evidence are protected from routine retention.'
      ],
      action: { id: 'view:workspaces', label: 'Open data controls' }
    }
  ];

  const TOPIC_BY_ID = new Map(HELP_TOPICS.map(topic => [topic.id, topic]));
  const CONTEXT_TOPIC_IDS = new Set([
    'overview', 'approvals', 'connectors', 'enhancements',
    'signals', 'forecasts', 'reports', 'workspaces'
  ]);

  function appendTextElement(document, parent, tagName, className, text) {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    element.textContent = text;
    parent.appendChild(element);
    return element;
  }

  function searchableText(topic) {
    return [topic.title, topic.category, topic.summary, ...topic.steps, ...topic.notes]
      .join(' ')
      .toLowerCase();
  }

  function createController(options = {}) {
    const document = options.document || root?.document;
    if (!document) return null;
    const i18n = options.i18n || root?.SneupI18n || {
      t: value => value,
      plural: (singular, pluralMessage, count) => String(count === 1 ? singular : pluralMessage).replace('{count}', count)
    };
    const translate = value => i18n.t(value);

    const elements = {
      button: document.getElementById('helpButton'),
      overlay: document.getElementById('helpCenter'),
      panel: document.querySelector('#helpCenter .help-center-panel'),
      close: document.getElementById('closeHelpCenter'),
      search: document.getElementById('helpSearch'),
      list: document.getElementById('helpTopicList'),
      count: document.getElementById('helpResultCount'),
      content: document.getElementById('helpTopicContent')
    };
    if (Object.values(elements).some(element => !element)) return null;

    let activeTopicId = 'overview';
    let lastFocused = null;
    const listeners = [];
    const on = (target, name, listener) => {
      target.addEventListener(name, listener);
      listeners.push(() => target.removeEventListener(name, listener));
    };

    function contextTopicId() {
      const context = String(options.getContext?.() || 'overview').toLowerCase();
      return CONTEXT_TOPIC_IDS.has(context) ? context : 'overview';
    }

    function matchingTopics() {
      const query = elements.search.value.trim().toLowerCase();
      return query
        ? HELP_TOPICS.filter(topic => searchableText({
          ...topic,
          title: translate(topic.title),
          category: translate(topic.category),
          summary: translate(topic.summary),
          steps: topic.steps.map(translate),
          notes: topic.notes.map(translate)
        }).includes(query))
        : HELP_TOPICS;
    }

    function renderList() {
      const topics = matchingTopics();
      elements.list.replaceChildren();
      topics.forEach((topic) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'help-topic-button';
        button.dataset.helpTopic = topic.id;
        if (topic.id === activeTopicId) button.setAttribute('aria-current', 'page');
        appendTextElement(document, button, 'strong', '', translate(topic.title));
        appendTextElement(document, button, 'span', '', translate(topic.category));
        elements.list.appendChild(button);
      });
      if (topics.length === 0) {
        appendTextElement(document, elements.list, 'p', 'help-empty', translate('No matching help topic.'));
      }
      elements.count.textContent = i18n.plural('{count} topic', '{count} topics', topics.length);
    }

    function renderTopic(topicId) {
      const topic = TOPIC_BY_ID.get(topicId) || TOPIC_BY_ID.get('overview');
      activeTopicId = topic.id;
      elements.content.replaceChildren();
      appendTextElement(document, elements.content, 'p', 'help-topic-category', translate(topic.category));
      appendTextElement(document, elements.content, 'h2', '', translate(topic.title));
      appendTextElement(document, elements.content, 'p', 'help-topic-summary', translate(topic.summary));

      const stepsSection = document.createElement('section');
      appendTextElement(document, stepsSection, 'h3', '', translate('What to do'));
      const steps = document.createElement('ol');
      topic.steps.forEach(step => appendTextElement(document, steps, 'li', '', translate(step)));
      stepsSection.appendChild(steps);
      elements.content.appendChild(stepsSection);

      const notesSection = document.createElement('section');
      appendTextElement(document, notesSection, 'h3', '', translate('Keep in mind'));
      const notes = document.createElement('ul');
      topic.notes.forEach(note => appendTextElement(document, notes, 'li', '', translate(note)));
      notesSection.appendChild(notes);
      elements.content.appendChild(notesSection);

      const action = document.createElement('button');
      action.type = 'button';
      action.className = 'button primary help-topic-action';
      action.dataset.helpAction = topic.action.id;
      action.textContent = translate(topic.action.label);
      elements.content.appendChild(action);
      renderList();
    }

    function isOpen() {
      return elements.overlay.classList.contains('open');
    }

    function open(topicId) {
      options.beforeOpen?.();
      lastFocused = document.activeElement;
      elements.search.value = '';
      renderTopic(TOPIC_BY_ID.has(topicId) ? topicId : contextTopicId());
      elements.overlay.classList.add('open');
      elements.overlay.setAttribute('aria-hidden', 'false');
      const requestFrame = options.requestAnimationFrame || root?.requestAnimationFrame || (callback => callback());
      requestFrame(() => elements.search.focus());
    }

    function restoreFocus() {
      const hiddenOverlay = lastFocused?.closest?.('.drawer:not(.open), .command-palette:not(.open), .help-center:not(.open)');
      const target = lastFocused?.isConnected && !hiddenOverlay ? lastFocused : elements.button;
      target?.focus?.();
      lastFocused = null;
    }

    function close() {
      if (!isOpen()) return;
      elements.overlay.classList.remove('open');
      elements.overlay.setAttribute('aria-hidden', 'true');
      restoreFocus();
    }

    function trapFocus(event) {
      const focusable = [...elements.panel.querySelectorAll('button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')]
        .filter(element => element.getAttribute('aria-hidden') !== 'true');
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    function handleKeydown(event) {
      if (event.key === 'F1' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault();
        if (isOpen()) {
          elements.search.focus();
        } else {
          open(contextTopicId());
        }
        return;
      }
      if (!isOpen()) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      } else if (event.key === 'Tab') {
        trapFocus(event);
      } else if (event.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
        event.preventDefault();
        elements.search.focus();
      }
    }

    on(elements.button, 'click', () => open(contextTopicId()));
    on(elements.close, 'click', close);
    on(elements.overlay, 'click', event => {
      if (event.target === elements.overlay) close();
    });
    on(elements.search, 'input', renderList);
    on(elements.list, 'click', event => {
      const button = event.target.closest('[data-help-topic]');
      if (button) renderTopic(button.dataset.helpTopic);
    });
    on(elements.content, 'click', event => {
      const button = event.target.closest('[data-help-action]');
      if (!button) return;
      const actionId = button.dataset.helpAction;
      close();
      options.onAction?.(actionId);
    });
    on(document, 'keydown', handleKeydown);
    return {
      open,
      close,
      isOpen,
      getActiveTopicId: () => activeTopicId,
      destroy() {
        listeners.splice(0).forEach(remove => remove());
      }
    };
  }

  return {
    HELP_TOPICS,
    createController,
    init: createController
  };
});
