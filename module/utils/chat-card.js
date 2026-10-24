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

export const renderCard = (title, rows = [], { tone = 'neutral', icon = 'fa-circle-info', description = '' } = {}) => `
  <div class="lh action-card action-card--${foundry.utils.escapeHTML(tone)}">
    <header class="lh-result-roll__heading"><strong>${foundry.utils.escapeHTML(title)}</strong></header>
    <div class="lh-result-roll__result lh-action-card__result">
      <div class="lh-action-card__icon"><i class="fa-solid ${foundry.utils.escapeHTML(icon)}" aria-hidden="true"></i></div>
      <div class="lh-result-roll__outcome lh-action-card__body">${renderCardRows(rows)}</div>
    </div>
    ${description ? `<div class="lh-result-roll__description">${description}</div>` : ''}
  </div>`;

export const renderResultRollCard = async ({
  title,
  target,
  rows,
  roll,
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
        ${await roll.render()}
        <div class="lh-result-roll__outcome"><strong>${outcomeMarkup}</strong></div>
      </div>
      ${noteMarkup}
    </div>`;
};
