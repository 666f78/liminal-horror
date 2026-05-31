import { applyBackstory, getBackstoryOptions, rollBackstory } from '../content/backstories.js';
import { applyDamage, applyStress } from '../services/effects.js';
import { InvestigatorCreator } from '../apps/investigator-creator.js';
import { equipItem, isAutoArmorCalculationEnabled, recalcArmor, useItem } from '../services/items.js';
import { restActor } from '../services/rest.js';
import { quickRoll, rollAttribute } from '../services/rolls.js';
import { t } from '../utils/i18n.js';
import { recalcSlots } from '../utils/slots.js';

const isActivateEvent = (event) => event.type === 'click' || event.key === 'Enter' || event.key === ' ';

const getItemId = (target) => target.dataset.itemId ?? target.closest('.inv-row')?.dataset?.itemId;
const INVENTORY_SORT_FLAG = 'inventorySort';
const INVENTORY_MANUAL_ORDER_FLAG = 'manualInventoryOrder';
const INVENTORY_SORT_DIRECTION_FLAG = 'inventorySortDirection';
const INVENTORY_SORT_MODES = ['default', 'manual', 'name', 'type', 'slotSize', 'equipped'];

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

export class LHActorSheet extends foundry.appv1.sheets.ActorSheet {
  constructor(...args) {
    super(...args);
    this._expandedItemDescriptions = new Set();
    this._draggedInventoryItemId = null;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['lh', 'sheet', 'actor'],
      width: 660,
      height: 760,
      tabs: [{ navSelector: '.tabs', contentSelector: '.sheet-body', initial: 'items' }],
    });
  }

  get template() {
    if (this.actor.limited) {
      return 'systems/liminal-horror/templates/actors/actor-limited.hbs';
    }
    if (this.actor.type === 'monster') {
      return 'systems/liminal-horror/templates/actors/actor-monster-sheet.hbs';
    }
    return 'systems/liminal-horror/templates/actors/actor-sheet.hbs';
  }

  _getHeaderButtons() {
    if (this.actor.limited) {
      this.position.width = 600;
      this.position.height = 'auto';
      return super._getHeaderButtons().filter((b) => b.class === 'close');
    }
    const buttons = super._getHeaderButtons?.() ?? super.getHeaderButtons?.() ?? [];

    if (game.user.isGM) {
      buttons.unshift({
        label: 'Investigator Creator',
        class: 'lh-backstory',
        icon: 'fas fa-user',
        onclick: () => {
          new InvestigatorCreator(this.actor).render(true);
        },
      });
    }
    return buttons;
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

  async getData(options) {
    const data = await super.getData(options);
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
      (data.items ?? []).map(async (item) => {
        const description = item.system?.description ?? '';
        const hasDescription = Boolean(getPlainTextDescription(description));

        return {
          ...item,
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
      system: this.actor.system,
      canEditItems: game.user.isGM,
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
      showLuck: game.settings.get('liminal-horror', 'appendixLuck'),
      autoArmorCalculation: isAutoArmorCalculationEnabled(),
      disableDamageAction: this._isDamageActionDisabled(),
      disableStressAction: this._isStressActionDisabled(),
      statusRibbonText: this._getStatusRibbonText(),
      enrichedDescription,
      enrichedNotes,
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
    for (const actor of game.actors?.contents ?? []) recalcSlots(actor);

    html.on('click', '.action-rest', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const isFullRest = event.shiftKey === true;
      await restActor(this.actor, { full: isFullRest });
    });

    html.on('click', '.action-dof', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      await quickRoll(this.actor, '1d6', t('LH.core.dof'));
    });

    html.on('click keydown', "[data-action='roll-attr']", async (event) => {
      if (!isActivateEvent(event)) return;
      await rollAttribute(this.actor, event.currentTarget.dataset.key);
    });

    html.on('click', "[data-action='apply-damage']", async () => {
      if (this._isDamageActionDisabled()) return;

      const input = html.find("input[name='damageAmount']");
      const amount = Number(input.val()) || 0;
      await applyDamage(this.actor, amount);
      await recalcSlots(this.actor);
      input.val(1);
    });

    html.on('click', "[data-action='apply-stress']", async () => {
      if (this._isStressActionDisabled()) return;

      const input = html.find("input[name='stressAmount']");
      const amount = Number(input.val()) || 0;
      await applyStress(this.actor, amount);
      await recalcSlots(this.actor);
      input.val(1);
    });

    html.on('click keydown', "[data-action='toggle-equip']", async (event) => {
      if (!isActivateEvent(event)) return;
      event.preventDefault();
      event.stopPropagation();

      const itemId = getItemId(event.currentTarget);
      const item = this.actor.items.get(itemId);
      if (!item) return;

      await equipItem(item, this.actor);
      await recalcSlots(this.actor);
      await recalcArmor(this.actor);
    });

    html.on('click keydown', "[data-action='use-item']", async (event) => {
      if (!isActivateEvent(event)) return;
      event.preventDefault();
      event.stopPropagation();

      const itemId = getItemId(event.currentTarget);
      const item = this.actor.items.get(itemId);
      if (!item) return;

      await useItem(item, this.actor);
    });

    html.on('click keydown', '.item-edit', async (event) => {
      if (!isActivateEvent(event)) return;
      event.preventDefault();
      event.stopPropagation();

      const itemId = getItemId(event.currentTarget);
      this.actor.items.get(itemId)?.sheet?.render(true);
    });

    html.on('click keydown', '.item-delete', async (event) => {
      if (!isActivateEvent(event)) return;
      event.preventDefault();
      event.stopPropagation();

      const itemId = getItemId(event.currentTarget);
      if (!itemId) return;

      const item = this.actor.items.get(itemId);
      if (!item) return;

      const confirmed = await Dialog.wait(
        {
          title: 'Delete Item',
          content: `<p>Delete <strong>${foundry.utils.escapeHTML(item.name)}</strong>?</p>`,
          buttons: {
            yes: {
              icon: '<i class="fas fa-check"></i>',
              label: 'Yes',
              callback: () => true,
            },
            no: {
              icon: '<i class="fas fa-times"></i>',
              label: 'No',
              callback: () => false,
            },
          },
          default: 'no',
          close: () => false,
        },
        {
          classes: ['lh', 'lh-confirm-dialog'],
        }
      );
      if (!confirmed) return;

      await item.delete();
      await recalcSlots(this.actor);
      await recalcArmor(this.actor);
    });

    html.on('click', "[data-action='toggle-description']", (event) => {
      event.preventDefault();
      event.stopPropagation();

      const itemId = getItemId(event.currentTarget);
      if (!itemId) return;

      const isExpanded = this._expandedItemDescriptions.has(itemId);
      if (isExpanded) this._expandedItemDescriptions.delete(itemId);
      else this._expandedItemDescriptions.add(itemId);

      const content = html[0]?.querySelector(`.inv-desc[data-item-id="${itemId}"]`);
      const button = event.currentTarget.closest("[data-action='toggle-description']");
      const nextExpanded = !isExpanded;

      content?.classList.toggle('is-collapsed', !nextExpanded);
      button?.setAttribute('aria-expanded', String(nextExpanded));
    });

    html.on('change', "[data-action='inventory-sort']", async (event) => {
      const mode = event.currentTarget.value;
      if (!INVENTORY_SORT_MODES.includes(mode)) return;
      await this.actor.setFlag('liminal-horror', INVENTORY_SORT_FLAG, mode);
      this.render(false);
    });

    html.on('click', "[data-action='inventory-sort-direction']", async (event) => {
      event.preventDefault();
      const currentDirection = this.actor.getFlag('liminal-horror', INVENTORY_SORT_DIRECTION_FLAG) ?? 'asc';
      const nextDirection = currentDirection === 'desc' ? 'asc' : 'desc';
      await this.actor.setFlag('liminal-horror', INVENTORY_SORT_DIRECTION_FLAG, nextDirection);
      this.render(false);
    });

    html.on('dragstart', '.inv-drag-handle[draggable="true"]', (event) => {
      const itemId = getItemId(event.currentTarget);
      if (!itemId) return;
      this._draggedInventoryItemId = itemId;
      event.currentTarget.closest('.inv-row')?.classList.add('is-dragging');
      event.originalEvent?.dataTransfer?.setData('text/plain', itemId);
      if (event.originalEvent?.dataTransfer) {
        event.originalEvent.dataTransfer.effectAllowed = 'move';
      }
    });

    html.on('dragend', '.inv-drag-handle[draggable="true"]', (event) => {
      this._draggedInventoryItemId = null;
      event.currentTarget.closest('.inv-row')?.classList.remove('is-dragging');
      html.find('.inv-row.drop-before, .inv-row.drop-after').removeClass('drop-before drop-after');
    });

    html.on('dragover', '.inv-row[data-sortable="true"]', (event) => {
      if (!this._draggedInventoryItemId) return;

      const targetId = getItemId(event.currentTarget);
      if (!targetId || targetId === this._draggedInventoryItemId) return;

      event.preventDefault();
      const originalEvent = event.originalEvent;
      if (originalEvent?.dataTransfer) originalEvent.dataTransfer.dropEffect = 'move';

      const rect = event.currentTarget.getBoundingClientRect();
      const insertAfter = (originalEvent?.clientY ?? rect.top) > rect.top + rect.height / 2;

      html.find('.inv-row.drop-before, .inv-row.drop-after').removeClass('drop-before drop-after');
      event.currentTarget.classList.add(insertAfter ? 'drop-after' : 'drop-before');
    });

    html.on('dragleave', '.inv-row[data-sortable="true"]', (event) => {
      event.currentTarget.classList.remove('drop-before', 'drop-after');
    });

    html.on('drop', '.inv-row[data-sortable="true"]', async (event) => {
      const sourceId = this._draggedInventoryItemId ?? event.originalEvent?.dataTransfer?.getData('text/plain');
      const targetId = getItemId(event.currentTarget);
      if (!sourceId || !targetId || sourceId === targetId) return;

      event.preventDefault();
      event.stopPropagation();

      const rect = event.currentTarget.getBoundingClientRect();
      const insertAfter = (event.originalEvent?.clientY ?? rect.top) > rect.top + rect.height / 2;
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

      html.find('.inv-row.drop-before, .inv-row.drop-after').removeClass('drop-before drop-after');
      await this.actor.setFlag('liminal-horror', INVENTORY_MANUAL_ORDER_FLAG, currentOrder);
      this.render(false);
    });
  }
}
