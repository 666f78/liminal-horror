import { openSystemUpdateDialog } from './update-notice.js';

function resolveRoot(html) {
  if (html instanceof HTMLElement) return html;
  if (html?.[0] instanceof HTMLElement) return html[0];
  return null;
}

function findSystemTab(root) {
  if (!(root instanceof HTMLElement)) return null;
  return root.querySelector('.tab[data-tab="system"]') ?? root.querySelector('[data-tab="system"]');
}

function buildUpdateButton() {
  const wrapper = document.createElement('div');
  wrapper.className = 'form-group';
  wrapper.dataset.lhUpdateButton = 'true';
  wrapper.style.margin = '0 0 0.75rem';

  const label = document.createElement('label');
  label.textContent = 'Liminal Horror';

  const controls = document.createElement('div');
  controls.className = 'form-fields';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'lh-open-update-dialog';
  button.innerHTML = '<i class="fa-solid fa-scroll"></i> Open Update Dialog';
  button.addEventListener('click', async () => {
    await openSystemUpdateDialog({ includeChat: false });
  });

  controls.appendChild(button);
  wrapper.append(label, controls);
  return wrapper;
}

function onRenderSettingsConfig(_app, html) {
  if (!game.user.isGM) return;

  const root = resolveRoot(html);
  const systemTab = findSystemTab(root);
  if (!(systemTab instanceof HTMLElement)) return;
  if (systemTab.querySelector('[data-lh-update-button="true"]')) return;

  const anchor =
    systemTab.querySelector('.settings-list') ??
    systemTab.querySelector('form') ??
    systemTab.querySelector('.tab') ??
    systemTab;

  if (!(anchor instanceof HTMLElement)) return;
  anchor.prepend(buildUpdateButton());
}

export function registerSettingsConfigHook() {
  Hooks.on('renderSettingsConfig', onRenderSettingsConfig);
}
