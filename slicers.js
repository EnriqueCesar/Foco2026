(function () {
  const enhanced = new Map();

  function normalize(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  function closeAll(except) {
    enhanced.forEach(instance => {
      if (instance !== except) instance.close();
    });
  }

  function createSlicer(select) {
    if (!select || enhanced.has(select.id)) return enhanced.get(select.id);

    const shell = document.createElement('div');
    shell.className = 'slicer';
    shell.dataset.for = select.id;

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'slicerTrigger';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.innerHTML = '<span class="slicerValue"></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg>';

    const panel = document.createElement('div');
    panel.className = 'slicerPanel';
    panel.hidden = true;
    panel.innerHTML = `
      <div class="slicerSearch">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input type="search" autocomplete="off" placeholder="Buscar..." aria-label="Buscar opción">
      </div>
      <div class="slicerActions">
        <button type="button" data-action="all">Seleccionar todo</button>
        <button type="button" data-action="clear">Limpiar selección</button>
      </div>
      <div class="slicerOptions" role="listbox" tabindex="-1"></div>`;

    select.classList.add('nativeSlicer');
    select.insertAdjacentElement('afterend', shell);
    shell.append(trigger, panel);

    const valueEl = trigger.querySelector('.slicerValue');
    const search = panel.querySelector('input');
    const optionsEl = panel.querySelector('.slicerOptions');
    const storageKey = `foco2026-filter-${select.id}`;

    function options() {
      return Array.from(select.options);
    }

    function selectedOption() {
      return select.options[select.selectedIndex] || options()[0];
    }

    function updateValue() {
      const current = selectedOption();
      valueEl.textContent = current ? current.textContent : 'Seleccionar';
      valueEl.title = current ? current.textContent : '';
      optionsEl.querySelectorAll('.slicerOption').forEach(btn => {
        const active = btn.dataset.value === select.value;
        btn.classList.toggle('selected', active);
        btn.setAttribute('aria-selected', active ? 'true' : 'false');
      });
    }

    function choose(value, dispatch = true) {
      const exists = options().some(option => option.value === value);
      if (!exists) return;
      select.value = value;
      localStorage.setItem(storageKey, value);
      updateValue();
      if (dispatch) select.dispatchEvent(new Event('change', { bubbles: true }));
      close();
    }

    function renderOptions(query = '') {
      const term = normalize(query);
      const list = options()
        .slice()
        .sort((a, b) => a.textContent.localeCompare(b.textContent, 'es', { sensitivity: 'base' }))
        .filter(option => normalize(option.textContent).includes(term));

      optionsEl.innerHTML = '';
      list.forEach(option => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'slicerOption';
        button.dataset.value = option.value;
        button.setAttribute('role', 'option');
        button.innerHTML = `<span class="checkMark"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg></span><span>${escapeHtml(option.textContent)}</span>`;
        button.addEventListener('click', () => choose(option.value));
        optionsEl.appendChild(button);
      });
      updateValue();
    }

    function open() {
      closeAll(instance);
      panel.hidden = false;
      shell.classList.add('open');
      trigger.setAttribute('aria-expanded', 'true');
      renderOptions(search.value);
      requestAnimationFrame(() => search.focus());
    }

    function close() {
      panel.hidden = true;
      shell.classList.remove('open');
      trigger.setAttribute('aria-expanded', 'false');
    }

    trigger.addEventListener('click', () => panel.hidden ? open() : close());
    search.addEventListener('input', () => renderOptions(search.value));
    panel.querySelector('[data-action="all"]').addEventListener('click', () => {
      const first = options()[0];
      if (first) choose(first.value);
    });
    panel.querySelector('[data-action="clear"]').addEventListener('click', () => {
      search.value = '';
      renderOptions();
      const first = options()[0];
      if (first) choose(first.value);
    });
    select.addEventListener('change', updateValue);
    shell.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        close();
        trigger.focus();
      }
    });

    const saved = localStorage.getItem(storageKey);
    if (saved && options().some(option => option.value === saved)) select.value = saved;

    const instance = { select, shell, renderOptions, updateValue, open, close };
    enhanced.set(select.id, instance);
    renderOptions();
    return instance;
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[character]));
  }

  window.initExecutiveSlicers = function () {
    ['region', 'dm', 'store'].forEach(id => createSlicer(document.getElementById(id)));
  };

  document.addEventListener('click', event => {
    if (!event.target.closest('.slicer')) closeAll();
  });
})();
