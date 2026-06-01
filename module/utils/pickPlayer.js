import { t } from './i18n.js';

export async function pickInvestigatorDialog({
  title = t('LH.dialogs.pickInvestigator.title'),
  onlyOwned = false,
  preselectActorId = null,
} = {}) {
  let actors = game.actors.contents;
  if (onlyOwned) actors = actors.filter((a) => a.hasPlayerOwner);

  actors.sort((a, b) => a.name.localeCompare(b.name, 'uk'));

  if (!actors.length) {
    ui.notifications.warn(t('LH.dialogs.pickInvestigator.noneAvailable'));
    return null;
  }

  const options = actors
    .map((a) => {
      const owner =
        a.ownership?.[game.user.id] >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER
          ? ` ${t('LH.dialogs.pickInvestigator.ownerSuffix')}`
          : '';
      return `<option value="${a.id}">${a.name}${owner}</option>`;
    })
    .join('');

  const fallbackId =
    preselectActorId ?? canvas.tokens?.controlled?.[0]?.actor?.id ?? game.user?.investigator?.id ?? actors[0].id;

  const selection = await foundry.applications.api.DialogV2.wait({
    classes: ['lh', 'lh-confirm-dialog'],
    window: { title },
    modal: true,
    position: { width: 340 },
    rejectClose: false,
    content: `
        <div class="lh-dialog-form lh-pick-dialog">
          <label class="lh-dialog-label" for="lh-char">${t('LH.dialogs.pickInvestigator.label')}</label>
          <select id="lh-char" class="lh-dialog-select" name="actorId">${options}</select>
        </div>
      `,
    buttons: [
      {
        action: 'ok',
        label: t('LH.core.ok'),
        default: true,
        callback: (_event, button) => button.form?.elements?.actorId?.value ?? null,
      },
      { action: 'cancel', label: t('LH.core.cancel'), callback: () => null },
    ],
    render: (_event, dialog) => {
      dialog.element.querySelector('[name="actorId"]').value = fallbackId;
    },
  });

  return selection ? (game.actors.get(selection) ?? null) : null;
}
