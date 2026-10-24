import { isAppendixLuckEnabled } from '../settings.js';
import { getAttr } from '../utils/attrs.js';
import { renderResultRollCard } from '../utils/chat-card.js';
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

  const card = await renderResultRollCard({
    title: t(`${attributeLabel}`),
    target,
    rows: flavor ? [flavor] : cardRows,
    roll,
    outcome,
    outcomeType: getOutcomeType({ success, critSuccess, critFail }),
    note: !success ? note : undefined,
  });
  const messageOptions = { actor, content: card };

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
