import { BaseItemDataModel } from './base.item.js';
const f = foundry.data.fields;

export class GearDataModel extends BaseItemDataModel {
  static defineSchema() {
    const base = super.defineSchema();
    return {
      ...base,
      price: new f.NumberField({ initial: 0, integer: true, min: 0 }),
      usesMax: new f.NumberField({ initial: 0, integer: true, min: 0 }),
      usesCurrent: new f.NumberField({ initial: 0, integer: true, min: 0 }),
    };
  }
}
