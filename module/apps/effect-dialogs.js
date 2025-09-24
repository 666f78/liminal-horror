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

function getDamageFormMarkup() {
  const typeOptions = renderSelectOptions(Object.entries(DAMAGE_TYPES), ([key, label]) =>
    renderLabeledOption(key, t(label))
  );

  const severityOptions = renderSelectOptions(
    Array.from({ length: 8 }, (_value, index) => index + 1),
    (severity) => renderLabeledOption(severity, `${severity} - ${t(DAMAGE_LEVELS[severity])}`)
  );

  return `
    <div class="card">
      <div class="flexrow" style="gap:8px;">
        <div class="flexcol">
          <label>${t('LH.dialogs.damage.type')}</label>
          <select id="inj-type">${typeOptions}</select>
        </div>
        <div class="flexcol">
          <label>${t('LH.dialogs.damage.severity')}</label>
          <select id="inj-sev">${severityOptions}</select>
        </div>
      </div>
      <label class="lh-dialog-label">${t('LH.dialogs.damage.description')}</label>
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

  new Dialog(
    {
      title: t('LH.dialogs.damage.title'),
      content: getDamageFormMarkup(),
      buttons: {
        random: {
          label: t('LH.dialogs.damage.random'),
          callback: async (html) => {
            try {
              const type = html.find('#inj-type').val();
              const roll = await new Roll('1d8').evaluate();
              const severity = roll.total;
              const description = t(defaultDamageDescription(severity, type));

              await applyItems(actor, [buildInjury(severity, description)], onApplied);
              ui.notifications.info(
                `${t('LH.dialogs.damage.applied')} | ${t(DAMAGE_LEVELS[severity])} - ${description}`
              );
            } catch (error) {
              dWarn('damageDialog.random error', error);
            }
          },
        },
        apply: {
          label: t('LH.core.apply'),
          callback: async (html) => {
            try {
              const type = html.find('#inj-type').val();
              const severity = Number(html.find('#inj-sev').val());
              const description = String(
                html.find('#inj-desc').val()?.trim() || defaultDamageDescription(severity, type)
              );

              await applyItems(actor, [buildInjury(severity, description)], onApplied);
              ui.notifications.info(
                `${t('LH.dialogs.damage.applied')} | ${t(DAMAGE_LEVELS[severity])} - ${description}`
              );
            } catch (error) {
              dWarn('damageDialog.apply error', error);
            }
          },
        },
        cancel: { label: t('LH.core.cancel') },
      },
      default: 'apply',
      render: (html) => {
        const sync = () => {
          const type = html.find('#inj-type').val();
          const severity = Number(html.find('#inj-sev').val());
          html.find('#inj-desc').val(t(defaultDamageDescription(severity, type)));
        };
        html.find('#inj-type').on('change', sync);
        html.find('#inj-sev').on('change', sync);
        sync();
      },
    },
    { classes: ['lh'] }
  ).render(true);
}

function getStressFormMarkup() {
  const choiceOptions = renderSelectOptions(STRESS_TABLE, (entry, index) =>
    renderLabeledOption(index, `${index + 1}. ${t(entry.name)}`)
  );

  return `
    <div class="card lh-stress-dialog">
      <label>${t('LH.dialogs.stress.consequence')}</label>
      <select id="stress-choice">${choiceOptions}</select>
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

  new Dialog(
    {
      title: t('LH.dialogs.stress.title'),
      content: getStressFormMarkup(),
      buttons: {
        random: {
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
        apply: {
          label: t('LH.core.apply'),
          callback: async (html) => {
            try {
              const index = Number(html.find('#stress-choice').val());
              const entry = STRESS_TABLE[index];
              if (!entry) return;

              await applyItems(actor, [buildConsequence(entry)], onApplied);
              ui.notifications.info(`${t('LH.dialogs.stress.applied')} | ${t(entry.name)} - ${t(entry.description)}`);
            } catch (error) {
              dWarn('stressDialog.apply error', error);
            }
          },
        },
        cancel: { label: t('LH.core.cancel') },
      },
      default: 'apply',
      render: (html) => {
        const updatePreview = () => {
          const index = Number(html.find('#stress-choice').val());
          const entry = STRESS_TABLE[index];
          html.find('#stress-preview').text(t(entry?.description) ?? '');
        };
        html.find('#stress-choice').on('change', updatePreview);
        updatePreview();
      },
    },
    { classes: ['lh'] }
  ).render(true);
}
