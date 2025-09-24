import * as API from '../api/index.js';
import { registerDataModels } from '../data-models/index.js';
import { registerSystemSettings } from '../settings.js';
import { registerSheets } from '../sheets/index.js';
import { registerHandlebars } from '../utils/handlebars.js';
import { dError, dLog, withGroup } from '../utils/debug.js';

const exposeApi = () => {
  game.liminalhorror ??= {};
  game.liminalhorror.api = API;
};

const stageTasks = Object.freeze([
  { label: 'registerSystemSettings', run: registerSystemSettings },
  { label: 'registerDataModels', run: registerDataModels },
  { label: 'registerSheets', run: registerSheets },
  { label: 'exposeApi', run: exposeApi },
  { label: 'registerHandlebars', run: registerHandlebars },
]);

const executeStageTasks = () => {
  for (const { label, run } of stageTasks) {
    try {
      dLog(label);
      run();
    } catch (error) {
      dError(`[LH:init] ${label} failed`, error);
      throw error;
    }
  }
};

const announceReady = () => {
  try {
    ui.notifications?.info('Liminal Horror ready', { permanent: false });
  } catch (error) {
    dError('[LH:init] ready notification failed', error);
  }
};

export const registerInitHook = () => {
  Hooks.once('init', () => {
    withGroup('init', () => {
      try {
        CONFIG.debug = CONFIG.debug || {};
        executeStageTasks();
      } catch (error) {
        const message = 'Liminal Horror init error';
        console.error('[LH] init error', error);
        ui.notifications?.error(`${message}: ${error?.message ?? error}`);
      }
    });
  });

  Hooks.once('ready', () => {
    withGroup('ready', () => {
      announceReady();
    });
  });
};
