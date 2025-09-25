export const SETTINGS_NS = 'liminal-horror';

export function registerSystemSettings() {
  game.settings.register(SETTINGS_NS, 'appendixLuck', {
    name: 'Appendix L: Luck',
    hint: 'Enables the Luck attribute on sheets. Allows spending and rolling Luck. (GM only)',
    scope: 'world',
    config: true,
    type: Boolean,
    default: false,
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
