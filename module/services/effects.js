import { getAttr, setAttrValue } from '../utils/attrs.js';
import { renderCard } from '../utils/chat-card.js';
import { createChatMessage } from '../utils/chat.js';
import { t } from '../utils/i18n.js';
import { rollAttribute } from './rolls.js';

const EFFECTS = {
  damage: {
    title: 'LH.core.damage',
    defensesPath: 'defenses.armor',
    attributeKey: 'str',
    overflowLabel: 'LH.msg.damage.overflowLabel',
    hpLabel: 'HP loss',
    deathLabel: 'DEAD',
    note: 'LH.msg.damage.note',
    gmAction: 'apply-damage',
  },
  stress: {
    title: 'LH.core.stress',
    defensesPath: 'defenses.selfControl',
    attributeKey: 'con',
    overflowLabel: 'LH.msg.stress.overflowLabel',
    hpLabel: 'HP loss',
    deathLabel: 'LOST',
    note: 'LH.msg.stress.note',
    gmAction: 'apply-stress',
  },
};

const clamp = (value) => Math.max(0, Number(value) || 0);

const getDefenses = (actor, path) => {
  if (!path) return 0;
  const system = actor.system ?? {};
  return clamp(foundry.utils.getProperty(system, path));
};

const postCardMessage = (actor, content) => createChatMessage({ actor, content });

const applyEffect = async (actor, rawAmount, key, { defenses = true } = {}) => {
  if (!actor) throw new Error('Actor is required to apply an effect');

  const config = EFFECTS[key];
  if (!config) throw new Error(`Unknown effect key: ${key}`);

  const amount = clamp(rawAmount);
  const defensesValue = defenses ? getDefenses(actor, config.defensesPath) : 0;
  const effectiveAmount = Math.max(0, amount - defensesValue);

  const system = actor.system ?? {};
  const hpCurrent = clamp(system.defense?.hp);
  const hpRemaining = Math.max(0, hpCurrent - effectiveAmount);
  const hpLoss = hpCurrent - hpRemaining;

  await actor.update({ 'system.defense.hp': hpRemaining });

  const absorbed = amount > 0 && effectiveAmount === 0;
  const rows = [];
  if (hpLoss > 0) {
    rows.push(`<span style="font-weight:bold;">${t('LH.msg.hpLoss')}: ${clamp(hpLoss)}</span>`);
  } else if (absorbed) {
    const absorbedLabel = config.title.toLowerCase();
    rows.push(
      `<span style="color:var(--lh-text-muted, #666);"><i>${
        absorbedLabel === 'lh.core.damage' ? t('LH.msg.absorbedDamage') : t('LH.msg.absorbedStress')
      }</i></span>`
    );
  }

  if (rows.length) {
    await postCardMessage(actor, renderCard(t(`${config.title}`), rows));
  }

  if (hpRemaining > 0 || effectiveAmount <= hpCurrent) {
    return;
  }

  const overflow = effectiveAmount - hpCurrent;
  const { value: attrValue } = getAttr(actor, config.attributeKey);
  const attrRemaining = Math.max(0, attrValue - overflow);
  const attrLoss = attrValue - attrRemaining;

  await setAttrValue(actor, config.attributeKey, attrRemaining);

  if (attrRemaining > 0) {
    await rollAttribute(actor, config.attributeKey, {
      cardTitle: t(`${config.title}`),
      cardRows: [{ label: t(`${config.overflowLabel}`), value: clamp(attrLoss) }],
      note: t(`${config.note}`),
      gmAction: config.gmAction,
    });
    return;
  }

  const deathRows = [
    { label: t(config.overflowLabel), value: clamp(attrLoss) },
    '<span style="color:red; font-weight:bold;">' + config.deathLabel + '</span>',
  ];

  await postCardMessage(actor, renderCard(t(config.title), deathRows));
};

export const applyDamage = (actor, amount, options) => applyEffect(actor, amount, 'damage', options);

export const applyStress = (actor, amount, options) => applyEffect(actor, amount, 'stress', options);
