import { createChatMessage } from '../utils/chat.js';
import { t } from '../utils/i18n.js';

function pickKey(section, max) {
  return game.i18n.localize(`LH.char.${section}.${Math.floor(Math.random() * max) + 1}`);
}

export async function generateInvestigator() {
  const content = `
  <div class="lh roll-card">
    <header><strong>${t('LH.char.labels.generatedHeader')}</strong></header>
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
