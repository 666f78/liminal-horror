import { t } from './utils/i18n.js';

export const SETTINGS_NS = 'liminal-horror';
export const APPENDIX_LUCK_SETTING = 'appendixLuck';
export const AUTO_ARMOR_CALCULATION_SETTING = 'autoArmorCalculation';
export const INVESTIGATOR_GENERATOR_REROLL_SETTING = 'investigatorGeneratorReroll';
export const PARTY_MEMBERS_SETTING = 'partyMembers';

export function isAppendixLuckEnabled() {
  return game.settings.get(SETTINGS_NS, APPENDIX_LUCK_SETTING);
}

export function isAutoArmorCalculationSettingEnabled() {
  return game.settings.get(SETTINGS_NS, AUTO_ARMOR_CALCULATION_SETTING);
}

export function isInvestigatorGeneratorRerollEnabled() {
  return game.settings.get(SETTINGS_NS, INVESTIGATOR_GENERATOR_REROLL_SETTING);
}

async function syncArmorForAllActors(enabled) {
  if (!enabled || !game.user.isGM || !game?.liminalhorror?.api?.recalcArmor) return;

  for (const actor of game.actors?.contents ?? []) {
    await game.liminalhorror.api.recalcArmor(actor);
  }
}

export function registerSystemSettings() {
  game.settings.register(SETTINGS_NS, PARTY_MEMBERS_SETTING, {
    name: 'LH.partyOverview.membersSetting',
    scope: 'world',
    config: false,
    type: Array,
    default: [],
  });

  game.settings.register(SETTINGS_NS, 'lastSeenSystemVersion', {
    name: 'LH.settings.lastSeenSystemVersion',
    scope: 'world',
    config: false,
    type: String,
    default: '0.0.0',
  });

  game.settings.register(SETTINGS_NS, APPENDIX_LUCK_SETTING, {
    name: 'LH.settings.appendixLuck.name',
    hint: 'LH.settings.appendixLuck.hint',
    scope: 'world',
    config: true,
    type: Boolean,
    default: false,
  });

  game.settings.register(SETTINGS_NS, AUTO_ARMOR_CALCULATION_SETTING, {
    name: 'LH.settings.autoArmorCalculation.name',
    hint: 'LH.settings.autoArmorCalculation.hint',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true,
    onChange: (value) => {
      syncArmorForAllActors(value);
    },
  });

  game.settings.register(SETTINGS_NS, INVESTIGATOR_GENERATOR_REROLL_SETTING, {
    name: 'LH.settings.investigatorGeneratorReroll.name',
    hint: 'LH.settings.investigatorGeneratorReroll.hint',
    scope: 'world',
    config: true,
    type: Boolean,
    default: false,
  });

  game.settings.register(SETTINGS_NS, 'debug', {
    name: 'LH.settings.debug.name',
    hint: 'LH.settings.debug.hint',
    scope: 'client',
    config: true,
    type: Boolean,
    default: false,
    onChange: (val) => {
      if (!game.user.isGM) return;
      try {
        CONFIG.debug = CONFIG.debug || {};
        CONFIG.debug.lh = !!val;
        CONFIG.debug.hooks = !!val;
        if (val) ui.notifications?.info(t('LH.settings.debug.enabled'));
      } catch (e) {
        console.error('[LH] debug toggle error', e);
      }
    },
  });
}
