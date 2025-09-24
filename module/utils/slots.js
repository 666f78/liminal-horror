import { SLOT_TYPES } from '../data/constants.js';
import { t } from '../utils/i18n.js';
import { createChatMessage } from '../utils/chat.js';

function slotSizeOf(it) {
  const n = Number(it.system?.slotSize);
  return Number.isFinite(n) ? Math.max(0, n) : 1;
}

export async function recalcSlots(actor) {
  if (!actor) return;
  const sys = actor.system ?? {};
  const items = actor.items?.contents ?? [];
  let used = 0;
  for (const it of items) {
    if (!SLOT_TYPES.has(it.type)) continue;
    if (it.system?.ignoreSlots === true) continue;
    used += slotSizeOf(it);
  }

  if (Number(sys.inventory?.slotsUsed ?? -1) !== used)
    await actor.update({ 'system.inventory.slotsUsed': used }, { diff: false });

  const max = Number(sys.inventory?.slotsMax ?? 10);
  if (used > max && Number(sys.defense?.hp ?? 0) !== 0) {
    await actor.update({ 'system.defense.hp': 0 }, { diff: false });
    await actor.update({ 'system.status.deprived': true }, { diff: false });

    await createChatMessage({ actor, content: t('LH.core.slotsCapacityExceeded') });
  }
}

export function attachSlotHooks() {
  Hooks.on('createItem', (item) => {
    if (!(item?.parent instanceof Actor)) return;
    if (game?.liminalhorror?.api?.recalcSlots) game.liminalhorror.api.recalcSlots(item.parent);
    if (item.type === 'armor' && game?.liminalhorror?.api?.recalcArmor) {
      game.liminalhorror.api.recalcArmor(item.parent);
    }
  });

  Hooks.on('updateItem', (item, changes) => {
    if (!(item?.parent instanceof Actor)) return;
    if (game?.liminalhorror?.api?.recalcSlots) game.liminalhorror.api.recalcSlots(item.parent);

    const touchedArmor =
      item.type === 'armor' || changes?.system?.equipped !== undefined || changes?.system?.armorValue !== undefined;

    if (touchedArmor && game?.liminalhorror?.api?.recalcArmor) {
      game.liminalhorror.api.recalcArmor(item.parent);
    }
  });

  Hooks.on('deleteItem', (item) => {
    if (!(item?.parent instanceof Actor)) return;
    if (game?.liminalhorror?.api?.recalcSlots) game.liminalhorror.api.recalcSlots(item.parent);
    if (game?.liminalhorror?.api?.recalcArmor) game.liminalhorror.api.recalcArmor(item.parent);
  });
}
