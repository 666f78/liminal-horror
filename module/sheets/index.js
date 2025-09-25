import { LHActorSheet } from './actor.sheet.js';
import { LHItemSheet } from './item.sheet.js';

const ACTOR_TYPES = Object.freeze(['investigator', 'npc', 'monster', 'vehicle']);
const ITEM_TYPES = Object.freeze(['weapon', 'gear', 'armor', 'artifact', 'injury', 'consequence', 'condition']);

export function registerSheets() {
  const { DocumentSheetConfig } = foundry.applications.apps;

  DocumentSheetConfig.unregisterSheet(foundry.documents.Actor, 'core', foundry.applications.sheets.ActorSheetV2);
  DocumentSheetConfig.unregisterSheet(foundry.documents.Item, 'core', foundry.applications.sheets.ItemSheetV2);

  DocumentSheetConfig.registerSheet(foundry.documents.Actor, 'liminal-horror', LHActorSheet, {
    types: ACTOR_TYPES,
    makeDefault: true,
    label: 'Liminal Horror Actor Sheet',
  });

  DocumentSheetConfig.registerSheet(foundry.documents.Item, 'liminal-horror', LHItemSheet, {
    types: ITEM_TYPES,
    makeDefault: true,
    label: 'Liminal Horror Item Sheet',
  });
}
