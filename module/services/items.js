import { createChatMessage, sendRollMessage } from '../utils/chat.js';
import { t } from '../utils/i18n.js';
import { isAutoArmorCalculationSettingEnabled } from '../settings.js';

export function isAutoArmorCalculationEnabled() {
  return isAutoArmorCalculationSettingEnabled();
}

export async function equipItem(item, actor) {
  const type = item?.type;
  if (type !== 'armor' && type !== 'weapon') return;

  actor = actor ?? item.parent;
  const isEquipped = !!item.system?.equipped;
  const willEquip = !isEquipped;

  if (willEquip && actor?.items && type === 'weapon') {
    const updates = actor.items
      .filter((i) => i.id !== item.id && i.type === type && i.system?.equipped)
      .map((i) => ({ _id: i.id, 'system.equipped': false }));

    if (updates.length) {
      await actor.updateEmbeddedDocuments('Item', updates);
    }
  }

  await item.update({ 'system.equipped': willEquip });

  if (type === 'armor') {
    await recalcArmor(actor);
  }

  await createChatMessage({
    actor,
    content: `<b>${willEquip ? t('LH.core.equipped') : t('LH.core.unequipped')}:</b> ${item.name}`,
  });
}

export async function useItem(item, actor) {
  if (!item) throw new Error('Item is required');

  if (item.type === 'weapon' || item.type === 'spell') {
    const die = item.system?.damageDie || '1d6';
    const roll = await new Roll(die).evaluate();
    await sendRollMessage(roll, {
      actor,
      flavor: `<b>${t(item.type === 'spell' ? 'LH.msg.spell' : 'LH.msg.weapon')}:</b> ${item.name}`,
    });
    return;
  }

  if (item.type === 'gear') {
    const current = item.system?.usesCurrent;
    if (!current || current <= 0) return;

    const newCurrent = current - 1;
    await item.update({ 'system.usesCurrent': newCurrent });
  }
}

export async function recalcArmor(actor) {
  if (!actor || !isAutoArmorCalculationEnabled()) return;

  let total = 0;
  for (const it of actor.items) {
    if (it.type !== 'armor' || !it.system?.equipped) continue;
    total += Number(it.system?.armorValue ?? 0) || 0;
  }

  await actor.update({ 'system.defenses.armor': total });
}
