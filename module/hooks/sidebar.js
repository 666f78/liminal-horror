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

function onRenderSettings(_app, htmlElement) {
  const rootElement = resolveRootElement(htmlElement);
  const documentation = rootElement?.querySelector('section.documentation');
  if (!documentation || rootElement.querySelector('.lh-support-card')) return;

  const card = document.createElement('section');
  card.className = 'lh-support-card flexcol';

  const heading = document.createElement('h4');
  heading.textContent = 'SUPPORT SYSTEM DEVELOPMENT';

  const link = document.createElement('a');
  link.className = 'button bright lh-support-development';
  link.href = 'https://666f78.pp.ua/donate';
  link.target = '_blank';
  link.rel = 'noopener noreferrer';

  const icon = document.createElement('i');
  icon.className = 'fa-solid fa-heart';
  icon.setAttribute('inert', '');
  link.append(icon, ' Support Development');

  const description = document.createElement('p');
  description.textContent = 'Support ongoing development and improvements to this Foundry system.';

  const disclaimer = document.createElement('small');
  disclaimer.textContent = 'This is an unofficial Foundry VTT adaptation and is not affiliated with the creators of Liminal Horror.';

  const logo = document.createElement('img');
  logo.src = `systems/${game.system.id}/assets/img/logo.webp`;
  logo.alt = 'Liminal Horror logo';

  const header = document.createElement('div');
  header.className = 'lh-support-card-header';
  header.append(heading, logo);

  card.append(header, link, description, disclaimer);
  documentation.before(card);
}

export const registerSidebarHooks = () => {
  withGroup('sidebarHooks', () => {
    Hooks.on('renderDocumentDirectory', onRenderDocumentDirectory);
    Hooks.on('renderSettings', onRenderSettings);
    dLog('sidebar buttons registered');
  });
};
