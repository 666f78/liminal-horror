import { renderCard, renderResultRollCard } from '../utils/chat-card.js';
import { createChatMessage, sendRollMessage } from '../utils/chat.js';
import { t, td } from '../utils/i18n.js';
import {
  getOffHandMinimumDie,
  isAutoArmorCalculationSettingEnabled,
  isOffHandDieReductionEnabled,
} from '../settings.js';
import { WEAPON_DIE_SIZES, WEAPON_HANDS } from '../data/constants.js';

function reduceOffHandFormula(formula) {
  if (!isOffHandDieReductionEnabled()) return formula;

  const roll = new Roll(formula);
  const { Die, NumericTerm, OperatorTerm } = foundry.dice.terms;
  const dice = roll.terms.filter((term) => term instanceof Die);
  const supported = roll.terms.every(
    (term) => term instanceof Die || term instanceof NumericTerm || term instanceof OperatorTerm
  );
  if (!supported || !dice.length || dice.some((die) => !WEAPON_DIE_SIZES.includes(die.faces))) {
    throw new Error(td('LH.equipment.unsupportedOffHandFormula', { formula }));
  }
  const minimumDie = getOffHandMinimumDie();
  for (const die of dice) {
    const index = WEAPON_DIE_SIZES.indexOf(die.faces);
    const reducedFaces = WEAPON_DIE_SIZES[Math.max(0, index - 1)];
    die.faces = Math.min(die.faces, Math.max(minimumDie, reducedFaces));
  }
  return roll.formula;
}

export function getWeaponHand(item) {
  return item.system?.twoHanded ? WEAPON_HANDS.MAIN : (item.system?.hand ?? WEAPON_HANDS.MAIN);
}

function getEquipmentIcon(item) {
  if (item.type === 'armor') return 'fa-shield-alt';
  if (item.type === 'spell') return 'fa-wand-magic-sparkles';
  if (item.system?.twoHanded) return ['fa-hand-fist', 'fa-hand'];
  return getWeaponHand(item) === WEAPON_HANDS.OFF ? 'fa-hand' : 'fa-hand-fist';
}

function sendEquipmentMessage(item, actor, equipped) {
  return createChatMessage({
    actor,
    content: renderCard(
      equipped ? t('LH.core.equipped') : t('LH.core.unequipped'),
      [foundry.utils.escapeHTML(item.name)],
      { tone: equipped ? 'equipped' : 'unequipped', icon: getEquipmentIcon(item) }
    ),
  });
}

export function getItemAttack(item, actor = item.parent) {
  if (!item.system?.equipped) throw new Error(t('LH.equipment.equipToAttack'));

  let weapons = [item];
  if (item.type === 'weapon' && actor?.items?.has(item.id)) {
    weapons = actor.items.filter((weapon) => weapon.type === 'weapon' && weapon.system?.equipped);
    if (
      weapons.length > 2 ||
      (weapons.length === 2 &&
        (weapons.some((weapon) => weapon.system.twoHanded) || getWeaponHand(weapons[0]) === getWeaponHand(weapons[1])))
    ) {
      throw new Error(t('LH.equipment.conflictingWeapons'));
    }
    weapons.sort(
      (a, b) => Number(getWeaponHand(a) === WEAPON_HANDS.OFF) - Number(getWeaponHand(b) === WEAPON_HANDS.OFF)
    );
  }

  const formulas = weapons.map((weapon) => {
    const formula = weapon.system?.damageDie?.trim();
    if (!formula) throw new Error(t('LH.ui.noDamageDie'));
    return weapons.length === 2 && getWeaponHand(weapon) === WEAPON_HANDS.OFF ? reduceOffHandFormula(formula) : formula;
  });
  return {
    weapons,
    formulas,
    formula: formulas.length === 2 ? `{${formulas.join(', ')}}kh1` : formulas[0],
  };
}

