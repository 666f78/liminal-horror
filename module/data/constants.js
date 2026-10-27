export const SYSTEM_ID = 'liminal-horror';

export const FLAGS = {
  GM_ACTION: 'gmAction',
  DAMAGE_USED: 'damageUsed',
  LUCK: 'luck',
  LUCK_SPENT: 'luckSpent',
  INIT_ROLL: 'initRoll',
  DELAY_UNTIL_ROUND: 'delayUntilRound',
};

export const MAX_SLOTS = 10;

export const WEAPON_HANDS = Object.freeze({ MAIN: 'main', OFF: 'off' });
export const WEAPON_DIE_SIZES = Object.freeze([2, 4, 6, 8, 10, 12, 20]);
export const OFF_HAND_MINIMUM_DIE_SIZES = Object.freeze([2, 4]);

export const SLOT_TYPES = new Set([
  'weapon',
  'spell',
  'gear',
  'armor',
  'artifact',
  'injury',
  'consequence',
  'condition',
]);
