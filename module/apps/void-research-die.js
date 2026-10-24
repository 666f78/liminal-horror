import { sendRollMessage } from '../utils/chat.js';
import { t } from '../utils/i18n.js';

export async function rollVoidResearchDie() {
  const roll = await new Roll('1d20').evaluate();
  const n = roll.total;

  const { title, body, pickInvestigator, outcomeType, icon } = resolveVoidTable(n);

  let investigatorNote = '';
  if (pickInvestigator) {
    const inv = pickRandomInvestigator();
    if (inv) {
      investigatorNote = `<div><b>${foundry.utils.escapeHTML(t('LH.void.randomInvestigator'))}:</b> ${foundry.utils.escapeHTML(inv.name)}</div>`;
    } else {
      investigatorNote = `<div><i>${foundry.utils.escapeHTML(t('LH.void.randomInvestigatorNotFound'))}</i></div>`;
    }
  }

  const content = `
<div class="lh result-roll-card result-roll-card--${outcomeType} void-roll-card">
  <div class="lh-result-roll__heading">
    <strong>${foundry.utils.escapeHTML(t('LH.void.die'))}</strong>
  </div>
  <div class="lh-result-roll__result">
    ${await roll.render()}
    <div class="lh-result-roll__outcome">
      <strong><i class="fa-solid ${icon}" aria-hidden="true"></i><span>${foundry.utils.escapeHTML(t(title))}</span></strong>
    </div>
  </div>
  <div class="lh-section lh-result-roll__description">
    <div class="lh-body">${foundry.utils.escapeHTML(t(body))}</div>
    ${investigatorNote ? `<div class="lh-investigator">${investigatorNote}</div>` : ''}
  </div>
</div>
`.trim();

  await sendRollMessage(roll, {
    user: game.user,
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
      outcomeType: 'bad',
      icon: 'fa-eye',
      pickInvestigator: true,
    };
  }
  if (n >= 2 && n <= 4) {
    return {
      title: 'LH.void.encounter.title',
      body: 'LH.void.encounter.description',
      outcomeType: 'bad',
      icon: 'fa-user',
    };
  }
  if (n >= 5 && n <= 7) {
    return {
      title: 'LH.void.horror.title',
      body: 'LH.void.horror.description',
      outcomeType: 'bad',
      icon: 'fa-brain',
    };
  }
  if (n >= 8 && n <= 10) {
    return {
      title: 'LH.void.setback.title',
      body: 'LH.void.setback.description',
      outcomeType: 'bad',
      icon: 'fa-bolt',
    };
  }
  if (n >= 11 && n <= 13) {
    return {
      title: 'LH.void.locality.title',
      body: 'LH.void.locality.description',
      outcomeType: 'mixed',
      icon: 'fa-right-left',
    };
  }
  if (n >= 14 && n <= 16) {
    return {
      title: 'LH.void.clue.title',
      body: 'LH.void.clue.description',
      outcomeType: 'good',
      icon: 'fa-lightbulb',
    };
  }
  if (n >= 17 && n <= 19) {
    return {
      title: 'LH.void.free.title',
      body: 'LH.void.free.description',
      outcomeType: 'good',
      icon: 'fa-check',
    };
  }
  return {
    title: 'LH.void.regroup.title',
    body: 'LH.void.regroup.description',
    outcomeType: 'good',
    icon: 'fa-bed',
  };
}

function pickRandomInvestigator() {
  const sceneChars = canvas?.tokens?.placeables?.map((t) => t.actor)?.filter((a) => a && a.type === 'investigator');
  if (sceneChars?.length) return sceneChars[Math.floor(Math.random() * sceneChars.length)];

  const allChars = game.actors?.filter((a) => a.type === 'investigator');
  if (allChars?.length) return allChars[Math.floor(Math.random() * allChars.length)];

  return null;
}
