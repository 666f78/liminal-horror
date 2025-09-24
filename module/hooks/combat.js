import { sendRollMessage } from '../utils/chat.js';

const INITIATIVE_CONFIG = Object.freeze({ formula: '1d20', decimals: 0 });
const NPC_TYPES = new Set(['monster', 'npc']);
const INVESTIGATOR_TYPE = 'investigator';
const NPC_INITIATIVE = -1000;

const isActiveCombat = (combat) => combat?.id && !combat.isDeleted && game.combats.has(combat.id);

const resolveTargetIds = (combat, combatantIds) => {
  if (Array.isArray(combatantIds) && combatantIds.length) {
    return [...combatantIds];
  }
  return Array.from(combat.combatants.keys());
};

const getCombatants = (combat, ids) =>
  ids.map((id) => combat.combatants.get(id)).filter((combatant) => Boolean(combatant));

async function applyInvestigatorInitiative(combat, combatant) {
  const actor = combatant.actor;
  if (!actor) return false;

  const dexterityValue = actor.system?.attributes?.dex?.value ?? 0;
  const roll = await new Roll(INITIATIVE_CONFIG.formula).evaluate({ async: true });
  const success = roll.total <= dexterityValue;
  const initiative = success ? 1 : 0;

  await sendRollMessage(roll, {
    actor,
    flavor: `Initiative 1d20 <= ${dexterityValue}: ${success ? 'SUCCESS' : 'FAILURE'}`,
  });

  await combat.setInitiative(combatant.id, initiative);
  return true;
}

async function applyNpcInitiative(combat, combatant) {
  await combat.setInitiative(combatant.id, NPC_INITIATIVE);
  return true;
}

export function registerInitiativeHook() {
  Hooks.once('ready', () => {
    CONFIG.Combat.initiative = INITIATIVE_CONFIG;

    const originalRollInitiative = Combat.prototype.rollInitiative;

    Combat.prototype.rollInitiative = async function rollInitiativeOverride(combatantIds, options = {}) {
      if (!isActiveCombat(this)) return this;

      const targetIds = resolveTargetIds(this, combatantIds);
      const handledIds = new Set();
      const combatants = getCombatants(this, targetIds);

      for (const combatant of combatants) {
        const actor = combatant.actor;
        if (!actor) continue;

        if (NPC_TYPES.has(actor.type)) {
          await applyNpcInitiative(this, combatant);
          handledIds.add(combatant.id);
          continue;
        }

        if (actor.type === INVESTIGATOR_TYPE) {
          await applyInvestigatorInitiative(this, combatant);
          handledIds.add(combatant.id);
        }
      }

      const remainingIds = targetIds.filter((id) => !handledIds.has(id));

      if (remainingIds.length) {
        await originalRollInitiative.call(this, remainingIds, options);
        return this;
      }

      if (options?.updateTurn !== false && isActiveCombat(this)) {
        await this.update({ turn: this.turn });
      }

      return this;
    };
  });
}
