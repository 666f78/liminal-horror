import { createItems } from '../content/create-items.js';
import { generateInvestigator } from '../content/random-investigator.js';
import { dLog, dWarn, withGroup } from '../utils/debug.js';

const ACTORS_TAB = 'actors';
const ITEMS_TAB = 'items';

const BUTTON_CONFIGS = [
  {
    tab: ACTORS_TAB,
    selector: '.lh-sidebar-investigator',
    markup: '<button class="lh-sidebar-investigator"><i class="fas fa-dice"></i> Roll Investigator Background</button>',
    onClick: generateInvestigator,
  },
  {
    tab: ITEMS_TAB,
    selector: '.lh-sidebar-items',
    markup: '<button class="lh-sidebar-items"><i class="fas fa-plus"></i> Create Default Items</button>',
    onClick: createItems,
  },
];

function appendButton(html, { selector, markup, onClick }) {
  if (html.find(selector).length) return;
  const button = $(markup);
  button.on('click', async () => {
    try {
      await onClick();
    } catch (error) {
      dWarn('sidebarHooks.button action error', error);
    }
  });
  html.find('.directory-footer').append(button);
}

function onRenderSidebarTab(app, html) {
  try {
    const config = BUTTON_CONFIGS.find((entry) => entry.tab === app.tabName);
    if (!config) return;
    appendButton(html, config);
  } catch (error) {
    dWarn('sidebarHooks.render error', error);
  }
}

export const registerSidebarHooks = () => {
  withGroup('sidebarHooks', () => {
    Hooks.on('renderSidebarTab', onRenderSidebarTab);
    dLog('sidebar buttons registered');
  });
};
