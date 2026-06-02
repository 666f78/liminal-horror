import { recalcArmor } from '../services/items.js';

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
      itemFieldsClass: hasMeta ? 'item-fields' : 'item-fields item-fields-single',
      editable: this.isEditable,
      owner: this.item.isOwner,
    };
  }

  async _processSubmitData(event, form, submitData, options = {}) {
    const recalculateArmor =
      this.item.type === 'armor' &&
      this.item.parent &&
      (foundry.utils.hasProperty(submitData, 'system.equipped') ||
        foundry.utils.hasProperty(submitData, 'system.armorValue'));

    await super._processSubmitData(event, form, submitData, options);

    if (recalculateArmor) {
      await this.item.parent.update({});
      await recalcArmor(this.item.parent);
    }
  }
}
