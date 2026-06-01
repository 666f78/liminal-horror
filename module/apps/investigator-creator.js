import { applyBackstory, getBackstoryOptions as getRawBackstoryOptions } from '../content/backstories.js';
import {
  buildInvestigatorStatsUpdate,
  canRollInvestigatorField,
  getInitialInvestigatorDetails,
  getInitialInvestigatorStats,
  mergeGeneratedDescription,
  rollInvestigatorAttributes,
  rollInvestigatorBackstoryId,
  rollInvestigatorDetails,
  rollInvestigatorField,
  shouldShowLuck,
} from '../content/investigator-generator.js';
import { t } from '../utils/i18n.js';

const SWAPPABLE_ATTRIBUTE_KEYS = ['str', 'dex', 'ctrl'];

function getBackstoryOptions(selectedId = '') {
  return getRawBackstoryOptions().map((option) => ({
    ...option,
    id: String(option.id),
    selected: String(selectedId) === String(option.id),
    selectedAttr: String(selectedId) === String(option.id) ? 'selected' : '',
  }));
}

function getBackstoryItemsHint(options) {
  return options.find((option) => option.selected)?.itemsHint ?? t('LH.investigatorCreator.chooseBackstoryHint');
}

function configureSwapAttributeDialog(dialog) {
  const firstSelect = dialog.element.querySelector('[name="first"]');
  const secondSelect = dialog.element.querySelector('[name="second"]');
  const swapButton = dialog.element.querySelector('[data-action="swap"]');

  if (!firstSelect || !secondSelect || firstSelect.dataset.lhSwapBound) return;
  firstSelect.dataset.lhSwapBound = 'true';

  const syncOptions = () => {
    for (const option of secondSelect.options) {
      option.disabled = option.value === firstSelect.value;
    }

    if (secondSelect.value === firstSelect.value) {
      const fallback = Array.from(secondSelect.options).find((option) => !option.disabled);
      if (fallback) secondSelect.value = fallback.value;
    }

    if (swapButton) swapButton.disabled = firstSelect.value === secondSelect.value;
  };

  firstSelect.addEventListener('change', syncOptions);
  secondSelect.addEventListener('change', syncOptions);
  syncOptions();
}

