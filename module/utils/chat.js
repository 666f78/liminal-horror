const PUBLIC_MESSAGE_MODE = 'public';
const GM_ROLE = 'GM';
const LEGACY_MESSAGE_MODES = {
  publicroll: 'public',
  gmroll: 'gm',
  blindroll: 'blind',
  selfroll: 'self',
};

export const getGmRecipients = () => ChatMessage.getWhisperRecipients(GM_ROLE).map((user) => user.id);

const getMessageMode = () => game.settings.get('core', 'messageMode') ?? PUBLIC_MESSAGE_MODE;

const normalizeMessageMode = (mode) => LEGACY_MESSAGE_MODES[mode] ?? mode;

export const shouldWhisperToGMs = () => ['gm', 'blind'].includes(normalizeMessageMode(getMessageMode()));

export function applyWhisper(message = {}, mode = 'auto') {
  if (!message || typeof message !== 'object') return message;

  if (Array.isArray(mode) && mode.length) {
    message.whisper = mode;
    return message;
  }

  const messageMode = mode === 'auto' ? undefined : normalizeMessageMode(mode);
  ChatMessage.applyMode(message, messageMode);

  return message;
}

const resolveSpeaker = ({ actor, user } = {}) => ChatMessage.getSpeaker({ actor, user });

export function createChatMessage({ actor, user = game.user, content, flags, type, whisperMode = 'public' } = {}) {
  if (actor && actor.type !== 'investigator') return;
  const message = {
    user: user?.id ?? game.userId,
    speaker: resolveSpeaker({ actor, user }),
    content,
  };

  if (flags) message.flags = flags;
  if (type !== undefined) message.type = type;

  applyWhisper(message, whisperMode);

  return ChatMessage.create(message);
}

export async function sendRollMessage(
  roll,
  { actor, user = game.user, flavor, content, flags, type, whisperMode = 'auto', speaker, ...rest } = {}
) {
  if (!(roll instanceof Roll)) throw new Error('sendRollMessage expects a Roll instance');

  const message = {
    user: user?.id ?? game.userId,
    speaker: speaker ?? resolveSpeaker({ actor, user }),
  };

  if (flavor !== undefined) message.flavor = flavor;
  if (content !== undefined) message.content = content;
  if (flags) message.flags = flags;
  if (type !== undefined) message.type = type;

  Object.assign(message, rest);

  applyWhisper(message, whisperMode);

  return roll.toMessage(message);
}
