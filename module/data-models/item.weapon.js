import { BaseItemDataModel } from './base.item.js';
const f = foundry.data.fields;

export class WeaponDataModel extends BaseItemDataModel {
  static defineSchema() {
    const base = super.defineSchema();
    return {
      ...base,
      damageDie: new f.StringField({ initial: '1d6' }),
      equipped: new f.BooleanField({ initial: false }),
      price: new f.NumberField({ initial: 0, integer: true, min: 0 }),
    };
  }
}
