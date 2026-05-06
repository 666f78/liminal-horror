import { createItems } from '../content/create-items.js';
import { generateActor, generateInvestigator } from '../content/random-investigator.js';
import { dLog, dWarn, withGroup } from '../utils/debug.js';

const BUTTON_CONFIGS = {
  actors: [
    {
      className: 'lh-sidebar-investigator',
      iconClass: 'fa-solid fa-dice',
      label: 'Roll Investigator Background',
      handler: generateInvestigator,
    },
    {
      className: 'lh-sidebar-generate-actor',
      iconClass: 'fa-solid fa-user-plus',
      label: 'Generate Actor',
      handler: generateActor,
    },
  ],
  items: {
    className: 'lh-sidebar-items',
    iconClass: 'fa-solid fa-plus',
    label: 'Create Default Items',
    handler: createItems,
  },
};

const resolveRootElement = (root) => {
  if (root instanceof HTMLElement) return root;
  if (root?.[0] instanceof HTMLElement) return root[0];
  return null;
};

const ensureFooter = (rootElement) => {
  rootElement = resolveRootElement(rootElement);
  if (!rootElement) return null;
  let footer = rootElement.querySelector('.directory-footer');
  if (!footer) {
    footer = document.createElement('footer');
    footer.classList.add('directory-footer');
    rootElement.appendChild(footer);
  }
  return footer;
};

const buildButton = ({ className, iconClass, label, handler }) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;

  if (iconClass) {
    const icon = document.createElement('i');
    icon.className = iconClass;
    button.append(icon, ' ');
  }

  button.append(label);

  let running = false;
  button.addEventListener('click', async () => {
    if (running) return;
    running = true;
    try {
      await handler();
    } catch (error) {
      dWarn('sidebarHooks.button action error', error);
      ui.notifications?.error(error?.message ?? 'Sidebar action failed');
    } finally {
      running = false;
    }
  });

  return button;
};

const addButton = (rootElement, config) => {
  rootElement = resolveRootElement(rootElement);
  if (!rootElement) return;
  if (rootElement.querySelector(`.${config.className}`)) return;

  const footer = ensureFooter(rootElement);
  if (!footer) return;

  const button = buildButton(config);
  footer.appendChild(button);
};

function onRenderDocumentDirectory(app, htmlElement) {
  try {
    const configs = BUTTON_CONFIGS[app.id];
    if (!configs) return;
    const list = Array.isArray(configs) ? configs : [configs];
    for (const config of list) addButton(htmlElement, config);
  } catch (error) {
    dWarn('sidebarHooks.render error', error);
  }
}

export const registerSidebarHooks = () => {
  withGroup('sidebarHooks', () => {
    Hooks.on('renderDocumentDirectory', onRenderDocumentDirectory);
    dLog('sidebar buttons registered');
  });
};
