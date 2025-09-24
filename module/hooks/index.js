import { dLog, dWarn, withGroup } from '../utils/debug.js';
import { registerActorHooks } from './actors.js';
import { registerChatHooks } from './chat.js';
import { registerInitiativeHook } from './combat.js';
import { registerInitHook } from './init.js';
import { registerItemsHook } from './items.js';
import { registerSceneControlHooks } from './scene-controls.js';
import { registerSidebarHooks } from './sidebar.js';

const HOOK_REGISTRATIONS = Object.freeze([
  { name: 'init', register: registerInitHook },
  { name: 'actor', register: registerActorHooks },
  { name: 'sidebar', register: registerSidebarHooks },
  { name: 'chat', register: registerChatHooks },
  { name: 'scene-controls', register: registerSceneControlHooks },
  { name: 'initiative', register: registerInitiativeHook },
  { name: 'items', register: registerItemsHook },
]);

function runRegistrar({ name, register }) {
  dLog(`register ${name}`);
  try {
    const result = register();
    if (result && typeof result.then === 'function') {
      result.catch((error) => dWarn(`register ${name} error`, error));
    }
  } catch (error) {
    dWarn(`register ${name} error`, error);
  }
}

export const registerHooks = () => {
  withGroup('registerHooks', () => {
    HOOK_REGISTRATIONS.forEach(runRegistrar);
  });
};
