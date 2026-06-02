import { applyDamage, applyStress } from '../services/effects.js';
import { InvestigatorGenerator } from '../apps/investigator-generator.js';
import { isAppendixLuckEnabled } from '../settings.js';
import { equipItem, isAutoArmorCalculationEnabled, recalcArmor, restoreItemUse, useItem } from '../services/items.js';
import { restActor } from '../services/rest.js';
import { quickRoll, rollAttribute } from '../services/rolls.js';
import { createChatMessage } from '../utils/chat.js';
import { t, td } from '../utils/i18n.js';
import { recalcSlots } from '../utils/slots.js';

const isActivateEvent = (event) => event.type === 'click' || event.key === 'Enter' || event.key === ' ';

const getItemId = (target) => target.dataset.itemId ?? target.closest('.inv-row')?.dataset?.itemId;
const INVENTORY_SORT_FLAG = 'inventorySort';
const INVENTORY_MANUAL_ORDER_FLAG = 'manualInventoryOrder';
const INVENTORY_SORT_DIRECTION_FLAG = 'inventorySortDirection';
const INVENTORY_SORT_MODES = ['default', 'manual', 'name', 'type', 'slotSize', 'equipped'];
const STATUS_ITEM_TYPES = new Set(['injury', 'consequence', 'condition']);

const getPlainTextDescription = (content = '') => {
  if (!content) return '';
  const wrapper = document.createElement('div');
  wrapper.innerHTML = content;
  return wrapper.textContent?.replace(/\s+/g, ' ').trim() ?? '';
};

const getLocalizedInventorySortOptions = (currentSort) =>
  [
    { value: 'default', label: t('LH.ui.inventorySort.default') },
    { value: 'manual', label: t('LH.ui.inventorySort.manual') },
    { value: 'name', label: t('LH.ui.inventorySort.name') },
    { value: 'type', label: t('LH.ui.inventorySort.type') },
    { value: 'slotSize', label: t('LH.ui.inventorySort.slotSize') },
    { value: 'equipped', label: t('LH.ui.inventorySort.equipped') },
  ].map((option) => ({
    ...option,
    selectedAttr: option.value === currentSort ? 'selected' : '',
  }));

const normalizeManualInventoryOrder = (items, manualOrder = []) => {
  const itemIds = new Set(items.map((item) => item._id));
  const filteredOrder = manualOrder.filter((id) => itemIds.has(id));
  const missingIds = items.map((item) => item._id).filter((id) => !filteredOrder.includes(id));
  return [...filteredOrder, ...missingIds];
};

const sortInventoryItems = (items, mode, manualOrder = [], direction = 'asc') => {
  const collator = new Intl.Collator(game.i18n?.lang ?? undefined, { numeric: true, sensitivity: 'base' });
  const withIndex = items.map((item, index) => ({ item, index }));
  const manualIndex = new Map(normalizeManualInventoryOrder(items, manualOrder).map((id, index) => [id, index]));
  const directionMultiplier = direction === 'desc' ? -1 : 1;
  const compareName = (a, b) => collator.compare(a.item.name ?? '', b.item.name ?? '') || a.index - b.index;
  const compareType = (a, b) => collator.compare(a.item.type ?? '', b.item.type ?? '') || compareName(a, b);
  const compareSlotSize = (a, b) =>
    Number(a.item.system?.slotSize ?? 0) - Number(b.item.system?.slotSize ?? 0) || compareName(a, b);

  if (!INVENTORY_SORT_MODES.includes(mode) || mode === 'default') {
    return items;
  }

  if (mode === 'manual') {
    return withIndex
      .sort(
        (a, b) =>
          (manualIndex.get(a.item._id) ?? Number.MAX_SAFE_INTEGER) -
          (manualIndex.get(b.item._id) ?? Number.MAX_SAFE_INTEGER)
      )
      .map(({ item }) => item);
  }

  withIndex.sort((a, b) => {
    if (mode === 'name') return compareName(a, b) * directionMultiplier;
    if (mode === 'type') return compareType(a, b) * directionMultiplier;
    if (mode === 'slotSize') return compareSlotSize(a, b) * directionMultiplier;
    if (mode === 'equipped') {
      const aEquipped = Boolean(a.item.system?.equipped);
      const bEquipped = Boolean(b.item.system?.equipped);
      if (aEquipped !== bEquipped) {
        return (aEquipped ? -1 : 1) * directionMultiplier;
      }
      return compareType(a, b) * directionMultiplier;
    }
    return a.index - b.index;
  });

  return withIndex.map(({ item }) => item);
};

