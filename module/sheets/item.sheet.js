import { recalcArmor } from '../services/items.js';

export class LHItemSheet extends ItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['lh', 'sheet', 'item'],
      template: 'systems/liminal-horror/templates/items/item-sheet.hbs',
      width: 620,
      height: 520,
    });
  }

  getData(options) {
    const data = super.getData(options) ?? {};
    const flags = this.item.flags?.['liminal-horror'] ?? {};
    const isCarryable = ['weapon', 'gear', 'armor', 'artifact'].includes(this.item.type);

    return {
      ...data,
      item: this.item,
      system: this.item.system,
      flags,
      isCarryable,
      editable: this.isEditable,
      owner: this.item.isOwner,
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find("input[name='system.equipped']").on('change', async () => {
      if (this.item.type !== 'armor' || !this.item.parent) return;
      await this.item.parent.update({});
      await recalcArmor(this.item.parent);
    });
  }
}
