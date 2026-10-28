import { WEAPON_HANDS } from '../data/constants.js';
import { getCatalogItemIcon } from './item-icons.js';

const DEFAULTS = {
  armor: { armorValue: 0, stressProtection: 0, equipped: false, price: 0 },
  weapon: { damageDie: '1d6', equipped: false, hand: WEAPON_HANDS.MAIN, price: 0 },
  gear: { price: 0, usesMax: 0, usesCurrent: 0 },
  condition: {},
};

export function prepareCatalogItem(item) {
  const defaults = DEFAULTS[item.type];
  if (!defaults) throw new Error(`Unsupported catalog item type: ${item.type}`);
  const system = { slotSize: 1, ignoreSlots: false, description: '', ...defaults, ...item.system };
  if (item.type === 'weapon') system.twoHanded = system.slotSize >= 2;
  return { ...item, img: item.img ?? getCatalogItemIcon(item.name), system };
}
