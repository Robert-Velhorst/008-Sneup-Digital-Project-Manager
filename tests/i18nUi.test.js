const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const { createRuntime } = require('../public/i18n');
const { HELP_TOPICS, createController } = require('../public/helpCenter');

const rootDir = path.join(__dirname, '..');
const htmlSource = fs.readFileSync(path.join(rootDir, 'public', 'index.html'), 'utf8');
const appSource = fs.readFileSync(path.join(rootDir, 'public', 'app.js'), 'utf8');

const createStorage = (initial = {}) => {
  const values = new Map(Object.entries(initial));
  return {
    getItem: jest.fn(key => values.get(key) || null),
    setItem: jest.fn((key, value) => values.set(key, value)),
    value: key => values.get(key)
  };
};

describe('English and Dutch operator localization', () => {
  test('uses a persisted locale before browser preference and stores only the normalized locale', () => {
    const storage = createStorage({ 'sneup.locale.v1': 'en' });
    const runtime = createRuntime({ root: null, storage, language: 'nl-NL' });
    expect(runtime.getLocale()).toBe('en');

    expect(runtime.setLocale('nl-BE', { notify: false })).toBe('nl');
    expect(storage.value('sneup.locale.v1')).toBe('nl');
    expect(runtime.setLocale('unsupported', { notify: false })).toBe('en');
    expect(storage.value('sneup.locale.v1')).toBe('en');
  });

  test('translates and restores the complete static shell without changing language names', () => {
    const dom = new JSDOM(htmlSource, { url: 'http://localhost/' });
    const storage = createStorage({ 'sneup.locale.v1': 'nl' });
    const runtime = createRuntime({ root: dom.window, storage });
    runtime.applyStatic(dom.window.document);

    const document = dom.window.document;
    expect(document.documentElement.lang).toBe('nl');
    expect(document.title).toBe('Sneup Commandocentrum');
    expect(document.querySelector('[data-view-button="overview"]').childNodes[0].nodeValue.trim()).toBe('Overzicht');
    expect(document.querySelector('.nav').getAttribute('aria-label')).toBe('Hoofdnavigatie');
    expect(document.getElementById('commandPaletteSearch').placeholder).toBe('Zoek een werkruimteweergave of actie');
    expect(document.getElementById('languageSelect').getAttribute('aria-label')).toBe('Taal');
    expect([...document.getElementById('languageSelect').options].map(option => option.textContent)).toEqual(['English', 'Nederlands']);

    runtime.setLocale('en', { document, notify: false });
    expect(document.documentElement.lang).toBe('en');
    expect(document.title).toBe('Sneup Command Center');
    expect(document.querySelector('[data-view-button="overview"]').childNodes[0].nodeValue.trim()).toBe('Overview');
    expect(document.getElementById('languageSelect').getAttribute('aria-label')).toBe('Language');
    dom.window.close();
  });

  test('keeps every initial operator phrase translated or explicitly language-neutral', () => {
    const dom = new JSDOM(htmlSource, { url: 'http://localhost/' });
    const runtime = createRuntime({ root: null, storage: createStorage(), language: 'nl' });
    const document = dom.window.document;
    const values = [];
    const walker = document.createTreeWalker(document.body, 4);
    let node = walker.nextNode();
    while (node) {
      if (node.nodeValue.trim() && !node.parentElement?.closest('[data-i18n-ignore]')) values.push(node.nodeValue.trim());
      node = walker.nextNode();
    }
    for (const element of document.querySelectorAll('body *')) {
      if (element.closest('[data-i18n-ignore]')) continue;
      for (const attribute of ['aria-label', 'placeholder', 'title']) {
        if (element.hasAttribute(attribute)) values.push(element.getAttribute(attribute));
      }
    }
    const neutral = new Set(['0', '1', '4', '?', 'Sneup', 'Robert', 'VA', 'P0', 'P1', 'P2', 'P3']);
    const missing = [...new Set(values)].filter(value => !neutral.has(value) && !runtime.hasTranslation(value));
    expect(missing).toEqual([]);
    dom.window.close();
  });

  test('covers every help topic and searches the localized catalog', () => {
    const dom = new JSDOM(htmlSource, { url: 'http://localhost/' });
    const i18n = createRuntime({ root: dom.window, storage: createStorage({ 'sneup.locale.v1': 'nl' }) });
    const phrases = HELP_TOPICS.flatMap(topic => [
      topic.title,
      topic.category,
      topic.summary,
      ...topic.steps,
      ...topic.notes,
      topic.action.label
    ]);
    expect(phrases.filter(phrase => !i18n.hasTranslation(phrase))).toEqual([]);

    const controller = createController({
      document: dom.window.document,
      i18n,
      getContext: () => 'approvals',
      requestAnimationFrame: callback => callback()
    });
    controller.open();
    expect(dom.window.document.querySelector('#helpTopicContent h2').textContent).toBe('Goedkeuringen en logboek');
    const search = dom.window.document.getElementById('helpSearch');
    search.value = 'capaciteitsaannames';
    search.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    expect([...dom.window.document.querySelectorAll('[data-help-topic]')].map(node => node.dataset.helpTopic)).toEqual(['forecasts']);
    expect(dom.window.document.getElementById('helpResultCount').textContent).toBe('1 onderwerp');
    controller.destroy();
    dom.window.close();
  });

  test('does not mutate provider or user evidence added after the static shell pass', () => {
    const dom = new JSDOM(htmlSource, { url: 'http://localhost/' });
    const i18n = createRuntime({ root: dom.window, storage: createStorage({ 'sneup.locale.v1': 'nl' }) });
    i18n.applyStatic(dom.window.document);
    const evidence = dom.window.document.createElement('p');
    evidence.textContent = 'Overview';
    dom.window.document.getElementById('boards').appendChild(evidence);

    expect(evidence.textContent).toBe('Overview');
    expect(i18n.t('Overview')).toBe('Overzicht');
    dom.window.close();
  });

  test('formats Dutch values locally and wires the runtime before generated UI modules', () => {
    const i18n = createRuntime({ root: null, storage: createStorage(), language: 'nl-NL' });
    expect(i18n.plural('{count} board', '{count} boards', 2)).toBe('2 borden');
    expect(i18n.formatNumber(1234.5)).toMatch(/1[.\s]234,5/);
    expect(htmlSource.indexOf('/i18n.js')).toBeGreaterThan(-1);
    expect(htmlSource.indexOf('/i18n.js')).toBeLessThan(htmlSource.indexOf('/helpCenter.js'));
    expect(htmlSource.indexOf('/i18n.js')).toBeLessThan(htmlSource.indexOf('/app.js'));
    expect(appSource).toContain("const t = (message, params) => i18n.t(message, params);");
    expect(appSource).toContain("i18n.setLocale(event.target.value, { notify: false });");
    expect(appSource).toContain("et('Read-only demo preview')");
  });

  test('registers demand-loaded Dutch catalogs without accepting prototype keys', () => {
    const i18n = createRuntime({ root: null, storage: createStorage(), language: 'nl' });
    const additions = Object.create(null);
    additions['Lazy operator phrase'] = 'Lui geladen beheerderstekst';
    additions.__proto__ = 'blocked';
    additions.constructor = 'blocked';

    expect(i18n.registerMessages('nl', additions)).toBe(1);
    expect(i18n.t('Lazy operator phrase')).toBe('Lui geladen beheerderstekst');
    expect(i18n.hasTranslation('__proto__')).toBe(false);
    expect(i18n.registerMessages('en', { Hello: 'Hallo' })).toBe(0);
  });
});