export class InvestigatorCreator extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  static DEFAULT_OPTIONS = {
    classes: ['lh-appv2'],
    tag: 'form',
    window: {
      title: 'LH.investigatorCreator.windowHeader',
      icon: 'fa-solid fa-input-text',
      resizable: true,
    },
    form: {
      handler: this.submit,
      closeOnSubmit: true,
    },
    actions: {
      roll: this.roll,
      swapAttributes: this.swapAttributes,
    },
    position: {
      width: 720,
      height: 'auto',
    },
  };

  static PARTS = {
    form: { template: 'systems/liminal-horror/templates/generator/generator.hbs' },
  };

  constructor(actor) {
    super();
    this.actor = actor;
  }

  async _prepareContext() {
    const showLuck = shouldShowLuck();

    this.stats ??= getInitialInvestigatorStats();

    this.details ??= getInitialInvestigatorDetails();

    const backstoryOptions = getBackstoryOptions(this.details.backstoryId);

    return {
      ...this.details,
      ...this.stats,
      showLuck,
      lockAttributes: this.lockAttributes,
      disableSwapAttributes: !this.lockAttributes || this.hasSwappedAttributes,
      backstoryOptions,
      backstoryItemsHint: getBackstoryItemsHint(backstoryOptions),
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);

    const backstorySelect = this.element.querySelector('[name="backstoryId"]');
    const backstoryItemsHint = this.element.querySelector('[data-backstory-items-hint]');
    if (!backstorySelect || !backstoryItemsHint || backstorySelect.dataset.lhBackstoryHintBound) return;

    backstorySelect.dataset.lhBackstoryHintBound = 'true';
    const syncBackstoryItemsHint = () => {
      this.details ??= {};
      this.details.backstoryId = backstorySelect.value;
      backstoryItemsHint.textContent =
        backstorySelect.selectedOptions[0]?.dataset.items || t('LH.investigatorCreator.chooseBackstoryHint');
    };

    backstorySelect.addEventListener('change', syncBackstoryItemsHint);
    syncBackstoryItemsHint();
  }

  static async submit(e, form, { object }) {
    const updateData = {};
    const details = {
      aesthetics: object.aesthetics,
      firstEncounter: object.firstEncounter,
      ideology: object.ideology,
      physique: object.physique,
      face: object.face,
      speech: object.speech,
      virtue: object.virtue,
      flaw: object.flaw,
      misfortune: object.misfortune,
    };

    const changedDetails = Object.fromEntries(
      Object.entries(details).filter(([, value]) => String(value ?? '').trim() !== '')
    );

    if (Object.keys(changedDetails).length) {
      updateData['system.identity.description'] = mergeGeneratedDescription(
        this.actor.system?.identity?.description,
        changedDetails
      );
    }

    if (this.lockAttributes) {
      Object.assign(updateData, buildInvestigatorStatsUpdate(object));
    }

    if (Object.keys(updateData).length) await this.actor.update(updateData);

    if (object.backstoryId) await applyBackstory(this.actor, object.backstoryId);
  }

  static async roll(event, target) {
    const key = target.dataset.key;
    if (key === 'attributes') {
      this.stats = await rollInvestigatorAttributes();
      this.lockAttributes = true;
      this.hasSwappedAttributes = false;
      this.render();
      return;
    } else if (key === 'backstory') {
      this.details ??= {};
      this.details.backstoryId = rollInvestigatorBackstoryId();
      this.render();
      return;
    } else if (key === 'details') {
      this.details ??= {};
      Object.assign(this.details, rollInvestigatorDetails());
      this.render();
      return;
    }

    this.details ??= {};
    if (canRollInvestigatorField(key)) this.details[key] = rollInvestigatorField(key);
    this.render();
  }

  static async swapAttributes() {
    if (!this.lockAttributes) {
      ui.notifications.warn(t('LH.investigatorCreator.rollAttributesFirst'));
      return;
    }

    if (this.hasSwappedAttributes) {
      ui.notifications.warn(t('LH.investigatorCreator.swapAttributesOnce'));
      return;
    }

    const hasAllAttributes = SWAPPABLE_ATTRIBUTE_KEYS.every(
      (key) => this.stats?.[key] !== '' && this.stats?.[key] != null
    );

    if (!hasAllAttributes) {
      ui.notifications.warn(t('LH.investigatorCreator.rollAttributesFirst'));
      return;
    }

    const firstOptionHtml = `
      <option value="str">${t('LH.attr.full.str')}</option>
      <option value="dex">${t('LH.attr.full.dex')}</option>
      <option value="ctrl">${t('LH.attr.full.ctrl')}</option>
    `;
    const secondOptionHtml = `
      <option value="str">${t('LH.attr.full.str')}</option>
      <option value="dex" selected>${t('LH.attr.full.dex')}</option>
      <option value="ctrl">${t('LH.attr.full.ctrl')}</option>
    `;

    let selection;
    try {
      selection = await foundry.applications.api.DialogV2.wait({
        classes: ['lh', 'lh-confirm-dialog', 'lh-swap-dialog'],
        window: { title: t('LH.investigatorCreator.swapAttributes') },
        position: { width: 390 },
        rejectClose: false,
        modal: true,
        render: (_event, dialog) => configureSwapAttributeDialog(dialog),
        content: `
        <div class="lh lh-swap-attributes-dialog">
          <div class="generator-row">
            <label class="generator-label" for="lh-swap-first" title="${t('LH.investigatorCreator.firstAttribute')}">${t('LH.investigatorCreator.firstAttributeShort')}</label>
            <div class="generator-control generator-control-select">
              <select id="lh-swap-first" class="big-input" name="first">${firstOptionHtml}</select>
            </div>
          </div>

          <div class="generator-row">
            <label class="generator-label" for="lh-swap-second" title="${t('LH.investigatorCreator.secondAttribute')}">${t('LH.investigatorCreator.secondAttributeShort')}</label>
            <div class="generator-control generator-control-select">
              <select id="lh-swap-second" class="big-input" name="second">${secondOptionHtml}</select>
            </div>
          </div>
        </div>
      `,
        buttons: [
          {
            action: 'swap',
            icon: 'fa-solid fa-right-left',
            label: t('LH.investigatorCreator.swap'),
            default: true,
            callback: (_event, button) => ({
              first: button.form?.elements?.first?.value,
              second: button.form?.elements?.second?.value,
            }),
          },
          {
            action: 'cancel',
            icon: 'fa-solid fa-xmark',
            label: t('LH.core.cancel'),
            callback: () => null,
          },
        ],
      });
    } catch {
      return;
    }

    if (!selection) return;

    const { first, second } = selection;
    if (!SWAPPABLE_ATTRIBUTE_KEYS.includes(first) || !SWAPPABLE_ATTRIBUTE_KEYS.includes(second) || first === second) {
      ui.notifications.warn(t('LH.investigatorCreator.swapDifferentAttributes'));
      return;
    }

    const firstValue = this.stats[first];
    this.stats[first] = this.stats[second];
    this.stats[second] = firstValue;
    this.hasSwappedAttributes = true;

    this.render();
  }
}
