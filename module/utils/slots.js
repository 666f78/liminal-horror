import { SLOT_TYPES } from '../data/constants.js';
import { t } from '../utils/i18n.js';
import { createChatMessage } from '../utils/chat.js';

const OVERFLOW_NOTIFIED = new Set();

function slotSizeOf(it) {
  const n = Number(it.system?.slotSize);
  return Number.isFinite(n) ? Math.max(0, n) : 1;
}

function getActorId(actor) {
  return actor?.id ?? actor?.uuid ?? actor?._id ?? null;
}

export async function recalcSlots(actor) {
  if (!actor) return;
  const actorId = getActorId(actor);
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
  const overCapacity = used > max;
  const hpBefore = Number(sys.defense?.hp ?? 0);
  const deprivedBefore = sys.status?.deprived === true;

  if (overCapacity) {
    const updates = {};
    if (hpBefore !== 0) updates['system.defense.hp'] = 0;
    if (!deprivedBefore) updates['system.status.deprived'] = true;

    const shouldNotify = hpBefore !== 0 && actorId && !OVERFLOW_NOTIFIED.has(actorId);
    if (shouldNotify) OVERFLOW_NOTIFIED.add(actorId);

    if (Object.keys(updates).length) await actor.update(updates, { diff: false });

    if (shouldNotify) {
      await createChatMessage({ actor, content: t('LH.core.slotsCapacityExceeded') });
    }
  } else if (actorId) {
    OVERFLOW_NOTIFIED.delete(actorId);
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
