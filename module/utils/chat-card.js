import { t } from './i18n.js';

export const renderCardRows = (rows = []) =>
  rows
    .map((row) => {
      if (typeof row === 'string') return `<div>${row}</div>`;
      const label = row?.label ? `<b>${row.label}:</b> ` : '';
      const value = row?.value ?? '';
      return `<div>${label}${value}</div>`;
    })
    .join('');

const renderCardIcon = (icon) => {
  const icons = (Array.isArray(icon) ? icon : [icon])
    .map((name) => `<i class="fa-solid ${foundry.utils.escapeHTML(name)}" aria-hidden="true"></i>`)
    .join('');
  return Array.isArray(icon) ? `<span class="lh-action-card__icons">${icons}</span>` : icons;
};

const renderActionCardResult = (rows, icon) => `
  <div class="lh-result-roll__result lh-action-card__result">
    <div class="lh-action-card__icon">${renderCardIcon(icon)}</div>
    <div class="lh-result-roll__outcome lh-action-card__body">${renderCardRows(rows)}</div>
  </div>`;

export const renderCard = (title, rows = [], { tone = 'neutral', icon = 'fa-circle-info', description = '' } = {}) => `
  <div class="lh action-card action-card--${foundry.utils.escapeHTML(tone)}">
    <header class="lh-result-roll__heading"><strong>${foundry.utils.escapeHTML(title)}</strong></header>
    ${renderActionCardResult(rows, icon)}
    ${description ? `<div class="lh-result-roll__description">${description}</div>` : ''}
  </div>`;

export const renderEquipmentChangeCard = (changes) => {
  const sections = [false, true]
    .map((equipped) => {
      const items = changes.filter((change) => change.equipped === equipped);
      if (!items.length) return '';
      const tone = equipped ? 'equipped' : 'unequipped';
      const title = t(equipped ? 'LH.core.equipped' : 'LH.core.unequipped');
      const rows = items
        .map(({ name, icon }) => renderActionCardResult([foundry.utils.escapeHTML(name)], icon))
        .join('');
      return `
        <section class="lh action-card action-card--${tone}">
          <header class="lh-result-roll__heading"><strong>${foundry.utils.escapeHTML(title)}</strong></header>
          <div class="lh-equipment-change__items">${rows}</div>
        </section>`;
    })
    .join('');
  return `<div class="lh-equipment-change">${sections}</div>`;
};

export const renderResultRollCard = async ({
  title,
  target,
  rows,
  roll,
  rollTemplate,
  outcome,
  outcomeType = 'neutral',
  note,
  icon,
}) => {
  const targetLabel =
    target === undefined ? '' : `<span>${foundry.utils.escapeHTML(t('LH.core.target'))}: <b>${target}</b></span>`;
  const details = rows?.length ? `<div class="lh-result-roll__details">${renderCardRows(rows)}</div>` : '';
  const noteMarkup = note ? `<p class="lh-result-roll__note">${foundry.utils.escapeHTML(note)}</p>` : '';
  const outcomeLabel = foundry.utils.escapeHTML(outcome);
  const outcomeMarkup = icon
    ? `<i class="fa-solid ${foundry.utils.escapeHTML(icon)}" aria-hidden="true"></i><span>${outcomeLabel}</span>`
    : outcomeLabel;

  return `
    <div class="lh result-roll-card result-roll-card--${foundry.utils.escapeHTML(outcomeType)}">
      <div class="lh-result-roll__heading">
        <strong>${foundry.utils.escapeHTML(title)}</strong>
        ${targetLabel}
      </div>
      ${details}
      <div class="lh-result-roll__result">
        ${await roll.render({ template: rollTemplate })}
        <div class="lh-result-roll__outcome"><strong>${outcomeMarkup}</strong></div>
      </div>
      ${noteMarkup}
    </div>`;
};
