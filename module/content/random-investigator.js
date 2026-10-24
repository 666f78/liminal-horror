import { renderCard, renderCardRows } from '../utils/chat-card.js';
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
  const stats = [
    { label: t('LH.attr.short.str'), value: str },
    { label: t('LH.attr.short.dex'), value: dex },
    { label: t('LH.attr.short.ctrl'), value: ctrl },
    ...(showLuck ? [{ label: t('LH.attr.short.luck'), value: luck }] : []),
    { label: t('LH.ui.hp'), value: hp },
    { label: t('LH.ui.cash'), value: cash },
  ];
  const detailRows = buildInvestigatorDetailListItems(details);

  return renderCard(actorName, [{ label: t('LH.char.labels.backstory'), value: foundry.utils.escapeHTML(backstory) }], {
    icon: 'fa-user',
    description: `
      <div class="lh-generated-stats">${renderCardRows(stats)}</div>
      <ul class="lh-chat-details">${detailRows}</ul>`,
  });
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
  const content = renderCard(
    t('LH.char.labels.generatedHeader'),
    [{ label: t('LH.char.labels.backstory'), value: foundry.utils.escapeHTML(rollInvestigatorField('backstory')) }],
    {
      icon: 'fa-user',
      description: `<ul class="lh-chat-details">${buildInvestigatorDetailListItems(details)}</ul>`,
    }
  );

  await createChatMessage({
    user: game.user,
    content,
  });
}
