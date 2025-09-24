import { renderCard } from '../utils/chat-card.js';
import { createChatMessage } from '../utils/chat.js';
import { t } from '../utils/i18n.js';

const toNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

export async function restActor(
  actor,
  { full = false, ignoreDeprived = false, clearInjuries = false, clearConsequences = false } = {}
) {
  const system = actor.system ?? {};
  const deprived = !!system.status?.deprived;

  if (system.attributes.str.value <= 0 || system.attributes.dex.value <= 0 || system.attributes.con.value <= 0) {
    const blocks = [
      system.attributes.str.value <= 0 && t('LH.status.dead'),
      system.attributes.dex.value <= 0 && t('LH.status.paralysis'),
      system.attributes.con.value <= 0 && t('LH.status.lost'),
    ]
      .filter(Boolean)
      .join(' / ');

    ui.notifications.warn(`${t('LH.core.restBlocked')}: ${blocks}`);
    return;
  }

  if (deprived && !ignoreDeprived) {
    const blockedCard = renderCard(t('LH.core.rest'), [
      `<span style="color:var(--lh-text-muted, #666);"><i>${t('LH.msg.deprivedRestBlocked')}</i></span>`,
    ]);
    await createChatMessage({ actor, content: blockedCard });
    ui.notifications.warn(`${t('LH.core.restBlocked')}: ${t('LH.ui.deprivedFull')}`);
    return;
  }

  const hpCurrent = toNumber(system.defense?.hp);
  const hpMax = toNumber(system.defense?.hpMax, hpCurrent);

  const updates = { 'system.defense.hp': hpMax };
  if (full) {
    updates['system.attributes.str.value'] = toNumber(system.attributes?.str?.base, system.attributes?.str?.value ?? 0);
    updates['system.attributes.con.value'] = toNumber(system.attributes?.con?.base, system.attributes?.con?.value ?? 0);
  }

  await actor.update(updates);

  const deletions = [];
  if (clearInjuries) deletions.push(...actor.items.filter((item) => item.type === 'injury').map((item) => item.id));
  if (clearConsequences)
    deletions.push(...actor.items.filter((item) => item.type === 'consequence').map((item) => item.id));
  if (deletions.length) await actor.deleteEmbeddedDocuments('Item', deletions);

  const restNote = full ? t('LH.core.fullRestCompleted') : t('LH.core.restCompleted');
  const rows = [`<span style="color:var(--lh-text-muted, #666);"><i>${restNote}</i></span>`];

  const restoredCard = renderCard(t('LH.core.rest'), rows);
  await createChatMessage({ actor, content: restoredCard });
  ui.notifications.info(full ? 'Full Rest applied' : 'Rest applied');
}
