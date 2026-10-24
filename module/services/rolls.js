import { isAppendixLuckEnabled } from '../settings.js';
import { getAttr } from '../utils/attrs.js';
import { renderCardRows } from '../utils/chat-card.js';
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

const getOutcomeType = ({ success, critSuccess, critFail }) => {
  if (success && critSuccess) return 'critical-success';
  if (success) return 'success';
  if (critFail) return 'critical-failure';
  return 'failure';
};

const renderResultRollCard = async ({ title, target, rows, roll, outcome, outcomeType, note }) => {
  const targetLabel =
    target === undefined ? '' : `<span>${foundry.utils.escapeHTML(t('LH.core.target'))}: <b>${target}</b></span>`;
  const details = rows?.length ? `<div class="lh-result-roll__details">${renderCardRows(rows)}</div>` : '';
  const noteMarkup = note ? `<p class="lh-result-roll__note">${foundry.utils.escapeHTML(note)}</p>` : '';

  return `
    <div class="lh result-roll-card result-roll-card--${outcomeType}">
      <div class="lh-result-roll__heading">
        <strong>${foundry.utils.escapeHTML(title)}</strong>
        ${targetLabel}
      </div>
      ${details}
      <div class="lh-result-roll__result">
        ${await roll.render()}
        <div class="lh-result-roll__outcome"><strong>${foundry.utils.escapeHTML(outcome)}</strong></div>
      </div>
      ${noteMarkup}
    </div>`;
};

export async function rollAttribute(actor, key, options = {}) {
  const { cardTitle, cardRows, note, gmAction, flavor, targetOverride } = options;

  const attributeLabel = cardTitle ?? ATTRIBUTE_LABELS[key] ?? key.toUpperCase();
  const { value: rawTarget } = getAttr(actor, key);
  const target = Number(targetOverride ?? rawTarget) || 0;

  const roll = await new Roll('1d20').evaluate();
  const nat = roll.dice?.[0]?.results?.[0]?.result ?? roll.total;
  const success = roll.total <= target || nat === 1;
  const critSuccess = nat === 1;
  const critFail = nat === 20;

  const outcome = formatOutcome({ success, critSuccess, critFail });

  let messageOptions;
  if (flavor) {
    const outcomeColor = success ? 'color:green;' : 'color:red;';
    let card = flavor + `<div style="font-weight:bold; ${outcomeColor} margin-top:4px;">${outcome}</div>`;
    if (!success && note) card += `<div style="margin-top:6px; color:red;"><i>${note}</i></div>`;
    messageOptions = { actor, flavor: card };
  } else {
    const card = await renderResultRollCard({
      title: t(`${attributeLabel}`),
      target,
      rows: cardRows,
      roll,
      outcome,
      outcomeType: getOutcomeType({ success, critSuccess, critFail }),
      note: !success ? note : undefined,
    });
    messageOptions = { actor, content: card };
  }

  if (!success) {
    const flags = {};
    if (gmAction) {
      flags.gmAction = gmAction;
      flags.attackerId = actor.id;
    }

    if (isAppendixLuckEnabled()) {
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

  const message = await sendRollMessage(roll, messageOptions);

  return { roll, message, success, critFail, critSuccess };
}

export async function quickRoll(actor, formula = '1d6', label = 'Quick Roll') {
  const roll = await new Roll(formula).evaluate();
  const total = Number(roll.total) || 0;

  const outcomeType = total <= 3 ? 'bad' : total <= 5 ? 'mixed' : 'good';
  const outcomeKey = {
    bad: 'LH.roll.badResult',
    mixed: 'LH.roll.mixedResult',
    good: 'LH.roll.goodResult',
  }[outcomeType];
  const card = await renderResultRollCard({ title: label, roll, outcome: t(outcomeKey), outcomeType });

  await sendRollMessage(roll, { actor, content: card });

  return roll;
}
