import { applyBackstory, getBackstoryOptions as getRawBackstoryOptions } from '../content/backstories.js';
import {
  buildInvestigatorStatsUpdate,
  canRollInvestigatorField,
  getInitialInvestigatorDetails,
  getInitialInvestigatorStats,
  getRequiredInvestigatorStatKeys,
  mergeGeneratedDescription,
  rollInvestigatorStat,
  rollInvestigatorBackstoryId,
  rollInvestigatorDetails,
  rollInvestigatorField,
  shouldShowLuck,
} from '../content/investigator-generator.js';
import { isInvestigatorGeneratorRerollEnabled } from '../settings.js';
import { t } from '../utils/i18n.js';

const SWAPPABLE_ATTRIBUTE_KEYS = ['str', 'dex', 'ctrl'];
const GENERATOR_STATS_FLAG = 'investigatorGeneratorStats';
const GENERATOR_SWAPPED_FLAG = 'investigatorGeneratorSwapped';
const isRolledStatValue = (value) => Number(value ?? 0) > 0;
const canRerollAttributes = () => game.user.isGM || isInvestigatorGeneratorRerollEnabled();
const hasGeneratorFlagChanges = (changes) =>
  Object.keys(foundry.utils.flattenObject(changes?.flags?.['liminal-horror'] ?? {})).some((key) =>
    [GENERATOR_STATS_FLAG, `-=${GENERATOR_STATS_FLAG}`, GENERATOR_SWAPPED_FLAG, `-=${GENERATOR_SWAPPED_FLAG}`].includes(
      key
    )
  );

function getStoredStats(actor) {
  return {
    ...getInitialInvestigatorStats(),
    ...(actor?.getFlag('liminal-horror', GENERATOR_STATS_FLAG) ?? {}),
  };
}

function getBackstoryOptions(selectedId = '') {
  return getRawBackstoryOptions().map((option) => ({
    ...option,
    id: String(option.id),
    selected: String(selectedId) === String(option.id),
    selectedAttr: String(selectedId) === String(option.id) ? 'selected' : '',
  }));
}

