(function attachFormPersistence(root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.SneupFormPersistence = api;
})(typeof window === 'object' ? window : null, function createFormPersistenceModule(root) {
  const VERSION = 1;
  const DRAFT_PREFIX = 'sneup.formDraft.v1';
  const PRESET_PREFIX = 'sneup.formPresets.v1';
  const MAX_FIELDS = 32;
  const MAX_VALUE_CHARS = 2000;
  const MAX_RECORD_CHARS = 12000;
  const MAX_PRESETS = 8;
  const MAX_PRESET_NAME_CHARS = 40;
  const SAFE_NAME = /^[a-zA-Z0-9_.:-]{1,80}$/;
  const SENSITIVE_NAME = /(password|secret|token|credential|api.?key|auth|recipient|destination|webhook|email|confirmation|confirm|evidence|response|comment|message)/i;

  const parseFieldNames = value => [...new Set(String(value || '')
    .split(',')
    .map(item => item.trim())
    .filter(item => SAFE_NAME.test(item) && !SENSITIVE_NAME.test(item)))]
    .slice(0, MAX_FIELDS);

  const normalizeSegment = value => String(value || 'default')
    .trim()
    .replace(/[^a-zA-Z0-9_.:-]/g, '_')
    .slice(0, 120) || 'default';

  const boundedValue = value => {
    if (Array.isArray(value)) return value.slice(0, MAX_FIELDS).map(item => (
      item === null || ['string', 'number', 'boolean'].includes(typeof item)
        ? String(item ?? '').slice(0, MAX_VALUE_CHARS)
        : ''
    ));
    if (typeof value === 'boolean') return value;
    return String(value ?? '').slice(0, MAX_VALUE_CHARS);
  };

  const controlsFor = (form, name) => {
    const item = form?.elements?.namedItem?.(name);
    if (!item) return [];
    if (!item.tagName && typeof item.length === 'number') return Array.from(item);
    return [item];
  };

  const readField = (form, name) => {
    const controls = controlsFor(form, name);
    if (!controls.length) return undefined;
    const first = controls[0];
    if (controls.length > 1 && controls.every(control => control.type === 'radio')) {
      return boundedValue(controls.find(control => control.checked)?.value || '');
    }
    if (controls.length > 1 && controls.every(control => control.type === 'checkbox')) {
      return controls.filter(control => control.checked).map(control => boundedValue(control.value));
    }
    if (first.type === 'checkbox') return Boolean(first.checked);
    if (first.type === 'radio') return first.checked ? boundedValue(first.value) : '';
    if (first.multiple && first.options) {
      return Array.from(first.options).filter(option => option.selected).map(option => boundedValue(option.value));
    }
    return boundedValue(first.value);
  };

  const captureFormValues = (form, fieldNames) => Object.fromEntries(
    parseFieldNames(fieldNames).map(name => [name, readField(form, name)]).filter(([, value]) => value !== undefined)
  );

  const setField = (form, name, value) => {
    const controls = controlsFor(form, name);
    if (!controls.length) return false;
    const first = controls[0];
    if (controls.length > 1 && controls.every(control => control.type === 'radio')) {
      controls.forEach(control => { control.checked = String(control.value) === String(value); });
      return true;
    }
    if (controls.length > 1 && controls.every(control => control.type === 'checkbox')) {
      const selected = new Set(Array.isArray(value) ? value.map(String) : []);
      controls.forEach(control => { control.checked = selected.has(String(control.value)); });
      return true;
    }
    if (first.type === 'checkbox') {
      first.checked = value === true;
      return true;
    }
    if (first.multiple && first.options) {
      const selected = new Set(Array.isArray(value) ? value.map(String) : []);
      Array.from(first.options).forEach(option => { option.selected = selected.has(String(option.value)); });
      return true;
    }
    first.value = boundedValue(value);
    return true;
  };

  const applyFormValues = (form, values, fieldNames) => {
    const allowed = new Set(parseFieldNames(fieldNames));
    return Object.entries(values && typeof values === 'object' ? values : {}).reduce((count, [name, value]) => {
      if (!allowed.has(name)) return count;
      return count + (setField(form, name, value) ? 1 : 0);
    }, 0);
  };

  const readJson = (storage, key, fallback) => {
    try {
      const raw = storage?.getItem(key);
      if (!raw || raw.length > MAX_RECORD_CHARS) return fallback;
      return JSON.parse(raw);
    } catch (_error) {
      return fallback;
    }
  };

  const writeJson = (storage, key, value) => {
    try {
      const serialized = JSON.stringify(value);
      if (serialized.length > MAX_RECORD_CHARS) return false;
      storage?.setItem(key, serialized);
      return Boolean(storage);
    } catch (_error) {
      return false;
    }
  };

  const removeItem = (storage, key) => {
    try {
      storage?.removeItem(key);
      return Boolean(storage);
    } catch (_error) {
      return false;
    }
  };

  const createRepository = ({ sessionStorage, localStorage, getScope = () => 'default', now = () => new Date() } = {}) => {
    const keyFor = (prefix, formKey, scope = getScope()) => `${prefix}:${normalizeSegment(scope)}:${normalizeSegment(formKey)}`;
    const draftKey = (formKey, scope) => keyFor(DRAFT_PREFIX, formKey, scope);
    const presetKey = (formKey, scope) => keyFor(PRESET_PREFIX, formKey, scope);
    const normalizeRecord = record => record?.version === VERSION && record.values && typeof record.values === 'object' ? record : null;
    const presetPayload = (formKey, scope) => {
      const payload = readJson(localStorage, presetKey(formKey, scope), { version: VERSION, items: [] });
      return payload?.version === VERSION && Array.isArray(payload.items) ? payload : { version: VERSION, items: [] };
    };

    return {
      loadDraft(formKey, scope) {
        return normalizeRecord(readJson(sessionStorage, draftKey(formKey, scope), null));
      },
      saveDraft(formKey, values, scope) {
        return writeJson(sessionStorage, draftKey(formKey, scope), {
          version: VERSION,
          updatedAt: now().toISOString(),
          values
        });
      },
      clearDraft(formKey, scope) {
        return removeItem(sessionStorage, draftKey(formKey, scope));
      },
      listPresets(formKey, scope) {
        return presetPayload(formKey, scope).items
          .filter(item => item && typeof item.name === 'string' && item.values && typeof item.values === 'object')
          .map(item => ({ ...item, name: item.name.trim().slice(0, MAX_PRESET_NAME_CHARS) }))
          .filter(item => item.name)
          .slice(0, MAX_PRESETS);
      },
      savePreset(formKey, name, values, scope) {
        const normalizedName = String(name || '').trim().slice(0, MAX_PRESET_NAME_CHARS);
        if (!normalizedName) return false;
        const existing = this.listPresets(formKey, scope).filter(item => item.name.toLowerCase() !== normalizedName.toLowerCase());
        return writeJson(localStorage, presetKey(formKey, scope), {
          version: VERSION,
          items: [{ name: normalizedName, updatedAt: now().toISOString(), values }, ...existing].slice(0, MAX_PRESETS)
        });
      },
      deletePreset(formKey, name, scope) {
        const items = this.listPresets(formKey, scope).filter(item => item.name !== name);
        return writeJson(localStorage, presetKey(formKey, scope), { version: VERSION, items });
      }
    };
  };

  const createButton = (document, text, className = 'button') => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.textContent = text;
    return button;
  };

  const dispatchFormEvent = (form, name) => {
    const EventConstructor = form?.ownerDocument?.defaultView?.Event || globalThis.Event;
    if (typeof EventConstructor === 'function') form.dispatchEvent(new EventConstructor(name));
  };

  const createController = ({
    document,
    MutationObserver,
    sessionStorage,
    localStorage,
    getScope,
    debounceMs = 300,
    setTimer = setTimeout,
    clearTimer = clearTimeout
  } = {}) => {
    if (!document) return null;
    const repository = createRepository({ sessionStorage, localStorage, getScope });
    const forms = new WeakMap();

    const enhanceForm = form => {
      if (!form || forms.has(form) || !form.dataset?.draftKey) return false;
      const formKey = form.dataset.draftKey;
      const scope = getScope?.() || 'default';
      const draftFields = parseFieldNames(form.dataset.draftFields);
      const templateFields = parseFieldNames(form.dataset.templateFields).filter(name => draftFields.includes(name));
      if (!draftFields.length) return false;

      const bar = document.createElement('div');
      bar.className = 'form-persistence';
      bar.dataset.formPersistence = '';
      bar.setAttribute('aria-label', 'Draft and preset controls');

      const draftGroup = document.createElement('div');
      draftGroup.className = 'form-persistence-draft';
      const status = document.createElement('span');
      status.className = 'form-persistence-status';
      status.setAttribute('aria-live', 'polite');
      const clearButton = createButton(document, 'Clear draft');
      clearButton.disabled = true;
      draftGroup.append(status, clearButton);
      bar.append(draftGroup);

      let presetSelect = null;
      let presetName = null;
      let deletePresetButton = null;

      const refreshPresets = selectedName => {
        if (!presetSelect) return;
        const items = repository.listPresets(formKey, scope);
        presetSelect.replaceChildren();
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Saved preset';
        presetSelect.append(placeholder);
        items.forEach(item => {
          const option = document.createElement('option');
          option.value = item.name;
          option.textContent = item.name;
          option.selected = item.name === selectedName;
          presetSelect.append(option);
        });
        deletePresetButton.disabled = !presetSelect.value;
      };

      if (templateFields.length) {
        const presetGroup = document.createElement('div');
        presetGroup.className = 'form-persistence-presets';
        presetSelect = document.createElement('select');
        presetSelect.setAttribute('aria-label', 'Saved preset');
        presetName = document.createElement('input');
        presetName.type = 'text';
        presetName.maxLength = MAX_PRESET_NAME_CHARS;
        presetName.placeholder = 'Preset name';
        presetName.setAttribute('aria-label', 'Preset name');
        const savePresetButton = createButton(document, 'Save preset');
        deletePresetButton = createButton(document, 'Delete preset');
        deletePresetButton.disabled = true;
        presetGroup.append(presetSelect, presetName, savePresetButton, deletePresetButton);
        bar.append(presetGroup);

        const savePreset = () => {
          const name = presetName.value.trim();
          if (!name) {
            status.textContent = 'Name the preset';
            presetName.focus();
            return;
          }
          const saved = repository.savePreset(formKey, name, captureFormValues(form, templateFields.join(',')), scope);
          status.textContent = saved ? 'Preset saved' : 'Preset unavailable';
          if (saved) refreshPresets(name);
        };

        savePresetButton.addEventListener('click', savePreset);
        presetName.addEventListener('keydown', event => {
          if (event.key !== 'Enter') return;
          event.preventDefault();
          savePreset();
        });
        presetSelect.addEventListener('change', () => {
          const selected = repository.listPresets(formKey, scope).find(item => item.name === presetSelect.value);
          deletePresetButton.disabled = !selected;
          if (!selected) return;
          applyFormValues(form, selected.values, templateFields.join(','));
          saveDraft();
          status.textContent = 'Preset applied';
          dispatchFormEvent(form, 'sneup:preset-applied');
        });
        deletePresetButton.addEventListener('click', () => {
          if (!presetSelect.value) return;
          const deleted = repository.deletePreset(formKey, presetSelect.value, scope);
          status.textContent = deleted ? 'Preset deleted' : 'Preset unavailable';
          if (deleted) refreshPresets();
        });
        refreshPresets();
      }

      const actions = form.querySelector('.modal-actions');
      if (actions?.parentNode) actions.parentNode.insertBefore(bar, actions);
      else form.append(bar);

      let timer = null;
      const saveDraft = () => {
        if (timer) clearTimer(timer);
        timer = null;
        const saved = repository.saveDraft(formKey, captureFormValues(form, draftFields.join(',')), scope);
        status.textContent = saved ? 'Draft saved' : 'Draft unavailable';
        clearButton.disabled = !saved;
        return saved;
      };
      const scheduleDraft = event => {
        if (!draftFields.includes(event.target?.name)) return;
        if (timer) clearTimer(timer);
        timer = setTimer(saveDraft, debounceMs);
      };
      form.addEventListener('input', scheduleDraft);
      form.addEventListener('change', scheduleDraft);
      clearButton.addEventListener('click', () => {
        if (timer) clearTimer(timer);
        timer = null;
        const cleared = repository.clearDraft(formKey, scope);
        status.textContent = cleared ? 'Draft cleared' : 'Draft unavailable';
        clearButton.disabled = cleared;
      });

      const draft = repository.loadDraft(formKey, scope);
      if (draft) {
        applyFormValues(form, draft.values, draftFields.join(','));
        status.textContent = 'Draft restored';
        clearButton.disabled = false;
        dispatchFormEvent(form, 'sneup:draft-restored');
      }

      forms.set(form, { formKey, scope, status, clearButton, get timer() { return timer; }, clearTimer: () => {
        if (timer) clearTimer(timer);
        timer = null;
      } });
      return true;
    };

    const enhanceWithin = node => {
      if (node?.matches?.('form[data-draft-key]')) enhanceForm(node);
      node?.querySelectorAll?.('form[data-draft-key]').forEach(enhanceForm);
    };
    enhanceWithin(document);
    const observer = MutationObserver ? new MutationObserver(records => {
      records.forEach(record => record.addedNodes.forEach(enhanceWithin));
    }) : null;
    observer?.observe(document.documentElement, { childList: true, subtree: true });

    return {
      enhanceForm,
      markSaved(form) {
        const metadata = forms.get(form);
        if (!metadata) return false;
        metadata.clearTimer();
        const cleared = repository.clearDraft(metadata.formKey, metadata.scope);
        metadata.status.textContent = cleared ? 'Saved' : 'Draft unavailable';
        metadata.clearButton.disabled = cleared;
        return cleared;
      },
      disconnect() {
        observer?.disconnect();
      },
      repository
    };
  };

  let defaultController = null;
  const init = options => {
    defaultController?.disconnect();
    defaultController = createController({
      document: root?.document,
      MutationObserver: root?.MutationObserver,
      sessionStorage: root?.sessionStorage,
      localStorage: root?.localStorage,
      ...options
    });
    return defaultController;
  };

  return {
    VERSION,
    applyFormValues,
    captureFormValues,
    createController,
    createRepository,
    init,
    markSaved(form) {
      return defaultController?.markSaved(form) || false;
    },
    parseFieldNames
  };
});
