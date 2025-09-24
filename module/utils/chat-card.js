export const renderCard = (title, rows = []) => {
  const content = rows
    .map((row) => {
      if (typeof row === 'string') return `<div>${row}</div>`;
      const label = row?.label ? `<b>${row.label}:</b> ` : '';
      const value = row?.value ?? '';
      return `<div>${label}${value}</div>`;
    })
    .join('');

  return `<div class="lh roll-card"><header><strong>${title}</strong></header>${content}</div>`;
};