function getBackstoryItemsHint(options) {
  return options.find((option) => option.selected)?.itemsHint ?? t('LH.investigatorGenerator.chooseBackstoryHint');
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

export class InvestigatorGenerator extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  static DEFAULT_OPTIONS = {
    classes: ['lh-appv2'],
    tag: 'form',
    window: {
      title: 'LH.investigatorGenerator.windowHeader',
      icon: 'fa-solid fa-input-text',
      resizable: true,
    },
    form: {
      handler: this.submit,
      closeOnSubmit: true,
    },
    actions: {
      roll: this.roll,
      resetAttributeLocks: this.resetAttributeLocks,
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
    this._onActorUpdate = (updatedActor, changes) => {
      if (updatedActor.id !== this.actor.id) return;
      if (!hasGeneratorFlagChanges(changes)) return;
      if (!this.element?.isConnected) return;

      this._syncAttributeRollsFromActor();
      this.render();
    };
    Hooks.on('updateActor', this._onActorUpdate);
  }

  async _prepareContext() {
    const showLuck = shouldShowLuck();

    this.stats ??= getStoredStats(this.actor);
    this.hasSwappedAttributes ??= Boolean(this.actor.getFlag('liminal-horror', GENERATOR_SWAPPED_FLAG));

    this.details ??= getInitialInvestigatorDetails();

    const requiredStatKeys = getRequiredInvestigatorStatKeys({ showLuck });
    const hasRolledAttributes = requiredStatKeys.some((key) => isRolledStatValue(this.stats[key]));
    const attributesComplete = requiredStatKeys.every((key) => isRolledStatValue(this.stats[key]));
    const canRerollAttributeRolls = canRerollAttributes();
    const statRollDisabled = Object.fromEntries(
      Object.keys(this.stats).map((key) => [
        key,
        !requiredStatKeys.includes(key) || (isRolledStatValue(this.stats[key]) && !canRerollAttributeRolls),
      ])
    );
    const backstoryOptions = getBackstoryOptions(this.details.backstoryId);

    return {
      ...this.details,
      ...this.stats,
      showLuck,
      isGM: game.user.isGM,
      actionRowClass: game.user.isGM ? 'lh-creator-action-row-gm' : '',
      hasRolledAttributes,
      attributesComplete,
      partialAttributes: hasRolledAttributes && !attributesComplete,
      canRerollAttributeRolls,
      disableRollAttributes: attributesComplete && !canRerollAttributeRolls,
      statRollDisabled,
      disableSwapAttributes:
        !SWAPPABLE_ATTRIBUTE_KEYS.every((key) => isRolledStatValue(this.stats[key])) ||
        (this.hasSwappedAttributes && !game.user.isGM),
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
        backstorySelect.selectedOptions[0]?.dataset.items || t('LH.investigatorGenerator.chooseBackstoryHint');
    };

    backstorySelect.addEventListener('change', syncBackstoryItemsHint);
    syncBackstoryItemsHint();
  }

  _onClose(options) {
    Hooks.off('updateActor', this._onActorUpdate);
    super._onClose(options);
  }

  _syncAttributeRollsFromActor() {
    this.stats = getStoredStats(this.actor);
    this.hasSwappedAttributes = Boolean(this.actor.getFlag('liminal-horror', GENERATOR_SWAPPED_FLAG));
  }

  async _persistAttributeRolls() {
    await this.actor.setFlag('liminal-horror', GENERATOR_STATS_FLAG, this.stats ?? getInitialInvestigatorStats());
    await this.actor.setFlag('liminal-horror', GENERATOR_SWAPPED_FLAG, Boolean(this.hasSwappedAttributes));
  }

  async _resetAttributeRolls() {
    this.stats = getInitialInvestigatorStats();
    this.hasSwappedAttributes = false;
    await this.actor.unsetFlag('liminal-horror', GENERATOR_STATS_FLAG);
    await this.actor.unsetFlag('liminal-horror', GENERATOR_SWAPPED_FLAG);
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

    const showLuck = shouldShowLuck();
    const requiredStatKeys = getRequiredInvestigatorStatKeys({ showLuck });
    const attributesComplete = requiredStatKeys.every((key) => isRolledStatValue(object[key]));

    if (attributesComplete) {
      Object.assign(updateData, buildInvestigatorStatsUpdate(object));
    }

    if (Object.keys(updateData).length) await this.actor.update(updateData);

    if (object.backstoryId) await applyBackstory(this.actor, object.backstoryId);
  }

  static async roll(event, target) {
    const key = target.dataset.key;
    if (key === 'attributes') {
      this.stats ??= getInitialInvestigatorStats();
      const showLuck = shouldShowLuck();
      const requiredStatKeys = getRequiredInvestigatorStatKeys({ showLuck });
      const missingKeys = requiredStatKeys.filter((statKey) => !isRolledStatValue(this.stats[statKey]));
      const statKeysToRoll = missingKeys.length ? missingKeys : canRerollAttributes() ? requiredStatKeys : [];

      if (!statKeysToRoll.length) {
        ui.notifications.warn(t('LH.investigatorGenerator.attributesAlreadyRolled'));
        return;
      }

      const rolls = Object.fromEntries(
        await Promise.all(statKeysToRoll.map(async (statKey) => [statKey, await rollInvestigatorStat(statKey)]))
      );
      Object.assign(this.stats, rolls);
      await this._persistAttributeRolls();
      this.render();
      return;
    } else if (key?.startsWith('stat:')) {
      const statKey = key.slice(5);
      this.stats ??= getInitialInvestigatorStats();

      if (isRolledStatValue(this.stats[statKey]) && !canRerollAttributes()) {
        ui.notifications.warn(t('LH.investigatorGenerator.attributeAlreadyRolled'));
        return;
      }

      this.stats[statKey] = await rollInvestigatorStat(statKey);
      await this._persistAttributeRolls();
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

  static async resetAttributeLocks() {
    if (!game.user.isGM) return;

    await this._resetAttributeRolls();
    ui.notifications.info(t('LH.investigatorGenerator.attributeLocksReset'));
    this.render();
  }

  static async swapAttributes() {
    if (!SWAPPABLE_ATTRIBUTE_KEYS.every((key) => isRolledStatValue(this.stats?.[key]))) {
      ui.notifications.warn(t('LH.investigatorGenerator.rollAttributesFirst'));
      return;
    }

    if (this.hasSwappedAttributes && !game.user.isGM) {
      ui.notifications.warn(t('LH.investigatorGenerator.swapAttributesOnce'));
      return;
    }

    const hasAllAttributes = SWAPPABLE_ATTRIBUTE_KEYS.every((key) => isRolledStatValue(this.stats?.[key]));

    if (!hasAllAttributes) {
      ui.notifications.warn(t('LH.investigatorGenerator.rollAttributesFirst'));
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
        window: { title: t('LH.investigatorGenerator.swapAttributes') },
        position: { width: 390 },
        rejectClose: false,
        modal: true,
        render: (_event, dialog) => configureSwapAttributeDialog(dialog),
        content: `
        <div class="lh lh-swap-attributes-dialog">
          <div class="generator-row">
            <label class="generator-label" for="lh-swap-first" title="${t('LH.investigatorGenerator.firstAttribute')}">${t('LH.investigatorGenerator.firstAttributeShort')}</label>
            <div class="generator-control generator-control-select">
              <select id="lh-swap-first" class="big-input" name="first">${firstOptionHtml}</select>
            </div>
          </div>

          <div class="generator-row">
            <label class="generator-label" for="lh-swap-second" title="${t('LH.investigatorGenerator.secondAttribute')}">${t('LH.investigatorGenerator.secondAttributeShort')}</label>
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
            label: t('LH.investigatorGenerator.swap'),
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
      ui.notifications.warn(t('LH.investigatorGenerator.swapDifferentAttributes'));
      return;
    }

    const firstValue = this.stats[first];
    this.stats[first] = this.stats[second];
    this.stats[second] = firstValue;
    this.hasSwappedAttributes = true;

    await this._persistAttributeRolls();
    this.render();
  }
}
