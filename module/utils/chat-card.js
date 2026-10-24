export const renderCardRows = (rows = []) =>
  rows
    .map((row) => {
      if (typeof row === 'string') return `<div>${row}</div>`;
      const label = row?.label ? `<b>${row.label}:</b> ` : '';
      const value = row?.value ?? '';
      return `<div>${label}${value}</div>`;
    })
    .join('');

export const renderCard = (title, rows = []) =>
  `<div class="lh roll-card"><header><strong>${title}</strong></header>${renderCardRows(rows)}</div>`;
