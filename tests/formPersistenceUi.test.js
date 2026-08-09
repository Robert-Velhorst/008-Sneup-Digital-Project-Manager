const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const {
  createController,
  createRepository,
  parseFieldNames
} = require('../public/formPersistence');

const formMarkup = `
  <form data-draft-key="safe-form" data-draft-fields="title,hours,enabled" data-template-fields="hours,enabled">
    <input name="title" value="Initial">
    <input name="hours" value="32">
    <input name="enabled" type="checkbox" checked>
    <div class="modal-actions"></div>
  </form>
`;

function createHarness({ markup = formMarkup, initialScope = 'workspace-a' } = {}) {
  const dom = new JSDOM(markup, { url: 'http://localhost/' });
  let scope = initialScope;
  const controller = createController({
    document: dom.window.document,
    MutationObserver: null,
    sessionStorage: dom.window.sessionStorage,
    localStorage: dom.window.localStorage,
    getScope: () => scope,
    debounceMs: 0,
    setTimer: callback => {
      callback();
      return null;
    },
    clearTimer: () => {}
  });
  return {
    controller,
    dom,
    form: dom.window.document.querySelector('form'),
    setScope(value) { scope = value; }
  };
}

function buttonByText(form, label) {
  return [...form.querySelectorAll('button')].find(button => button.textContent === label);
}

describe('workspace-scoped form persistence', () => {
  test('rejects sensitive fields even when a form requests them', () => {
    expect(parseFieldNames('title,apiToken,password,email,confirmRelaxation,evidence,message')).toEqual(['title']);
    const { controller, dom, form } = createHarness({
      markup: `
        <form data-draft-key="guarded" data-draft-fields="title,apiToken,email,confirmRelaxation">
          <input name="title" value="Safe title">
          <input name="apiToken" value="not-for-storage">
          <input name="email" value="person@example.com">
          <input name="confirmRelaxation" type="checkbox" checked>
        </form>
      `
    });

    form.elements.title.dispatchEvent(new dom.window.Event('input', { bubbles: true }));

    expect(controller.repository.loadDraft('guarded').values).toEqual({ title: 'Safe title' });
    controller.disconnect();
    dom.window.close();
  });

  test('restores a draft only inside the workspace where the form opened', () => {
    const { controller, dom, form, setScope } = createHarness();
    form.elements.title.value = 'Workspace A draft';
    form.elements.title.dispatchEvent(new dom.window.Event('input', { bubbles: true }));

    expect(controller.repository.loadDraft('safe-form', 'workspace-a').values.title).toBe('Workspace A draft');
    expect(controller.repository.loadDraft('safe-form', 'workspace-b')).toBeNull();

    setScope('workspace-b');
    controller.repository.saveDraft('safe-form', { title: 'Workspace B draft' }, 'workspace-b');
    expect(controller.markSaved(form)).toBe(true);
    expect(controller.repository.loadDraft('safe-form', 'workspace-a')).toBeNull();
    expect(controller.repository.loadDraft('safe-form', 'workspace-b').values.title).toBe('Workspace B draft');

    controller.disconnect();
    dom.window.close();
  });

  test('restores a bounded draft in a newly opened form', () => {
    const first = createHarness();
    first.form.elements.title.value = 'Recovered work';
    first.form.elements.hours.value = '40';
    first.form.elements.enabled.checked = false;
    first.form.elements.title.dispatchEvent(new first.dom.window.Event('input', { bubbles: true }));

    const secondDom = new JSDOM(formMarkup, { url: 'http://localhost/' });
    const restoredEvents = [];
    const secondForm = secondDom.window.document.querySelector('form');
    secondForm.addEventListener('sneup:draft-restored', () => restoredEvents.push('restored'));
    const secondController = createController({
      document: secondDom.window.document,
      MutationObserver: null,
      sessionStorage: first.dom.window.sessionStorage,
      localStorage: first.dom.window.localStorage,
      getScope: () => 'workspace-a'
    });

    expect(secondForm.elements.title.value).toBe('Recovered work');
    expect(secondForm.elements.hours.value).toBe('40');
    expect(secondForm.elements.enabled.checked).toBe(false);
    expect(secondForm.querySelector('.form-persistence-status').textContent).toBe('Draft restored');
    expect(restoredEvents).toEqual(['restored']);

    first.controller.disconnect();
    secondController.disconnect();
    first.dom.window.close();
    secondDom.window.close();
  });

  test('saves, applies, replaces, caps, and deletes named presets', () => {
    const { controller, dom, form } = createHarness();
    const nameInput = form.querySelector('.form-persistence-presets input');
    const presetSelect = form.querySelector('.form-persistence-presets select');
    const saveButton = buttonByText(form, 'Save preset');
    const deleteButton = buttonByText(form, 'Delete preset');

    form.elements.hours.value = '36';
    form.elements.enabled.checked = true;
    nameInput.value = 'Standard week';
    saveButton.click();
    form.elements.hours.value = '12';
    form.elements.enabled.checked = false;
    presetSelect.value = 'Standard week';
    presetSelect.dispatchEvent(new dom.window.Event('change', { bubbles: true }));

    expect(form.elements.hours.value).toBe('36');
    expect(form.elements.enabled.checked).toBe(true);

    form.elements.hours.value = '38';
    nameInput.value = 'standard WEEK';
    saveButton.click();
    expect(controller.repository.listPresets('safe-form')).toHaveLength(1);
    expect(controller.repository.listPresets('safe-form')[0].values.hours).toBe('38');

    for (let index = 0; index < 10; index += 1) {
      controller.repository.savePreset('safe-form', `Preset ${index}`, { hours: String(index) });
    }
    expect(controller.repository.listPresets('safe-form')).toHaveLength(8);
    expect(controller.repository.listPresets('safe-form')[0].name).toBe('Preset 9');

    nameInput.value = 'Delete me';
    saveButton.click();
    presetSelect.value = 'Delete me';
    presetSelect.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    deleteButton.click();
    expect(controller.repository.listPresets('safe-form').some(item => item.name === 'Delete me')).toBe(false);

    controller.disconnect();
    dom.window.close();
  });

  test('fails closed for malformed, oversized, and unavailable storage', () => {
    const dom = new JSDOM('', { url: 'http://localhost/' });
    const key = 'sneup.formDraft.v1:workspace-a:safe-form';
    const repository = createRepository({
      sessionStorage: dom.window.sessionStorage,
      localStorage: dom.window.localStorage,
      getScope: () => 'workspace-a'
    });

    dom.window.sessionStorage.setItem(key, '{bad json');
    expect(repository.loadDraft('safe-form')).toBeNull();
    expect(repository.saveDraft('safe-form', { title: 'x'.repeat(13000) })).toBe(false);
    expect(createRepository().saveDraft('safe-form', { title: 'No storage' })).toBe(false);
    expect(createRepository().loadDraft('safe-form')).toBeNull();

    dom.window.localStorage.setItem('sneup.formPresets.v1:workspace-a:safe-form', JSON.stringify({
      version: 1,
      items: [{ name: `  ${'x'.repeat(100)}  `, values: { title: [[['nested']]] } }]
    }));
    expect(repository.listPresets('safe-form')[0].name).toHaveLength(40);
    expect(() => repository.listPresets('safe-form')).not.toThrow();
    dom.window.close();
  });
});

