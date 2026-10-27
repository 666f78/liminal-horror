import * as API from '../api/index.js';
import { registerDataModels } from '../data-models/index.js';
import { registerSystemSettings } from '../settings.js';
import { registerSheets } from '../sheets/index.js';
import { registerHandlebars } from '../utils/handlebars.js';
import { dError, dLog, withGroup } from '../utils/debug.js';
import { t } from '../utils/i18n.js';
import { showSystemUpdateNotice } from './update-notice.js';

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

export const registerInitHook = () => {
  Hooks.once('init', () => {
    withGroup('init', () => {
      try {
        CONFIG.debug = CONFIG.debug || {};
        executeStageTasks();
      } catch (error) {
        const message = t('LH.system.initError');
        console.error('[LH] init error', error);
        ui.notifications?.error(`${message}: ${error?.message ?? error}`);
      }
    });
  });

  Hooks.once('ready', () => {
    withGroup('ready', () => {
      showSystemUpdateNotice().catch((error) => {
        dError('[LH:ready] update notice failed', error);
      });
    });
  });
};
