import { createChatMessage } from '../utils/chat.js';
import { applyBackstory } from './backstories.js';
import {
  buildGeneratedDescription,
  buildInvestigatorAttributesData,
  buildInvestigatorDetailListItems,
  INVESTIGATOR_DESCRIPTION_FIELDS,
  rollInvestigatorAttributes,
  rollInvestigatorBackstoryId,
  rollInvestigatorDetails,
  rollInvestigatorField,
  shouldShowLuck,
} from './investigator-generator.js';
import { t } from '../utils/i18n.js';

function getGeneratedActorName() {
  const baseName = t('LH.char.labels.generatedHeader');
  const count = game.actors.filter((actor) => actor.type === 'investigator').length;
  return `${baseName} ${count + 1}`;
}

function buildGeneratedActorChatContent({ actorName, backstory, str, dex, ctrl, luck, hp, cash, details, showLuck }) {
  const luckRow = showLuck ? `<li><b>${t('LH.attr.short.luck')}:</b> ${luck}</li>` : '';
  const detailRows = buildInvestigatorDetailListItems(details);

  return `
  <div class="lh roll-card">
    <header><strong>${actorName}</strong></header>
    <ul>
      <li><b>${t('LH.char.labels.backstory')}:</b> ${backstory}</li>
      <li><b>${t('LH.attr.short.str')}:</b> ${str}</li>
      <li><b>${t('LH.attr.short.dex')}:</b> ${dex}</li>
      <li><b>${t('LH.attr.short.ctrl')}:</b> ${ctrl}</li>
      ${luckRow}
      <li><b>${t('LH.ui.hp')}:</b> ${hp}</li>
      <li><b>${t('LH.ui.cash')}:</b> ${cash}</li>
      ${detailRows}
    </ul>
  </div>`;
}

export async function generateActor() {
  const showLuck = shouldShowLuck();
  const stats = await rollInvestigatorAttributes({ showLuck });
  const details = {
    ...rollInvestigatorDetails(),
    firstEncounter: rollInvestigatorField('firstEncounter'),
  };

  const actorName = getGeneratedActorName();

  const actor = await Actor.create(
    {
      name: actorName,
      type: 'investigator',
      system: {
        identity: {
          description: buildGeneratedDescription(details),
        },
        attributes: buildInvestigatorAttributesData(stats, { includeLuck: showLuck }),
        defense: {
          hp: stats.hp,
          hpMax: stats.hp,
        },
        inventory: {
          money: stats.cash,
        },
      },
    },
    { renderSheet: true }
  );

  const backstoryId = rollInvestigatorBackstoryId();
  await applyBackstory(actor, backstoryId);
  const backstory = actor.system?.identity?.background ?? '';

  await createChatMessage({
    user: game.user,
    actor,
    content: buildGeneratedActorChatContent({
      actorName,
      backstory,
      ...stats,
      details,
      showLuck,
    }),
  });

  actor.sheet?.render(true);

  return actor;
}

export async function generateInvestigator() {
  const details = Object.fromEntries(
    INVESTIGATOR_DESCRIPTION_FIELDS.map((field) => [field, rollInvestigatorField(field)])
  );
  const content = `
  <div class="lh roll-card">
    <ul>
      <li><b>${t('LH.char.labels.backstory')}:</b> ${rollInvestigatorField('backstory')}</li>
      ${buildInvestigatorDetailListItems(details)}
    </ul>
  </div>`;

  await createChatMessage({
    user: game.user,
    content,
  });
}
