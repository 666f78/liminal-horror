import { openDamageDialog, openStressDialog } from '../apps/effect-dialogs.js';
import { rollVoidResearchDie } from '../apps/void-research-die.js';
import { dLog, dWarn, withGroup } from '../utils/debug.js';
import { pickInvestigatorDialog } from '../utils/pickPlayer.js';

const TOKEN_CONTROL_NAME = 'tokens';
const TOOL_NAMES = new Set(['lh-sep', 'lh-apply-damage', 'lh-apply-stress', 'lh-void-research-die']);

async function selectActor({ title }) {
  try {
    const controlled = canvas.tokens?.controlled?.[0]?.actor ?? null;
    if (controlled) return controlled;
    return await pickInvestigatorDialog({ title, onlyOwned: false });
  } catch (error) {
    dWarn('sceneControls.selectActor error', error);
    return null;
  }
}

function getTools() {
  return {
    'lh-apply-damage': {
      name: 'lh-apply-damage',
      title: 'Add Injuries',
      icon: 'fa-solid fa-heart-crack',
      order: 901,
      button: true,
      onChange: async () => {
        try {
          const actor = await selectActor({ title: 'Add Injuries to Investigator' });
          if (actor) await openDamageDialog(actor);
        } catch (e) {
          dWarn('sceneControls.tool.lh-apply-damage error', e);
        }
      },
    },
    'lh-apply-stress': {
      name: 'lh-apply-stress',
      title: 'Add Consequence',
      icon: 'fa-solid fa-brain',
      order: 902,
      button: true,
      onChange: async () => {
        try {
          const actor = await selectActor({ title: 'Add Consequence to Investigator' });
          if (actor) await openStressDialog(actor);
        } catch (e) {
          dWarn('sceneControls.tool.lh-apply-stress error', e);
        }
      },
    },
    'lh-void-research-die': {
      name: 'lh-void-research-die',
      title: 'Voidcrawl',
      icon: 'fa-solid fa-circle-notch',
      order: 903,
      button: true,
      onChange: async () => {
        try {
          await rollVoidResearchDie();
        } catch (e) {
          dWarn('sceneControls.tool.lh-void-research-die error', e);
        }
      },
    },
  };
}

function onGetSceneControlButtons(controls) {
  try {
    if (!game.user?.isGM) return;
    const tokenControls = controls[TOKEN_CONTROL_NAME];
    if (!tokenControls) return;
    for (const key of Object.keys(tokenControls.tools)) {
      if (TOOL_NAMES.has(key)) {
        delete tokenControls.tools[key];
      }
    }
    Object.assign(tokenControls.tools, getTools());
  } catch (error) {
    dWarn('sceneControls.register error', error);
  }
}

export const registerSceneControlHooks = () => {
  withGroup('sceneControlsHook', () => {
    Hooks.on('getSceneControlButtons', onGetSceneControlButtons);
    dLog('scene control tools registered');
  });
};