describe('form persistence integration boundaries', () => {
  const appSource = fs.readFileSync(path.join(__dirname, '..', 'public', 'app.js'), 'utf8');
  const htmlSource = fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html'), 'utf8');

  test('loads persistence before the application and wires approved operational forms', () => {
    expect(htmlSource.indexOf('/formPersistence.js')).toBeGreaterThan(-1);
    expect(htmlSource.indexOf('/formPersistence.js')).toBeLessThan(htmlSource.indexOf('/app.js'));
    expect(appSource).toContain('id="forecastScenarioForm" data-draft-key=');
    expect(appSource).toContain('id="capacityProfileForm" data-draft-key=');
    expect(appSource).toContain('id="retentionPolicyForm" data-draft-key=');
    expect(appSource).toContain('id="featureFlagForm" class="notice-stack" data-draft-key=');
    expect(appSource).toContain('id="policyRuleForm" class="notice-stack" data-draft-key=');
    expect(appSource).toContain('formPersistence?.markSaved(form)');
  });

  test('initializes through its browser script boundary', () => {
    const dom = new JSDOM('<form data-draft-key="browser" data-draft-fields="title"><input name="title"></form>', {
      runScripts: 'outside-only',
      url: 'http://localhost/'
    });

    expect(() => dom.window.eval(fs.readFileSync(path.join(__dirname, '..', 'public', 'formPersistence.js'), 'utf8'))).not.toThrow();
    expect(dom.window.SneupFormPersistence.init({ getScope: () => 'browser-workspace' })).not.toBeNull();
    expect(dom.window.document.querySelector('[data-form-persistence]')).not.toBeNull();
    dom.window.close();
  });

  test.each([
    'credentialForm',
    'retentionApplyForm',
    'notificationPolicyForm',
    'activateNotificationPolicyForm',
    'notificationTestForm',
    'trelloActionReconciliationForm',
    'acceptWorkspaceInviteForm'
  ])('does not persist sensitive or consequential form %s', (formId) => {
    const formStart = appSource.indexOf(`id="${formId}"`);
    expect(formStart).toBeGreaterThan(-1);
    expect(appSource.slice(formStart, appSource.indexOf('>', formStart))).not.toContain('data-draft-key');
  });
});
