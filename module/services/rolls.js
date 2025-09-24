import { getAttr } from '../utils/attrs.js';
import { renderCard } from '../utils/chat-card.js';
import { sendRollMessage } from '../utils/chat.js';
import { t } from '../utils/i18n.js';

const ATTRIBUTE_LABELS = {
  str: 'LH.attr.full.str',
  dex: 'LH.attr.full.dex',
  con: 'LH.attr.full.ctrl',
};

const formatOutcome = ({ success, critSuccess, critFail }) => {
  if (success && critSuccess) return t('LH.roll.successCritical');
  if (success) return t('LH.roll.success');
  if (critFail) return t('LH.roll.failureCritical');
  return t('LH.roll.failure');
};

export async function rollAttribute(actor, key, options = {}) {
  const { cardTitle, cardRows, note, gmAction, flavor } = options;

  const attributeLabel = cardTitle ?? ATTRIBUTE_LABELS[key] ?? key.toUpperCase();
  const { value: rawTarget } = getAttr(actor, key);
  const target = Number(rawTarget) || 0;

  const roll = await new Roll('1d20').evaluate();
  const nat = roll.dice?.[0]?.results?.[0]?.result ?? roll.total;
  const success = roll.total <= target || nat === 1;
  const critSuccess = nat === 1;
  const critFail = nat === 20;

  const outcome = formatOutcome({ success, critSuccess, critFail });
  const outcomeColor = success ? 'color:green;' : 'color:red;';

  const rows = [...(cardRows ?? [{ label: t('LH.core.target'), value: target }])];

  if (!flavor) {
    rows.push(`<span style="font-weight:bold; ${outcomeColor}">${outcome}</span>`);
    if (!success && note) rows.push(`<span style="color:red;"><i>${note}</i></span>`);
  }

  let card = flavor ?? renderCard(t(`${attributeLabel}`), rows);

  if (flavor) {
    card += `<div style="font-weight:bold; ${outcomeColor} margin-top:4px;">${outcome}</div>`;
    if (!success && note) card += `<div style="margin-top:6px; color:red;"><i>${note}</i></div>`;
  }

  const messageOptions = { actor, flavor: card };

  if (!success) {
    const flags = {};
    if (gmAction) {
      flags.gmAction = gmAction;
      flags.attackerId = actor.id;
    }

    if (game.settings.get('liminal-horror', 'appendixLuck')) {
      const eligible = ['str', 'dex', 'con'];
      if (eligible.includes(key)) {
        const cost = Math.max(0, roll.total - target);
        const currentLuck = Number(actor.system?.attributes?.luck?.value ?? 0);
        if (cost > 0 && currentLuck > 0) {
          flags.luck = {
            actorId: actor.id,
            cost,
            label: `Spend Luck (${cost}) to succeed`,
          };
        }
      }
    }

    if (Object.keys(flags).length) {
      messageOptions.flags = { 'liminal-horror': flags };
    }
  }

  await sendRollMessage(roll, messageOptions);

  return { roll, success, critFail, critSuccess };
}

export async function quickRoll(actor, formula = '1d6', label = 'Quick Roll') {
  const roll = await new Roll(formula).evaluate();
  const total = Number(roll.total) || 0;

  const outcome =
    total <= 3
      ? `<span style="color:red; font-weight:bold;">${t('LH.roll.badResult')}</span>`
      : total <= 5
        ? `<span style="color:orange; font-weight:bold;">${t('LH.roll.mixedResult')}</span>`
        : `<span style="color:green; font-weight:bold;">${t('LH.roll.goodResult')}</span>`;

  const card = renderCard(label, [`${outcome}`]);

  await sendRollMessage(roll, { actor, flavor: card });

  return roll;
}
