import { DAMAGE_LEVELS, DAMAGE_TABLE, DAMAGE_TYPES } from '../data/damage-table.js';
import { STRESS_TABLE } from '../data/stress-table.js';
import { dWarn } from '../utils/debug.js';
import { t } from '../utils/i18n.js';

const ensureActor = (actor) => {
  if (actor) return true;
  ui.notifications.warn('Actor not found (actor/token).');
  return false;
};

const createItems = (actor, items) => actor.createEmbeddedDocuments('Item', items);

const applyItems = async (actor, items, onApplied) => {
  await createItems(actor, items);
  await onApplied?.();
};

const renderSelectOptions = (entries, render) => entries.map(render).join('');
const renderLabeledOption = (value, label) => `<option value="${value}">${label}</option>`;
const getDialogField = (button, selector) => button.form?.querySelector(selector);
const getDialogFieldValue = (button, selector) => getDialogField(button, selector)?.value;

function getDamageFormMarkup() {
  const typeOptions = renderSelectOptions(Object.entries(DAMAGE_TYPES), ([key, label]) =>
    renderLabeledOption(key, t(label))
  );

  const severityOptions = renderSelectOptions(
    Array.from({ length: 8 }, (_value, index) => index + 1),
    (severity) => renderLabeledOption(severity, `${severity} - ${t(DAMAGE_LEVELS[severity])}`)
  );

  return `
    <div class="lh-dialog-form lh-damage-dialog">
      <div class="lh-dialog-grid">
        <div class="lh-dialog-field">
          <label class="lh-dialog-label" for="inj-type">${t('LH.dialogs.damage.type')}</label>
          <select id="inj-type" class="lh-dialog-select">${typeOptions}</select>
        </div>
        <div class="lh-dialog-field">
          <label class="lh-dialog-label" for="inj-sev">${t('LH.dialogs.damage.severity')}</label>
          <select id="inj-sev" class="lh-dialog-select">${severityOptions}</select>
        </div>
      </div>
      <label class="lh-dialog-label" for="inj-desc">${t('LH.dialogs.damage.description')}</label>
      <textarea id="inj-desc" rows="4" class="lh-dialog-textarea"></textarea>
    </div>
  `;
}

function defaultDamageDescription(severity, type) {
  return DAMAGE_TABLE?.[severity]?.[type] ?? '';
}

function buildInjury(severity, description) {
  return {
    name: t(DAMAGE_LEVELS[severity]),
    type: 'injury',
    system: {
      slotSize: 1,
      description,
    },
  };
}

export async function openDamageDialog(actor, { onApplied } = {}) {
  if (!ensureActor(actor)) return;

  await foundry.applications.api.DialogV2.wait({
    classes: ['lh', 'lh-confirm-dialog'],
    window: { title: t('LH.dialogs.damage.title') },
    position: { width: 430 },
    rejectClose: false,
    content: getDamageFormMarkup(),
    buttons: [
      {
        action: 'random',
        label: t('LH.dialogs.damage.random'),
        callback: async (_event, button) => {
          try {
            const type = getDialogFieldValue(button, '#inj-type');
            const roll = await new Roll('1d8').evaluate();
            const severity = roll.total;
            const description = t(defaultDamageDescription(severity, type));

            await applyItems(actor, [buildInjury(severity, description)], onApplied);
            ui.notifications.info(`${t('LH.dialogs.damage.applied')} | ${t(DAMAGE_LEVELS[severity])} - ${description}`);
          } catch (error) {
            dWarn('damageDialog.random error', error);
          }
        },
      },
      {
        action: 'apply',
        label: t('LH.core.apply'),
        default: true,
        callback: async (_event, button) => {
          try {
            const type = getDialogFieldValue(button, '#inj-type');
            const severity = Number(getDialogFieldValue(button, '#inj-sev'));
            const description = String(
              getDialogFieldValue(button, '#inj-desc')?.trim() || defaultDamageDescription(severity, type)
            );

            await applyItems(actor, [buildInjury(severity, description)], onApplied);
            ui.notifications.info(`${t('LH.dialogs.damage.applied')} | ${t(DAMAGE_LEVELS[severity])} - ${description}`);
          } catch (error) {
            dWarn('damageDialog.apply error', error);
          }
        },
      },
      { action: 'cancel', label: t('LH.core.cancel') },
    ],
    render: (_event, dialog) => {
      const typeSelect = dialog.element.querySelector('#inj-type');
      const severitySelect = dialog.element.querySelector('#inj-sev');
      const descriptionField = dialog.element.querySelector('#inj-desc');
      const sync = () => {
        const type = typeSelect.value;
        const severity = Number(severitySelect.value);
        descriptionField.value = t(defaultDamageDescription(severity, type));
      };
      typeSelect.addEventListener('change', sync);
      severitySelect.addEventListener('change', sync);
      sync();
    },
  });
}

function getStressFormMarkup() {
  const choiceOptions = renderSelectOptions(STRESS_TABLE, (entry, index) =>
    renderLabeledOption(index, `${index + 1}. ${t(entry.name)}`)
  );

  return `
    <div class="lh-dialog-form lh-stress-dialog">
      <label class="lh-dialog-label" for="stress-choice">${t('LH.dialogs.stress.consequence')}</label>
      <select id="stress-choice" class="lh-dialog-select">${choiceOptions}</select>
      <div id="stress-preview" class="lh-dialog-preview"></div>
    </div>
  `;
}

function buildConsequence(entry) {
  return {
    name: t(entry.name),
    type: 'consequence',
    system: {
      description: t(entry.description),
      slotSize: 1,
    },
  };
}

export async function openStressDialog(actor, { onApplied } = {}) {
  if (!ensureActor(actor)) return;

  await foundry.applications.api.DialogV2.wait({
    classes: ['lh', 'lh-confirm-dialog'],
    window: { title: t('LH.dialogs.stress.title') },
    position: { width: 640 },
    rejectClose: false,
    content: getStressFormMarkup(),
    buttons: [
      {
        action: 'random',
        label: t('LH.dialogs.stress.random'),
        callback: async () => {
          try {
            const roll = await new Roll('1d20').evaluate();
            const entry = STRESS_TABLE[roll.total - 1];
            if (!entry) return;

            await applyItems(actor, [buildConsequence(entry)], onApplied);
            ui.notifications.info(`${t('LH.dialogs.stress.applied')} | ${t(entry.name)} - ${t(entry.description)}`);
          } catch (error) {
            dWarn('stressDialog.random error', error);
          }
        },
      },
      {
        action: 'apply',
        label: t('LH.core.apply'),
        default: true,
        callback: async (_event, button) => {
          try {
            const index = Number(getDialogFieldValue(button, '#stress-choice'));
            const entry = STRESS_TABLE[index];
            if (!entry) return;

            await applyItems(actor, [buildConsequence(entry)], onApplied);
            ui.notifications.info(`${t('LH.dialogs.stress.applied')} | ${t(entry.name)} - ${t(entry.description)}`);
          } catch (error) {
            dWarn('stressDialog.apply error', error);
          }
        },
      },
      { action: 'cancel', label: t('LH.core.cancel') },
    ],
    render: (_event, dialog) => {
      const choiceSelect = dialog.element.querySelector('#stress-choice');
      const preview = dialog.element.querySelector('#stress-preview');
      const updatePreview = () => {
        const index = Number(choiceSelect.value);
        const entry = STRESS_TABLE[index];
        preview.textContent = t(entry?.description) ?? '';
      };
      choiceSelect.addEventListener('change', updatePreview);
      updatePreview();
    },
  });
}
