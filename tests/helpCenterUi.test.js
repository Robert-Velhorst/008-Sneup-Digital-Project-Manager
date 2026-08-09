const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const { HELP_TOPICS, createController } = require('../public/helpCenter');

const rootDir = path.join(__dirname, '..');
const htmlSource = fs.readFileSync(path.join(rootDir, 'public', 'index.html'), 'utf8');
const moduleSource = fs.readFileSync(path.join(rootDir, 'public', 'helpCenter.js'), 'utf8');
const appSource = fs.readFileSync(path.join(rootDir, 'public', 'app.js'), 'utf8');

function createHarness(context = 'overview') {
  const dom = new JSDOM(htmlSource, { url: 'http://localhost/' });
  const actions = [];
  const beforeOpen = jest.fn();
  let currentContext = context;
  const controller = createController({
    document: dom.window.document,
    getContext: () => currentContext,
    beforeOpen,
    onAction: action => actions.push(action),
    requestAnimationFrame: callback => callback()
  });
  return {
    actions,
    beforeOpen,
    controller,
    dom,
    document: dom.window.document,
    setContext(value) { currentContext = value; },
    close() {
      controller.destroy();
      dom.window.close();
    }
  };
}

describe('context-sensitive help center', () => {
  test('covers every command-center view plus setup, safety, and privacy', () => {
    expect(HELP_TOPICS.map(topic => topic.id)).toEqual([
      'overview',
      'approvals',
      'connectors',
      'signals',
      'forecasts',
      'reports',
      'enhancements',
      'workspaces',
      'setup',
      'decision-safety',
      'privacy'
    ]);
    expect(HELP_TOPICS.every(topic => (
      topic.summary
      && topic.steps.length >= 3
      && topic.notes.length >= 2
      && topic.action.id
    ))).toBe(true);
    expect(moduleSource).toContain('Approval authorizes one bounded payload');
    expect(moduleSource).toContain('Reconcile an ambiguous attempt');
    expect(moduleSource).toContain('Credentials, tokens, connection strings');
    expect(moduleSource).not.toContain('.innerHTML');
  });

  test('opens the current view topic from the help button', () => {
    const harness = createHarness('forecasts');
    expect(harness.document.getElementById('helpTopicList').childElementCount).toBe(0);
    expect(harness.document.getElementById('helpTopicContent').childElementCount).toBe(0);
    harness.document.getElementById('helpButton').click();

    expect(harness.beforeOpen).toHaveBeenCalledTimes(1);
    expect(harness.controller.isOpen()).toBe(true);
    expect(harness.controller.getActiveTopicId()).toBe('forecasts');
    expect(harness.document.getElementById('helpCenter').getAttribute('aria-hidden')).toBe('false');
    expect(harness.document.querySelector('#helpTopicContent h2').textContent).toBe('Forecasts');
    expect(harness.document.activeElement).toBe(harness.document.getElementById('helpSearch'));
    harness.close();
  });

  test('falls back to overview for an unknown context', () => {
    const harness = createHarness('not-a-view');
    harness.controller.open();
    expect(harness.controller.getActiveTopicId()).toBe('overview');
    harness.close();
  });

  test('filters the local topic catalog without replacing the active guidance', () => {
    const harness = createHarness('signals');
    harness.controller.open();
    const search = harness.document.getElementById('helpSearch');
    search.value = 'mapping candidates';
    search.dispatchEvent(new harness.dom.window.Event('input', { bubbles: true }));

    const results = [...harness.document.querySelectorAll('[data-help-topic]')];
    expect(results).toHaveLength(1);
    expect(results[0].dataset.helpTopic).toBe('signals');
    expect(harness.document.getElementById('helpResultCount').textContent).toBe('1 topic');

    search.value = 'query that is absent';
    search.dispatchEvent(new harness.dom.window.Event('input', { bubbles: true }));
    expect(harness.document.querySelector('.help-empty').textContent).toBe('No matching help topic.');
    expect(harness.controller.getActiveTopicId()).toBe('signals');
    harness.close();
  });

  test('closes before handing a bounded local action to the application', () => {
    const harness = createHarness('connectors');
    harness.controller.open();
    harness.document.querySelector('[data-help-action="view:connectors"]').click();

    expect(harness.controller.isOpen()).toBe(false);
    expect(harness.actions).toEqual(['view:connectors']);
    harness.close();
  });

  test('opens with F1 and closes with Escape while restoring focus', () => {
    const harness = createHarness('workspaces');
    const opener = harness.document.getElementById('helpButton');
    opener.focus();
    harness.document.dispatchEvent(new harness.dom.window.KeyboardEvent('keydown', {
      key: 'F1',
      bubbles: true,
      cancelable: true
    }));
    expect(harness.controller.getActiveTopicId()).toBe('workspaces');

    harness.document.dispatchEvent(new harness.dom.window.KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true
    }));
    expect(harness.controller.isOpen()).toBe(false);
    expect(harness.document.activeElement).toBe(opener);
    harness.close();
  });

  test('keeps tab focus inside the modal dialog', () => {
    const harness = createHarness('overview');
    harness.controller.open();
    const closeButton = harness.document.getElementById('closeHelpCenter');
    const lastAction = harness.document.querySelector('[data-help-action]');

    lastAction.focus();
    harness.document.dispatchEvent(new harness.dom.window.KeyboardEvent('keydown', {
      key: 'Tab',
      bubbles: true,
      cancelable: true
    }));
    expect(harness.document.activeElement).toBe(closeButton);

    closeButton.focus();
    harness.document.dispatchEvent(new harness.dom.window.KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
      cancelable: true
    }));
    expect(harness.document.activeElement).toBe(lastAction);
    harness.close();
  });
});

describe('help center integration boundaries', () => {
  test('loads the standalone module before the application', () => {
    expect(htmlSource.indexOf('/helpCenter.js')).toBeGreaterThan(-1);
    expect(htmlSource.indexOf('/helpCenter.js')).toBeLessThan(htmlSource.indexOf('/app.js'));
    expect(htmlSource).toContain('role="dialog" aria-modal="true" aria-labelledby="helpCenterTitle"');
    expect(htmlSource).toContain('aria-keyshortcuts="F1"');
  });

  test('routes help through the current view and existing safe workflows', () => {
    expect(appSource).toContain('getContext: () => state.activeView');
    expect(appSource).toContain("if (actionId === 'view:approvals')");
    expect(appSource).toContain("if (actionId === 'setup')");
    expect(appSource).toContain("if (actionId.startsWith('view:')) showView(actionId.slice(5));");
  });

  test('initializes through its browser script boundary', () => {
    const dom = new JSDOM(htmlSource, { runScripts: 'outside-only', url: 'http://localhost/' });
    expect(() => dom.window.eval(moduleSource)).not.toThrow();
    const controller = dom.window.SneupHelpCenter.init({
      getContext: () => 'reports',
      requestAnimationFrame: callback => callback()
    });
    expect(controller).not.toBeNull();
    controller.open();
    expect(controller.getActiveTopicId()).toBe('reports');
    controller.destroy();
    dom.window.close();
  });
});
