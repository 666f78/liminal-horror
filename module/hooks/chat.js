import { openDamageDialog, openStressDialog } from '../apps/effect-dialogs.js';
import { FLAGS, SYSTEM_ID } from '../data/constants.js';
import { createChatMessage } from '../utils/chat.js';
import { t } from '../utils/i18n.js';
import { dLog, withGroup } from '../utils/debug.js';

const GM_ACTION_FLAG = FLAGS.GM_ACTION;
const DAMAGE_USED_FLAG = FLAGS.DAMAGE_USED;
const LUCK_FLAG = FLAGS.LUCK;
const LUCK_SPENT_FLAG = FLAGS.LUCK_SPENT;

const ACTIONS = Object.freeze({
  'apply-damage': {
    buttonClass: 'gm-damage-btn',
    getLabel: (used) => (used ? t('LH.msg.buttons.injuryAdded') : t('LH.msg.buttons.injuryAdd')),
    onClick: openDamageDialog,
  },
  'apply-stress': {
    buttonClass: 'gm-stress-btn',
    getLabel: (used) => (used ? t('LH.msg.buttons.consequenceAdded') : t('LH.msg.buttons.consequenceAdd')),
    onClick: openStressDialog,
  },
});

const BUTTON_CONTAINER = '.message-content';
const ALREADY_APPLIED_HINT = 'Already applied';
const LUCK_WHISPER_LABEL = (cost) => `Luck spent (${cost})`;

const resolveActor = (attackerId) => game.actors.get(attackerId) ?? canvas.tokens?.get(attackerId)?.actor;

const createButton = ({ label, className, disabled = false, title = '', onClick }) => {
  const button = $('<button class="lh btn"></button>')
    .addClass(className)
    .text(label)
    .prop('disabled', disabled)
    .attr('title', title)
    .css({ marginTop: '10px' });

  button.on('click', async () => {
    if (button.prop('disabled')) return;
    await onClick?.(button);
  });

  return button;
};

const appendIfMissing = (html, selector, builder) => {
  if (html.find(selector).length) return null;
  const button = builder();
  html.find(BUTTON_CONTAINER).append(button);
  return button;
};

const registerGmActionButtons = () => {
  Hooks.on('renderChatMessage', (message, html) => {
    if (!game.user.isGM) return;

    const actionKey = message.getFlag(SYSTEM_ID, GM_ACTION_FLAG);
    const action = ACTIONS[actionKey];
    if (!action) return;

    const attackerId = message.getFlag(SYSTEM_ID, 'attackerId');
    const attacker = resolveActor(attackerId);
    const used = Boolean(message.getFlag(SYSTEM_ID, DAMAGE_USED_FLAG));

    appendIfMissing(html, `.${action.buttonClass}`, () =>
      createButton({
        label: action.getLabel(used),
        className: action.buttonClass,
        disabled: used,
        title: used ? ALREADY_APPLIED_HINT : '',
        onClick: async (button) => {
          dLog('chat.gmAction.click', actionKey);
          await action.onClick(attacker, {
            onApplied: async () => {
              await message.setFlag(SYSTEM_ID, DAMAGE_USED_FLAG, true);
              button.prop('disabled', true).text(action.getLabel(true)).attr('title', ALREADY_APPLIED_HINT);
            },
          });
        },
      })
    );
  });
};

const registerLuckButtons = () => {
  Hooks.on('renderChatMessage', (message, html) => {
    const offer = message.getFlag(SYSTEM_ID, LUCK_FLAG);
    if (!offer) return;
    if (!game.settings.get(SYSTEM_ID, 'appendixLuck')) return;

    const actor = resolveActor(offer.actorId);
    if (!actor) return;

    const isOwner = actor.isOwner || game.user.isGM;
    if (!isOwner) return;

    const spent = Boolean(message.getFlag(SYSTEM_ID, LUCK_SPENT_FLAG));
    const cost = Number(offer.cost ?? 0);
    const label = offer.label ?? `Spend Luck (${cost}) to succeed`;
    const currentLuck = Number(actor.system?.attributes?.luck?.value ?? 0);
    const canSpend = !spent && cost > 0 && currentLuck >= cost;

    appendIfMissing(html, '.lh-luck-btn', () =>
      createButton({
        label,
        className: 'lh-luck-btn',
        disabled: !canSpend,
        onClick: async (button) => {
          const latestActor = resolveActor(offer.actorId);
          if (!latestActor) return;

          const owns = latestActor.isOwner || game.user.isGM;
          if (!owns) {
            ui.notifications?.warn('You do not control this actor.');
            return;
          }

          const latestLuck = Number(latestActor.system?.attributes?.luck?.value ?? 0);
          if (latestLuck < cost) {
            ui.notifications?.warn('Not enough Luck.');
            button.prop('disabled', true);
            return;
          }

          await latestActor.update({ 'system.attributes.luck.value': Math.max(0, latestLuck - cost) });
          await message.setFlag(SYSTEM_ID, LUCK_SPENT_FLAG, true);
          button.prop('disabled', true).text(LUCK_WHISPER_LABEL(cost));

          await createChatMessage({
            actor: latestActor,
            content: `<div class="lh roll-card"><header><strong>Luck</strong></header><div>Spent ${cost} Luck to succeed.</div></div>`,
          });
        },
      })
    );
  });
};

export const registerChatHooks = () => {
  withGroup('chatHooks', () => {
    registerGmActionButtons();
    registerLuckButtons();
  });
};
