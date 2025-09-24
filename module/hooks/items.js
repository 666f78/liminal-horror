import { MAX_SLOTS } from '../data/constants.js';
import { dLog, dWarn, withGroup } from '../utils/debug.js';

const INVESTIGATOR_TYPE = 'investigator';

const getSlotsUsed = (actor) => Number(actor.system?.inventory?.slotsUsed ?? 0);
const isDeprived = (actor) => Boolean(actor.system?.status?.deprived);
const getItemSlotSize = (item) => Number(item.system?.slotSize ?? 0);

async function maybeFlagDeprived(actor, nextSlots) {
  if (nextSlots <= MAX_SLOTS || isDeprived(actor)) return;
  dLog('itemsHook.deprived', actor.name, nextSlots);
  await actor.update({ 'system.status.deprived': true });
}

async function handleCreateItem(item) {
  try {
    const actor = item.parent;
    if (!(actor instanceof Actor) || actor.type !== INVESTIGATOR_TYPE) return;

    const currentSlots = getSlotsUsed(actor);
    const ignoreSlots = item.system?.ignoreSlots === true;
    const itemSize = ignoreSlots ? 0 : getItemSlotSize(item);
    const nextSlots = currentSlots + itemSize;

    await maybeFlagDeprived(actor, nextSlots);
  } catch (error) {
    dWarn('itemsHook.createItem error', error);
  }
}

export function registerItemsHook() {
  withGroup('itemsHook', () => {
    Hooks.on('createItem', handleCreateItem);
  });
}
