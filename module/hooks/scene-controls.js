import { openDamageDialog, openStressDialog } from '../apps/effect-dialogs.js';
import { rollVoidResearchDie } from '../apps/void-research-die.js';
import { dLog, dWarn, withGroup } from '../utils/debug.js';
import { pickInvestigatorDialog } from '../utils/pickPlayer.js';

const TOKEN_CONTROL_NAME = 'token';
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

const TOOL_CONFIGURATIONS = [
  {
    name: 'lh-apply-damage',
    title: 'Add Injuries',
    icon: 'fas fa-heart-broken',
    action: async () => {
      const actor = await selectActor({ title: 'Add Injuries to Investigator' });
      if (!actor) return;
      await openDamageDialog(actor);
    },
  },
  {
    name: 'lh-apply-stress',
    title: 'Add Consequence',
    icon: 'fas fa-brain',
    action: async () => {
      const actor = await selectActor({ title: 'Add Consequence to Investigator' });
      if (!actor) return;
      await openStressDialog(actor);
    },
  },
  {
    name: 'lh-void-research-die',
    title: 'Voidcrawl',
    icon: 'fas fa-circle-notch',
    action: () => rollVoidResearchDie(),
  },
];

function getTools() {
  const tools = [{ name: 'lh-sep', type: 'separator' }];
  for (const { name, title, icon, action } of TOOL_CONFIGURATIONS) {
    tools.push({
      name,
      title,
      icon,
      button: true,
      onClick: async () => {
        try {
          await action();
        } catch (error) {
          dWarn(`sceneControls.tool.${name} error`, error);
        }
      },
    });
  }
  return tools;
}

function onGetSceneControlButtons(controls) {
  try {
    if (!game.user?.isGM) return;
    const tokenControls = controls.find((control) => control.name === TOKEN_CONTROL_NAME);
    if (!tokenControls) return;

    tokenControls.tools = tokenControls.tools.filter((tool) => !TOOL_NAMES.has(tool.name));
    tokenControls.tools.push(...getTools());
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
