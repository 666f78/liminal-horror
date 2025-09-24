export const NS = 'liminal-horror';
const STORAGE_KEY = 'lh.debug';

function safeGetSetting(namespace, key) {
  try {
    const settings = globalThis.game?.settings;
    if (!settings) return undefined;
    const storage = settings?.storage?.get?.('client');
    if (!storage?.has?.(`${namespace}.${key}`)) return undefined;
    return settings.get(namespace, key);
  } catch (error) {
    console.error(error);
    return undefined;
  }
}

export function isDebugEnabled() {
  const settingValue = safeGetSetting(NS, 'debug');
  if (settingValue !== undefined) return Boolean(settingValue);

  try {
    if (globalThis.CONFIG?.debug?.lh) return true;
  } catch (error) {
    console.error(error);
  }
  try {
    return globalThis.localStorage?.getItem?.(STORAGE_KEY) === '1';
  } catch (error) {
    console.error(error);
  }
  return false;
}

function fmt(args) {
  try {
    return ['[LH]', ...args];
  } catch {
    return args;
  }
}

export function dLog(...args) {
  if (!isDebugEnabled()) return;
  console.log(...fmt(args));
}
export function dWarn(...args) {
  if (!isDebugEnabled()) return;
  console.warn(...fmt(args));
}
export function dError(...args) {
  console.error(...fmt(args));
}

export function setDebug(on) {
  try {
    localStorage?.setItem?.(STORAGE_KEY, on ? '1' : '0');
  } catch (error) {
    console.error(error);
  }
  try {
    if (globalThis.CONFIG)
      ((globalThis.CONFIG.debug = globalThis.CONFIG.debug || {}), (globalThis.CONFIG.debug.lh = !!on));
  } catch (error) {
    console.error(error);
  }
}

export function withGroup(label, fn) {
  if (!isDebugEnabled()) return fn();
  console.groupCollapsed('[LH] ' + label);
  try {
    return fn();
  } finally {
    console.groupEnd();
  }
}
