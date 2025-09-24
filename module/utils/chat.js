const PUBLIC_ROLL_MODE = 'publicroll';
const GM_ROLE = 'GM';

export const getGmRecipients = () => ChatMessage.getWhisperRecipients(GM_ROLE).map((user) => user.id);

export const shouldWhisperToGMs = () => game.settings.get('core', 'rollMode') !== PUBLIC_ROLL_MODE;

export function applyWhisper(message = {}, mode = 'auto') {
  if (!message || typeof message !== 'object') return message;

  if (mode === 'gm') {
    message.whisper = getGmRecipients();
  } else if (Array.isArray(mode) && mode.length) {
    message.whisper = mode;
  } else if (mode === 'auto' && shouldWhisperToGMs()) {
    message.whisper = getGmRecipients();
  }

  return message;
}

const resolveSpeaker = ({ actor, user } = {}) => ChatMessage.getSpeaker({ actor, user });

export function createChatMessage({ actor, user = game.user, content, flags, type, whisperMode = 'auto' } = {}) {
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
