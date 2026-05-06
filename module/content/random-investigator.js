import { createChatMessage } from '../utils/chat.js';
import { applyBackstory } from './backstories.js';
import { t } from '../utils/i18n.js';

function pickKey(section, max) {
  return game.i18n.localize(`LH.char.${section}.${Math.floor(Math.random() * max) + 1}`);
}

async function rollTotal(formula) {
  const roll = await new Roll(formula).evaluate();
  return roll.total;
}

function buildGeneratedDescription(details) {
  const fields = [
    ['aesthetics', details.aesthetics],
    ['firstEncounter', details.firstEncounter],
    ['ideology', details.ideology],
    ['physique', details.physique],
    ['face', details.face],
    ['speech', details.speech],
    ['virtue', details.virtue],
    ['flaw', details.flaw],
    ['misfortune', details.misfortune],
  ];

  const items = fields
    .map(([labelKey, value]) => `<li><b>${t(`LH.char.labels.${labelKey}`)}:</b> ${value}</li>`)
    .join('');

  return `<div class="lh generated-investigator"><ul>${items}</ul></div>`;
}

function getGeneratedActorName() {
  const baseName = t('LH.char.labels.generatedHeader');
  const count = game.actors.filter((actor) => actor.type === 'investigator').length;
  return `${baseName} ${count + 1}`;
}

function buildGeneratedActorChatContent({ actorName, backstory, str, dex, ctrl, luck, hp, cash, details, showLuck }) {
  const luckRow = showLuck ? `<li><b>${t('LH.attr.short.luck')}:</b> ${luck}</li>` : '';

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
      <li><b>${t('LH.char.labels.aesthetics')}:</b> ${details.aesthetics}</li>
      <li><b>${t('LH.char.labels.firstEncounter')}:</b> ${details.firstEncounter}</li>
      <li><b>${t('LH.char.labels.ideology')}:</b> ${details.ideology}</li>
      <li><b>${t('LH.char.labels.physique')}:</b> ${details.physique}</li>
      <li><b>${t('LH.char.labels.face')}:</b> ${details.face}</li>
      <li><b>${t('LH.char.labels.speech')}:</b> ${details.speech}</li>
      <li><b>${t('LH.char.labels.virtue')}:</b> ${details.virtue}</li>
      <li><b>${t('LH.char.labels.flaw')}:</b> ${details.flaw}</li>
      <li><b>${t('LH.char.labels.misfortune')}:</b> ${details.misfortune}</li>
    </ul>
  </div>`;
}

export async function generateActor() {
  const showLuck = game.settings.get('liminal-horror', 'appendixLuck');
  const [str, dex, ctrl, luck, hp, cash] = await Promise.all([
    rollTotal('3d6'),
    rollTotal('3d6'),
    rollTotal('3d6'),
    rollTotal('3d6'),
    rollTotal('1d6'),
    rollTotal('1d6 * 100'),
  ]);

  const details = {
    aesthetics: pickKey('aesthetics', 20),
    firstEncounter: pickKey('firstEncounter', 10),
    ideology: pickKey('ideology', 10),
    physique: pickKey('physique', 10),
    face: pickKey('face', 10),
    speech: pickKey('speech', 10),
    virtue: pickKey('virtue', 10),
    flaw: pickKey('flaw', 10),
    misfortune: pickKey('misfortune', 10),
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
        attributes: {
          str: { value: str, base: str },
          dex: { value: dex, base: dex },
          con: { value: ctrl, base: ctrl },
          luck: { value: luck, base: luck },
        },
        defense: {
          hp,
          hpMax: hp,
        },
        inventory: {
          money: cash,
        },
      },
    },
    { renderSheet: true }
  );

  const backstoryId = Math.floor(Math.random() * 20) + 1;
  await applyBackstory(actor, backstoryId);
  const backstory = actor.system?.identity?.background ?? '';

  await createChatMessage({
    user: game.user,
    actor,
    content: buildGeneratedActorChatContent({
      actorName,
      backstory,
      str,
      dex,
      ctrl,
      luck,
      hp,
      cash,
      details,
      showLuck,
    }),
  });

  actor.sheet?.render(true);

  return actor;
}

export async function generateInvestigator() {
  const content = `
  <div class="lh roll-card">
    <ul>
      <li><b>${t('LH.char.labels.backstory')}:</b> ${pickKey('backstory', 20)}</li>
      <li><b>${t('LH.char.labels.aesthetics')}:</b> ${pickKey('aesthetics', 20)}</li>
      <li><b>${t('LH.char.labels.firstEncounter')}:</b> ${pickKey('firstEncounter', 10)}</li>
      <li><b>${t('LH.char.labels.ideology')}:</b> ${pickKey('ideology', 10)}</li>
      <li><b>${t('LH.char.labels.physique')}:</b> ${pickKey('physique', 10)}</li>
      <li><b>${t('LH.char.labels.face')}:</b> ${pickKey('face', 10)}</li>
      <li><b>${t('LH.char.labels.speech')}:</b> ${pickKey('speech', 10)}</li>
      <li><b>${t('LH.char.labels.virtue')}:</b> ${pickKey('virtue', 10)}</li>
      <li><b>${t('LH.char.labels.flaw')}:</b> ${pickKey('flaw', 10)}</li>
      <li><b>${t('LH.char.labels.misfortune')}:</b> ${pickKey('misfortune', 10)}</li>
    </ul>
  </div>`;

  await createChatMessage({
    user: game.user,
    content,
  });
}
