import { BaseItemDataModel } from './base.item.js';
const f = foundry.data.fields;

export class ArmorDataModel extends BaseItemDataModel {
  static defineSchema() {
    const base = super.defineSchema();
    return {
      ...base,
      armorValue: new f.NumberField({ initial: 1, integer: true, min: 0 }),
      equipped: new f.BooleanField({ initial: false }),
      price: new f.NumberField({ initial: 0, integer: true, min: 0 }),
    };
  }
}
