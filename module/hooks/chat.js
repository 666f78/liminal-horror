import { openDamageDialog, openStressDialog } from '../apps/effect-dialogs.js';
import { FLAGS, SYSTEM_ID } from '../data/constants.js';
import { isAppendixLuckEnabled } from '../settings.js';
import { dError, dLog, withGroup } from '../utils/debug.js';
import { t, td } from '../utils/i18n.js';

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
const PENDING_LUCK_UPDATES = new Set();

const resolveActor = (attackerId) => game.actors.get(attackerId) ?? canvas.tokens?.get(attackerId)?.actor;

const createButton = ({ label, className, disabled = false, title = '', icon, onClick }) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.classList.add('lh');
  if (className) {
    className
      .split(/\s+/)
      .filter(Boolean)
      .forEach((cls) => button.classList.add(cls));
  }
  if (icon) {
    const iconElement = document.createElement('i');
    iconElement.className = `fa-solid ${icon}`;
    iconElement.setAttribute('aria-hidden', 'true');
    button.append(iconElement);
    button.setAttribute('aria-label', label);
  } else {
    button.classList.add('btn');
    button.textContent = label;
    button.style.marginTop = '10px';
  }
  button.disabled = disabled;
  button.title = title;

  button.addEventListener('click', async (event) => {
    if (button.disabled) return;
    await onClick?.(button, event);
  });

  return button;
};

const appendIfMissing = (html, selector, builder, containerSelector = BUTTON_CONTAINER) => {
  const container = html.querySelector(containerSelector);
  if (!container) return null;
  if (container.querySelector(selector)) return null;
  const button = builder();
  if (!button) return null;
  container.append(button);
  return button;
};

const renderLuckSpentResult = (html, cost) => {
  const card = html.querySelector('.lh.result-roll-card');
  const outcome = card?.querySelector('.lh-result-roll__outcome strong');
  if (!card || !outcome) return;

  card.classList.remove('result-roll-card--failure', 'result-roll-card--critical-failure');
  card.classList.add('result-roll-card--success');
  outcome.textContent = t('LH.roll.successWithLuck');

  let note = card.querySelector('.lh-result-roll__note');
  if (!note) {
    note = document.createElement('p');
    note.className = 'lh-result-roll__note';
    card.append(note);
  }
  note.classList.add('lh-luck-spent');
  note.textContent = td('LH.msg.luck.spent', { cost });

  html.querySelector('.lh-luck-btn')?.remove();
  for (const action of Object.values(ACTIONS)) {
    html.querySelector(`.${action.buttonClass}`)?.remove();
  }
};

const registerGmActionButtons = () => {
  Hooks.on('renderChatMessageHTML', (message, html) => {
    if (!game.user.isGM) return;
    if (message.getFlag(SYSTEM_ID, LUCK_SPENT_FLAG)) return;

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
          if (message.getFlag(SYSTEM_ID, LUCK_SPENT_FLAG)) return;
          dLog('chat.gmAction.click', actionKey);
          await action.onClick(attacker, {
            onApplied: async () => {
              await message.setFlag(SYSTEM_ID, DAMAGE_USED_FLAG, true);
              button.disabled = true;
              button.textContent = action.getLabel(true);
              button.title = ALREADY_APPLIED_HINT;
            },
          });
        },
      })
    );
  });
};

const registerLuckButtons = () => {
  Hooks.on('renderChatMessageHTML', (message, html) => {
    const offer = message.getFlag(SYSTEM_ID, LUCK_FLAG);
    if (!offer) return;

    const cost = Number(offer.cost ?? 0);
    if (!Number.isFinite(cost) || cost <= 0) return;

    const spent = Boolean(message.getFlag(SYSTEM_ID, LUCK_SPENT_FLAG));
    if (spent) {
      renderLuckSpentResult(html, cost);
    }

    if (!spent && !isAppendixLuckEnabled()) return;

    const actor = resolveActor(offer.actorId);
    if (!actor) return;

    const isOwner = actor.isOwner || game.user.isGM;
    if (!isOwner) return;
    if (!message.canUserModify(game.user, 'update')) return;

    const currentLuck = Number(actor.system?.attributes?.luck?.value ?? 0);
    if (!Number.isFinite(currentLuck) || (!spent && currentLuck < cost)) return;

    const buttonClass = spent ? 'lh-luck-undo-btn' : 'lh-luck-btn';
    appendIfMissing(
      html,
      `.${buttonClass}`,
      () =>
        createButton({
          label: spent ? t('LH.msg.luck.undo') : td('LH.msg.luck.spend', { cost }),
          className: buttonClass,
          icon: spent ? 'fa-rotate-left' : undefined,
          title: spent ? td('LH.msg.luck.undoHint', { cost }) : '',
          onClick: async (button) => {
            if (PENDING_LUCK_UPDATES.has(message.id)) return;
            if (Boolean(message.getFlag(SYSTEM_ID, LUCK_SPENT_FLAG)) !== spent) return;
            if (!spent && !isAppendixLuckEnabled()) return;

            const latestActor = resolveActor(offer.actorId);
            const canUpdateMessage = message.canUserModify(game.user, 'update');
            if (!latestActor || !(latestActor.isOwner || game.user.isGM) || !canUpdateMessage) {
              ui.notifications?.warn(t('LH.msg.luck.notOwner'));
              return;
            }

            const latestLuck = Number(latestActor.system?.attributes?.luck?.value ?? 0);
            if (!Number.isFinite(latestLuck) || (!spent && latestLuck < cost)) {
              ui.notifications?.warn(t(spent ? 'LH.msg.luck.undoFailed' : 'LH.msg.luck.notEnough'));
              return;
            }

            button.disabled = true;
            PENDING_LUCK_UPDATES.add(message.id);
            let luckUpdated = false;
            try {
              const updatedActor = await latestActor.update({
                'system.attributes.luck.value': spent ? latestLuck + cost : latestLuck - cost,
              });
              if (!updatedActor) throw new Error('Luck update was cancelled');
              luckUpdated = true;

              const updatedMessage = await message.setFlag(SYSTEM_ID, LUCK_SPENT_FLAG, !spent);
              if (!updatedMessage) throw new Error('Luck result update was cancelled');
              if (!spent) renderLuckSpentResult(html, cost);
            } catch (error) {
              dError('chat.luck.update error', error);
              const failureKey = spent ? 'LH.msg.luck.undoFailed' : 'LH.msg.luck.spendFailed';
              const resultFailureKey = spent ? 'LH.msg.luck.undoResultUpdateFailed' : 'LH.msg.luck.resultUpdateFailed';
              ui.notifications?.error(t(luckUpdated ? resultFailureKey : failureKey));
            } finally {
              PENDING_LUCK_UPDATES.delete(message.id);
              button.disabled = luckUpdated || Boolean(message.getFlag(SYSTEM_ID, LUCK_SPENT_FLAG)) !== spent;
            }
          },
        }),
      spent ? '.lh-luck-spent' : BUTTON_CONTAINER
    );
  });
};

export const registerChatHooks = () => {
  withGroup('chatHooks', () => {
    registerGmActionButtons();
    registerLuckButtons();
  });
};
