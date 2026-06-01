export const SETTINGS_NS = 'liminal-horror';
export const APPENDIX_LUCK_SETTING = 'appendixLuck';
export const AUTO_ARMOR_CALCULATION_SETTING = 'autoArmorCalculation';

export function isAppendixLuckEnabled() {
  return game.settings.get(SETTINGS_NS, APPENDIX_LUCK_SETTING);
}

export function isAutoArmorCalculationSettingEnabled() {
  return game.settings.get(SETTINGS_NS, AUTO_ARMOR_CALCULATION_SETTING);
}

async function syncArmorForAllActors(enabled) {
  if (!enabled || !game.user.isGM || !game?.liminalhorror?.api?.recalcArmor) return;

  for (const actor of game.actors?.contents ?? []) {
    await game.liminalhorror.api.recalcArmor(actor);
  }
}

export function registerSystemSettings() {
  game.settings.register(SETTINGS_NS, 'lastSeenSystemVersion', {
    name: 'Last Seen System Version',
    scope: 'world',
    config: false,
    type: String,
    default: '0.0.0',
  });

  game.settings.register(SETTINGS_NS, APPENDIX_LUCK_SETTING, {
    name: 'Appendix L: Luck',
    hint: 'Enables the Luck attribute on sheets. Allows spending and rolling Luck. (GM only)',
    scope: 'world',
    config: true,
    type: Boolean,
    default: false,
  });

  game.settings.register(SETTINGS_NS, AUTO_ARMOR_CALCULATION_SETTING, {
    name: 'Automatic armor calculation',
    hint: 'If enabled, armor is recalculated from equipped armor items. If disabled, armor is entered manually on the actor sheet.',
    scope: 'world',
    config: true,
    type: Boolean,
    default: true,
    onChange: (value) => {
      syncArmorForAllActors(value);
    },
  });

  game.settings.register(SETTINGS_NS, 'debug', {
    name: 'Enable Debug Logging',
    hint: 'Enable debug and hook logging (for developers only)',
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
        if (val) ui.notifications?.info('Liminal Horror: Debug ON');
      } catch (e) {
        console.error('[LH] debug toggle error', e);
      }
    },
  });
}
