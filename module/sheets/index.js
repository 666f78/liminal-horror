import { LHActorSheet } from './actor.sheet.js';
import { LHItemSheet } from './item.sheet.js';

export function registerSheets() {
  Actors.unregisterSheet('core', ActorSheet);
  Items.unregisterSheet('core', ItemSheet);
  Actors.registerSheet('liminal-horror', LHActorSheet, {
    types: ['investigator', 'npc', 'monster', 'vehicle'],
    makeDefault: true,
  });
  Items.registerSheet('liminal-horror', LHItemSheet, {
    types: ['weapon', 'gear', 'armor', 'artifact', 'injury', 'consequence', 'condition'],
    makeDefault: true,
  });
}
