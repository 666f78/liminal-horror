export async function pickInvestigatorDialog({
  title = 'Choose Investigator',
  onlyOwned = false,
  preselectActorId = null,
} = {}) {
  let actors = game.actors.contents;
  if (onlyOwned) actors = actors.filter((a) => a.hasPlayerOwner);

  actors.sort((a, b) => a.name.localeCompare(b.name, 'uk'));

  if (!actors.length) {
    ui.notifications.warn('There are no investigators available');
    return null;
  }

  const options = actors
    .map((a) => {
      const owner = a.ownership?.[game.user.id] >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER ? ' (you)' : '';
      return `<option value="${a.id}">${a.name}${owner}</option>`;
    })
    .join('');

  const fallbackId =
    preselectActorId ?? canvas.tokens?.controlled?.[0]?.actor?.id ?? game.user?.investigator?.id ?? actors[0].id;

  return new Promise((resolve) => {
    new Dialog(
      {
        title,
        content: `
        <div class="lh" style="min-width:320px">
          <label>Investigator</label>
          <select id="lh-char" style="width:100%">${options}</select>
        </div>
      `,
        buttons: {
          ok: {
            label: 'OK',
            callback: (html) => resolve(game.actors.get(html.find('#lh-char').val()) ?? null),
          },
          cancel: { label: 'Cancel', callback: () => resolve(null) },
        },
        default: 'ok',
        render: (html) => html.find('#lh-char').val(fallbackId),
      },
      { classes: ['lh'] }
    ).render(true);
  });
}
