import { recalcArmor, updateWeaponEquipment } from '../services/items.js';
import { bindSelectMenu } from '../utils/select-menu.js';

export class LHItemSheet extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.sheets.ItemSheetV2
) {
  static DEFAULT_OPTIONS = {
    classes: ['lh', 'sheet', 'item'],
    position: {
      width: 560,
      height: 'auto',
    },
    form: {
      submitOnChange: true,
      closeOnSubmit: false,
    },
  };

  static PARTS = {
    sheet: {
      template: 'systems/liminal-horror/templates/items/item-sheet.hbs',
      scrollable: [''],
    },
  };

  get title() {
    return this.item.name || super.title;
  }

  async _prepareContext(options) {
    const data = await super._prepareContext(options);
    const flags = this.item.flags?.['liminal-horror'] ?? {};
    const isCarryable = ['weapon', 'spell', 'gear', 'armor', 'artifact'].includes(this.item.type);
    const hasMeta = ['armor', 'weapon', 'spell', 'gear'].includes(this.item.type);

    return {
      ...data,
      item: this.item,
      system: this.item.system,
      flags,
      isCarryable,
      hasMeta,
      canEquip: ['weapon', 'armor', 'spell'].includes(this.item.type),
      editable: this.isEditable,
      owner: this.item.isOwner,
    };
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    this._selectMenuCleanups?.forEach((cleanup) => cleanup?.());
    this._selectMenuCleanups = [...this.element.querySelectorAll('[data-select-field]')].map((trigger) =>
      bindSelectMenu(this.element, trigger, (value) => this._onSelectField(trigger, value))
    );
    const image = this.element.querySelector('.item-image');
    if (!image || image.dataset.lhKeyboardBound) return;
    image.dataset.lhKeyboardBound = 'true';
    image.addEventListener('keydown', (event) => {
      if (!this.isEditable || !['Enter', ' '].includes(event.key)) return;
      event.preventDefault();
      image.click();
    });
  }

  _onClose(options) {
    this._selectMenuCleanups?.forEach((cleanup) => cleanup?.());
    super._onClose(options);
  }

  async _onSelectField(trigger, value) {
    if (!this.isEditable || trigger.disabled) return;
    const fieldName = trigger.dataset.selectField;
    const input = this.element.querySelector(`input[name="${fieldName}"]`);
    if (!input || input.disabled) return;
    const previousValue = input.value;
    input.value = value;
    try {
      await this.submit();
    } catch (error) {
      input.value = previousValue;
      ui.notifications.error(error, { console: true });
      return;
    }
    await this.render();
    this.element.querySelector(`[data-select-field="${fieldName}"]`)?.focus();
  }

  async _processSubmitData(event, form, submitData, options = {}) {
    const recalculateArmor =
      this.item.type === 'armor' &&
      this.item.parent &&
      (foundry.utils.hasProperty(submitData, 'system.equipped') ||
        foundry.utils.hasProperty(submitData, 'system.armorValue'));

    if (this.item.type === 'weapon' && this.item.parent?.items?.has(this.item.id)) {
      const updated = await updateWeaponEquipment(this.item, submitData, options);
      return updated ? { updated } : {};
    }

    const result = await super._processSubmitData(event, form, submitData, options);

    if (recalculateArmor) {
      await this.item.parent.update({});
      await recalcArmor(this.item.parent);
    }
    return result;
  }
}