export async function updateWeaponEquipment(item, changes, options = {}) {
  const actor = item.parent;
  const system = foundry.utils.mergeObject(item.system.toObject(), changes.system ?? {}, { inplace: false });
  if (system.twoHanded) system.hand = WEAPON_HANDS.MAIN;
  const update = { ...changes, system };

  if (!actor?.items?.has(item.id)) return item.update(update, options);

  const updates = [];
  if (system.equipped) {
    for (const other of actor.items) {
      if (other.id === item.id || other.type !== 'weapon' || !other.system?.equipped) continue;
      if (system.twoHanded || other.system.twoHanded || getWeaponHand(other) === system.hand) {
        updates.push({ _id: other.id, 'system.equipped': false });
      }
    }
  }
  updates.push({ ...update, _id: item.id });
  const updated = await actor.updateEmbeddedDocuments('Item', updates, options);
  for (const weapon of updated) {
    if (weapon.id !== item.id && !weapon.system.equipped) {
      await sendEquipmentMessage(weapon, actor, false);
    }
  }
  return updated.find((document) => document.id === item.id);
}

export function isAutoArmorCalculationEnabled() {
  return isAutoArmorCalculationSettingEnabled();
}

export async function equipItem(item, actor, hand) {
  const type = item?.type;
  if (type !== 'armor' && type !== 'weapon' && type !== 'spell') return;

  actor = actor ?? item.parent;
  const isEquipped = !!item.system?.equipped;
  const targetHand = item.system?.twoHanded ? WEAPON_HANDS.MAIN : (hand ?? getWeaponHand(item));
  const willEquip = !isEquipped || (type === 'weapon' && targetHand !== getWeaponHand(item));

  const updated =
    type === 'weapon'
      ? await updateWeaponEquipment(item, { system: { equipped: willEquip, hand: targetHand } })
      : await item.update({ 'system.equipped': willEquip });
  if (!updated) return;

  if (type === 'armor') {
    await recalcArmor(actor);
  }

  await sendEquipmentMessage(item, actor, willEquip);
}

export async function useItem(item, actor) {
  if (!item) throw new Error('Item is required');
  actor = actor ?? item.parent;

  if (item.type === 'weapon' || item.type === 'spell') {
    let attack;
    try {
      attack = getItemAttack(item, actor);
    } catch (error) {
      ui.notifications.warn(error.message);
      return;
    }
    const roll = await new Roll(attack.formula).evaluate();
    const dualWielding = attack.weapons.length === 2;
    await sendRollMessage(roll, {
      actor,
      content: await renderResultRollCard({
        title: t(dualWielding ? 'LH.equipment.dualWielding' : item.type === 'spell' ? 'LH.msg.spell' : 'LH.msg.weapon'),
        roll,
        rollTemplate: dualWielding ? 'systems/liminal-horror/templates/chat/dual-wielding-roll.hbs' : undefined,
        outcome: attack.weapons.map((weapon) => weapon.name).join(' + '),
        outcomeType: item.type === 'weapon' ? 'damage' : 'neutral',
        icon: item.type === 'spell' ? 'fa-wand-magic-sparkles' : 'fa-crosshairs',
      }),
    });
    return;
  }

  if (item.type === 'gear') {
    const current = Number(item.system?.usesCurrent ?? 0);
    if (current <= 0) return;

    const nextCurrent = Math.max(0, current - 1);
    await item.update({ 'system.usesCurrent': nextCurrent });
    await createChatMessage({
      actor: actor ?? item.parent,
      content: renderCard(t('LH.core.used'), [foundry.utils.escapeHTML(item.name)], { icon: 'fa-box-open' }),
    });
  }
}

export async function restoreItemUse(item, actor) {
  if (!item) throw new Error('Item is required');
  if (item.type !== 'gear') return;

  const current = Number(item.system?.usesCurrent ?? 0);
  const max = Number(item.system?.usesMax ?? 0);
  if (max <= 0 || current >= max) return;

  const nextCurrent = Math.min(max, current + 1);
  await item.update({ 'system.usesCurrent': nextCurrent });
  await createChatMessage({
    actor: actor ?? item.parent,
    content: renderCard(t('LH.core.restored'), [foundry.utils.escapeHTML(item.name)], {
      tone: 'good',
      icon: 'fa-rotate-left',
    }),
  });
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
