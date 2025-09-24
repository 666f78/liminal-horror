import { sendRollMessage } from '../utils/chat.js';
import { t } from '../utils/i18n.js';

export async function rollVoidResearchDie() {
  const roll = await new Roll('1d20').evaluate();
  const n = roll.total;

  const { title, body, pickInvestigator } = resolveVoidTable(n);

  let investigatorNote = '';
  if (pickInvestigator) {
    const inv = pickRandomInvestigator();
    if (inv) investigatorNote = `<div><b>${t('LH.void.randomInvestigator')}:</b> ${inv.name}</div>`;
    else investigatorNote = `<div><i>${t('LH.void.randomInvestigatorNotFound')}</i></div>`;
  }

  const content = `
<div class="lh-void-roll">
    <div class="lh-void-head">
        <span class="lh-pill lh-pill-d20">D20</span>
        <span class="lh-title">${t('LH.void.die')}</span>
    </div>
    <span class="lh-result">${n}</span>

  <div class="lh-section">
    <div class="lh-subtitle">${t(`${title}`)}</div>
    ${investigatorNote ? `<div class="lh-investigator">${investigatorNote}</div>` : ''}
    <div class="lh-body">${t(`${body}`)}</div>
  </div>
</div>
`.trim();

  await sendRollMessage(roll, {
    user: game.user,
    flavor: '<b>Void Research Die</b>',
    content,
    whisperMode: 'gm',
    speaker: ChatMessage.getSpeaker(),
  });
}

function resolveVoidTable(n) {
  if (n === 1) {
    return {
      title: 'LH.void.omen.title',
      body: 'LH.void.omen.description',
      pickInvestigator: true,
    };
  }
  if (n >= 2 && n <= 4) {
    return {
      title: 'LH.void.encounter.title',
      body: 'LH.void.encounter.description',
    };
  }
  if (n >= 5 && n <= 7) {
    return {
      title: 'LH.void.horror.title',
      body: 'LH.void.horror.description',
    };
  }
  if (n >= 8 && n <= 10) {
    return {
      title: 'LH.void.setback.title',
      body: 'LH.void.setback.description',
    };
  }
  if (n >= 11 && n <= 13) {
    return {
      title: 'LH.void.locality.title',
      body: 'LH.void.locality.description',
    };
  }
  if (n >= 14 && n <= 16) {
    return {
      title: 'LH.void.clue.title',
      body: 'LH.void.clue.description',
    };
  }
  if (n >= 17 && n <= 19) {
    return {
      title: 'LH.void.free.title',
      body: 'LH.void.free.description',
    };
  }
  return {
    title: 'LH.void.regroup.title',
    body: 'LH.void.regroup.description',
  };
}

function pickRandomInvestigator() {
  const sceneChars = canvas?.tokens?.placeables?.map((t) => t.actor)?.filter((a) => a && a.type === 'investigator');
  if (sceneChars?.length) return sceneChars[Math.floor(Math.random() * sceneChars.length)];

  const allChars = game.actors?.filter((a) => a.type === 'investigator');
  if (allChars?.length) return allChars[Math.floor(Math.random() * allChars.length)];

  return null;
}
