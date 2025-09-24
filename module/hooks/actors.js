import { createChatMessage } from '../utils/chat.js';
import { t } from '../utils/i18n.js';

const NS = 'liminal-horror';
const FLAG = 'gmLog';
const MAX = 200;
const SKIP_PREFIX = ['derived.', '_'];

const PENDING = new Map();

const isPrim = (value) => ['number', 'string', 'boolean', 'undefined'].includes(typeof value);
const skip = (key) => SKIP_PREFIX.some((prefix) => key.startsWith(prefix));
const coerce = (rawValue, refValue) =>
  typeof refValue === 'number'
    ? Number.isFinite(+rawValue)
      ? +rawValue
      : rawValue
    : typeof refValue === 'boolean'
      ? rawValue === 'true'
        ? true
        : rawValue === 'false'
          ? false
          : rawValue
      : rawValue;

export const registerActorHooks = () => {
  Hooks.on('preCreateActor', (actor, data) => {
    const type = data?.type ?? actor.type;
    actor.updateSource({ prototypeToken: { actorLink: type === 'investigator' } });
  });

  Hooks.on('preUpdateActor', (actor, changes, _opts, userId) => {
    const systemChanges = foundry.utils.getProperty(changes, 'system');
    if (!systemChanges) return;

    const flattened = foundry.utils.flattenObject(systemChanges);
    const diffs = [];

    for (const [key, rawValue] of Object.entries(flattened)) {
      if (skip(key)) continue;
      const current = foundry.utils.getProperty(actor.system, key);
      const coerced = coerce(rawValue, current);
      if (isPrim(current) && isPrim(coerced) && current !== coerced) {
        diffs.push({ path: `system.${key}`, key, from: current, to: coerced });
      }
    }

    if (!diffs.length) return;

    PENDING.set(actor.id, {
      ts: Date.now(),
      userId,
      userName: game.users.get(userId)?.name ?? 'Unknown',
      diffs,
    });

    const oldValue = foundry.utils.getProperty(actor.system, 'status.deprived');
    const newValue = changes.system?.status?.deprived;

    if (newValue !== undefined && newValue !== oldValue) {
      const content = `<span style="color:var(--lh-text-muted, #666);"><i>${newValue ? t('LH.msg.becameDeprived') : t('LH.msg.noLongerDeprived')}</i></span>`;
      createChatMessage({
        actor,
        content,
      });
    }
  });

  Hooks.on('updateActor', async (actor) => {
    const pending = PENDING.get(actor.id);
    if (!pending) return;
    PENDING.delete(actor.id);

    const history = actor.getFlag(NS, FLAG) ?? [];
    history.unshift({
      timestamp: new Date(pending.ts).toLocaleString(),
      actorId: actor.id,
      actorName: actor.name,
      userId: pending.userId,
      userName: pending.userName,
      changes: pending.diffs,
    });

    await actor.setFlag(NS, FLAG, history.slice(0, MAX));
  });
};
