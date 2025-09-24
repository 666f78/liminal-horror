export const t = (key) => game.i18n.localize(key);
export const td = (key, data = {}) => game.i18n.format(key, data);
export const tn = (key, n) => (game.i18n.formatPlural ? game.i18n.formatPlural(n, key) : game.i18n.format(key, { n }));