const TEMPLATE_PATHS = Object.freeze({
  investigator: 'systems/liminal-horror/templates/actors/actor-sheet.hbs',
  limited: 'systems/liminal-horror/templates/actors/actor-limited.hbs',
  monster: 'systems/liminal-horror/templates/actors/actor-monster-sheet.hbs',
});

const renderSheet = (sheet) => {
  if (!sheet) return;
  if (sheet instanceof foundry.applications.api.ApplicationV2) return sheet.render({ force: true });
  return sheet.render(true);
};

export class LHActorSheet extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.sheets.ActorSheetV2
) {
  constructor(...args) {
    super(...args);
    this._expandedItemDescriptions = new Set();
    this._draggedInventoryItemId = null;
  }

  static DEFAULT_OPTIONS = {
    classes: ['lh', 'sheet', 'actor'],
    position: {
      width: 660,
      height: 760,
    },
    window: {
      resizable: true,
      controls: [
        {
          action: 'openInvestigatorGenerator',
          icon: 'fa-solid fa-user',
          label: 'LH.investigatorGenerator.windowHeader',
          visible: LHActorSheet._canUseInvestigatorGenerator,
        },
      ],
    },
    form: {
      submitOnChange: true,
      closeOnSubmit: false,
    },
    actions: {
      openInvestigatorGenerator: LHActorSheet._onOpenInvestigatorGenerator,
      rest: LHActorSheet._onRest,
      dof: LHActorSheet._onDof,
      rollAttr: LHActorSheet._onRollAttr,
      applyDamage: LHActorSheet._onApplyDamage,
      applyStress: LHActorSheet._onApplyStress,
      toggleEquip: LHActorSheet._onToggleEquip,
      useItem: LHActorSheet._onUseItem,
      restoreItemUse: LHActorSheet._onRestoreItemUse,
      editItem: LHActorSheet._onEditItem,
      deleteItem: LHActorSheet._onDeleteItem,
      toggleDescription: LHActorSheet._onToggleDescription,
      inventorySortDirection: LHActorSheet._onInventorySortDirection,
    },
  };

  static PARTS = {
    sheet: {
      template: TEMPLATE_PATHS.investigator,
      scrollable: [''],
    },
  };

  static TABS = {
    primary: {
      tabs: [{ id: 'items' }, { id: 'description' }, { id: 'notes' }, { id: 'log' }],
      initial: 'items',
    },
  };

  static _canUseInvestigatorGenerator() {
    return this.isEditable && !this.actor.limited;
  }

  get title() {
    return this.actor.name || super.title;
  }

  _initializeApplicationOptions(options) {
    const applicationOptions = super._initializeApplicationOptions(options);
    if (applicationOptions.document?.type === 'monster') applicationOptions.classes.push('lh-monster-sheet');
    return applicationOptions;
  }

  _configureRenderParts(options) {
    const parts = super._configureRenderParts(options);
    parts.sheet.template = this.actor.limited
      ? TEMPLATE_PATHS.limited
      : this.actor.type === 'monster'
        ? TEMPLATE_PATHS.monster
        : TEMPLATE_PATHS.investigator;
    return parts;
  }

  _configureRenderOptions(options) {
    super._configureRenderOptions(options);
    if (this.actor.limited) {
      options.position = foundry.utils.mergeObject(options.position ?? {}, { width: 600, height: 'auto' });
    }
  }

  _getHeaderControls() {
    return this.actor.limited ? [] : super._getHeaderControls();
  }

  _isDamageActionDisabled(system = this.actor.system) {
    const hp = Number(system?.defense?.hp ?? 0);
    const strength = Number(system?.attributes?.str?.value ?? 0);
    return hp === 0 && strength === 0;
  }

  _isStressActionDisabled(system = this.actor.system) {
    const hp = Number(system?.defense?.hp ?? 0);
    const control = Number(system?.attributes?.con?.value ?? 0);
    return hp === 0 && control === 0;
  }

  _getStatusRibbonText(system = this.actor.system) {
    const labels = [];
    const strength = Number(system?.attributes?.str?.value ?? 0);
    const dexterity = Number(system?.attributes?.dex?.value ?? 0);
    const control = Number(system?.attributes?.con?.value ?? 0);

    if (!Number.isNaN(strength) && strength <= 0) labels.push(t('LH.status.dead'));
    if (!Number.isNaN(dexterity) && dexterity <= 0) labels.push(t('LH.status.paralysis'));
    if (!Number.isNaN(control) && control <= 0) labels.push(t('LH.status.lost'));

    if (!labels.length) return null;
    return labels.join(' / ');
  }

  async _prepareContext(options) {
    const data = await super._prepareContext(options);
    const actorImage = this.actor.img ?? '';
    const isDefaultImage = typeof actorImage === 'string' && actorImage.includes('mystery-man.svg');
    const tokenSrc = this.actor.prototypeToken?.texture?.src;
    const portraitSrc = isDefaultImage && tokenSrc ? tokenSrc : actorImage || tokenSrc || 'icons/svg/mystery-man.svg';
    const enrichmentOptions = {
      secrets: this.actor.isOwner,
      rollData: this.actor.getRollData(),
      relativeTo: this.actor,
    };
    const enrichedDescription = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
      this.actor.system?.identity?.description ?? '',
      enrichmentOptions
    );
    const enrichedNotes = await foundry.applications.ux.TextEditor.implementation.enrichHTML(
      this.actor.system?.notes ?? '',
      enrichmentOptions
    );

    const inventorySort = this.actor.getFlag('liminal-horror', INVENTORY_SORT_FLAG) ?? 'default';
    const manualInventoryOrder = this.actor.getFlag('liminal-horror', INVENTORY_MANUAL_ORDER_FLAG) ?? [];
    const inventorySortDirection = this.actor.getFlag('liminal-horror', INVENTORY_SORT_DIRECTION_FLAG) ?? 'asc';
    const items = await Promise.all(
      this.actor.items.contents.map(async (item) => {
        const description = item.system?.description ?? '';
        const hasDescription = Boolean(getPlainTextDescription(description));

        return {
          ...item.toObject(),
          hasDescription,
          enrichedDescription: hasDescription
            ? await foundry.applications.ux.TextEditor.implementation.enrichHTML(description, enrichmentOptions)
            : '',
          descriptionExpanded: this._expandedItemDescriptions.has(item._id),
        };
      })
    );
    const normalizedManualInventoryOrder = normalizeManualInventoryOrder(items, manualInventoryOrder);
    const sortedItems = sortInventoryItems(
      items,
      inventorySort,
      normalizedManualInventoryOrder,
      inventorySortDirection
    );

    return {
      ...data,
      items: sortedItems,
      actor: this.actor,
      system: this.actor.system,
      owner: this.actor.isOwner,
      canEditItems: this.isEditable,
      activeTab: this.tabGroups.primary,
      tabClasses: {
        items: this.tabGroups.primary === 'items' ? 'active' : '',
        description: this.tabGroups.primary === 'description' ? 'active' : '',
        notes: this.tabGroups.primary === 'notes' ? 'active' : '',
        log: this.tabGroups.primary === 'log' ? 'active' : '',
      },
      isManualInventorySort: inventorySort === 'manual',
      showInventorySortDirection: !['default', 'manual'].includes(inventorySort),
      inventorySort,
      inventorySortOptions: getLocalizedInventorySortOptions(inventorySort),
      inventorySortDirection,
      inventorySortDirectionTitle:
        inventorySortDirection === 'desc' ? t('LH.ui.inventorySort.descending') : t('LH.ui.inventorySort.ascending'),
      inventorySortDirectionIcon:
        inventorySortDirection === 'desc' ? 'fas fa-sort-amount-down' : 'fas fa-sort-amount-up',
      portraitSrc,
      showLuck: isAppendixLuckEnabled(),
      autoArmorCalculation: isAutoArmorCalculationEnabled(),
      disableDamageAction: this._isDamageActionDisabled(),
      disableStressAction: this._isStressActionDisabled(),
      statusRibbonText: this._getStatusRibbonText(),
      enrichedDescription,
      enrichedNotes,
    };
  }

  _processFormData(event, form, formData) {
    const submitData = super._processFormData(event, form, formData);
    delete submitData.damageAmount;
    delete submitData.stressAmount;
    return submitData;
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    for (const actor of game.actors?.contents ?? []) recalcSlots(actor);

    if (!this.element.dataset.lhKeydownBound) {
      this.element.dataset.lhKeydownBound = 'true';
      this.element.addEventListener('keydown', async (event) => {
        if (!isActivateEvent(event)) return;
        const target = event.target.closest(
          "[data-action='rollAttr'], [data-action='toggleEquip'], [data-action='useItem'], .item-edit, .item-delete"
        );
        if (!target) return;
        event.preventDefault();
        await this.options.actions[target.dataset.action]?.call(this, event, target);
      });
    }

    this.element
      .querySelector("[data-action='inventorySort']")
      ?.addEventListener('change', this._onInventorySort.bind(this));
    this.#activateItemUseContextListeners();
    this.#activateInventoryDragListeners();
  }

  static async _onOpenInvestigatorGenerator() {
    await new InvestigatorGenerator(this.actor).render({ force: true });
  }

  static async _onRest(event) {
    event.preventDefault();
    event.stopPropagation();
    await restActor(this.actor, { full: event.shiftKey === true });
  }

  static async _onDof(event) {
    event.preventDefault();
    event.stopPropagation();
    await quickRoll(this.actor, '1d6', t('LH.core.dof'));
  }

  static async _onRollAttr(event, target) {
    event.preventDefault();
    await rollAttribute(this.actor, target.dataset.key);
  }

  static async _onApplyDamage(event) {
    event.preventDefault();
    if (this._isDamageActionDisabled()) return;

    const input = this.element.querySelector("input[name='damageAmount']");
    const amount = Number(input?.value) || 0;
    await applyDamage(this.actor, amount);
    await recalcSlots(this.actor);
    if (input) input.value = 1;
  }

  static async _onApplyStress(event) {
    event.preventDefault();
    if (this._isStressActionDisabled()) return;

    const input = this.element.querySelector("input[name='stressAmount']");
    const amount = Number(input?.value) || 0;
    await applyStress(this.actor, amount);
    await recalcSlots(this.actor);
    if (input) input.value = 1;
  }

  static async _onToggleEquip(event, target) {
    event.preventDefault();
    event.stopPropagation();

    const item = this.actor.items.get(getItemId(target));
    if (!item) return;

    await equipItem(item, this.actor);
    await recalcSlots(this.actor);
    await recalcArmor(this.actor);
  }

  static async _onUseItem(event, target) {
    event.preventDefault();
    event.stopPropagation();

    const item = this.actor.items.get(getItemId(target));
    if (item) await useItem(item, this.actor);
  }

  static async _onRestoreItemUse(event, target) {
    event.preventDefault();
    event.stopPropagation();

    const item = this.actor.items.get(getItemId(target));
    if (item) await restoreItemUse(item, this.actor);
  }

  static async _onEditItem(event, target) {
    event.preventDefault();
    event.stopPropagation();

    renderSheet(this.actor.items.get(getItemId(target))?.sheet);
  }

  static async _onDeleteItem(event, target) {
    event.preventDefault();
    event.stopPropagation();

    const itemId = getItemId(target);
    if (!itemId) return;

    const item = this.actor.items.get(itemId);
    if (!item) return;

    const confirmed = await foundry.applications.api.DialogV2.wait({
      classes: ['lh', 'lh-confirm-dialog'],
      window: { title: t('LH.ui.deleteItem') },
      position: { width: 320 },
      rejectClose: false,
      content: `<p class="lh-dialog-message">${td('LH.ui.deleteItemConfirm', {
        name: `<strong>${foundry.utils.escapeHTML(item.name)}</strong>`,
      })}</p>`,
      buttons: [
        {
          action: 'yes',
          icon: 'fa-solid fa-check',
          label: t('LH.core.yes'),
          callback: () => true,
        },
        {
          action: 'no',
          icon: 'fa-solid fa-times',
          label: t('LH.core.no'),
          default: true,
          callback: () => false,
        },
      ],
    });

    if (!confirmed) return;

    const label = STATUS_ITEM_TYPES.has(item.type) ? t('LH.core.gotRidOf') : t('LH.core.thrownAway');
    await createChatMessage({
      actor: this.actor,
      content: `<b>${label}:</b> ${foundry.utils.escapeHTML(item.name)}`,
    });
    await item.delete();
    await recalcSlots(this.actor);
    await recalcArmor(this.actor);
  }

  static _onToggleDescription(event, target) {
    event.preventDefault();
    event.stopPropagation();

    const itemId = getItemId(target);
    if (!itemId) return;

    const isExpanded = this._expandedItemDescriptions.has(itemId);
    if (isExpanded) this._expandedItemDescriptions.delete(itemId);
    else this._expandedItemDescriptions.add(itemId);

    const content = this.element.querySelector(`.inv-desc[data-item-id="${itemId}"]`);
    const button = target.closest("[data-action='toggleDescription']");
    const nextExpanded = !isExpanded;

    content?.classList.toggle('is-collapsed', !nextExpanded);
    button?.setAttribute('aria-expanded', String(nextExpanded));
  }

  async _onInventorySort(event) {
    const mode = event.currentTarget.value;
    if (!INVENTORY_SORT_MODES.includes(mode)) return;
    await this.actor.setFlag('liminal-horror', INVENTORY_SORT_FLAG, mode);
    await this.render();
  }

  static async _onInventorySortDirection(event) {
    event.preventDefault();
    const currentDirection = this.actor.getFlag('liminal-horror', INVENTORY_SORT_DIRECTION_FLAG) ?? 'asc';
    const nextDirection = currentDirection === 'desc' ? 'asc' : 'desc';
    await this.actor.setFlag('liminal-horror', INVENTORY_SORT_DIRECTION_FLAG, nextDirection);
    await this.render();
  }

  #activateInventoryDragListeners() {
    this.element.querySelectorAll('.inv-drag-handle[draggable="true"]').forEach((handle) => {
      handle.addEventListener('dragstart', (event) => {
        const itemId = getItemId(event.currentTarget);
        if (!itemId) return;
        this._draggedInventoryItemId = itemId;
        event.currentTarget.closest('.inv-row')?.classList.add('is-dragging');
        event.dataTransfer?.setData('text/plain', itemId);
        if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
      });

      handle.addEventListener('dragend', (event) => {
        this._draggedInventoryItemId = null;
        event.currentTarget.closest('.inv-row')?.classList.remove('is-dragging');
        this.element.querySelectorAll('.inv-row.drop-before, .inv-row.drop-after').forEach((row) => {
          row.classList.remove('drop-before', 'drop-after');
        });
      });
    });

    this.element.querySelectorAll('.inv-row[data-sortable="true"]').forEach((row) => {
      row.addEventListener('dragover', (event) => {
        if (!this._draggedInventoryItemId) return;

        const targetId = getItemId(event.currentTarget);
        if (!targetId || targetId === this._draggedInventoryItemId) return;

        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';

        const rect = event.currentTarget.getBoundingClientRect();
        const insertAfter = event.clientY > rect.top + rect.height / 2;

        this.element.querySelectorAll('.inv-row.drop-before, .inv-row.drop-after').forEach((row) => {
          row.classList.remove('drop-before', 'drop-after');
        });
        event.currentTarget.classList.add(insertAfter ? 'drop-after' : 'drop-before');
      });

      row.addEventListener('dragleave', (event) => {
        event.currentTarget.classList.remove('drop-before', 'drop-after');
      });

      row.addEventListener('drop', async (event) => {
        const sourceId = this._draggedInventoryItemId ?? event.dataTransfer?.getData('text/plain');
        const targetId = getItemId(event.currentTarget);
        if (!sourceId || !targetId || sourceId === targetId) return;

        event.preventDefault();
        event.stopPropagation();

        const rect = event.currentTarget.getBoundingClientRect();
        const insertAfter = event.clientY > rect.top + rect.height / 2;
        const currentOrder = normalizeManualInventoryOrder(
          this.actor.items.contents,
          this.actor.getFlag('liminal-horror', INVENTORY_MANUAL_ORDER_FLAG) ?? []
        );
        const sourceIndex = currentOrder.indexOf(sourceId);
        const targetIndex = currentOrder.indexOf(targetId);
        if (sourceIndex === -1 || targetIndex === -1) return;

        currentOrder.splice(sourceIndex, 1);
        const insertionIndex = targetIndex + (insertAfter ? 1 : 0) - (sourceIndex < targetIndex ? 1 : 0);
        currentOrder.splice(Math.max(0, insertionIndex), 0, sourceId);

        this.element.querySelectorAll('.inv-row.drop-before, .inv-row.drop-after').forEach((row) => {
          row.classList.remove('drop-before', 'drop-after');
        });
        await this.actor.setFlag('liminal-horror', INVENTORY_MANUAL_ORDER_FLAG, currentOrder);
        await this.render();
      });
    });
  }

  async _onDragStart(event) {
    if (event.currentTarget.matches?.('.inv-drag-handle')) return;
    return super._onDragStart(event);
  }

  async _onSortItem(event, item) {
    if (this.actor.getFlag('liminal-horror', INVENTORY_SORT_FLAG) === 'manual') {
      const itemId = getItemId(event.currentTarget);
      if (!itemId) return;
      this._draggedInventoryItemId = itemId;
      return item;
    }
    return super._onSortItem(event, item);
  }

  #activateItemUseContextListeners() {
    for (const target of this.element.querySelectorAll("[data-action='useItem']")) {
      if (target.dataset.lhContextBound) continue;
      target.dataset.lhContextBound = 'true';
      target.addEventListener('contextmenu', (event) => this.options.actions.restoreItemUse.call(this, event, target));
    }
  }
}
