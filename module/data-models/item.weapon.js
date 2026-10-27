import { BaseItemDataModel } from './base.item.js';
import { WEAPON_HANDS } from '../data/constants.js';
const f = foundry.data.fields;

export class WeaponDataModel extends BaseItemDataModel {
  static defineSchema() {
    const base = super.defineSchema();
    return {
      ...base,
      damageDie: new f.StringField({ initial: '1d6' }),
      equipped: new f.BooleanField({ initial: false }),
      hand: new f.StringField({ initial: WEAPON_HANDS.MAIN, choices: Object.values(WEAPON_HANDS) }),
      twoHanded: new f.BooleanField({ initial: false }),
      price: new f.NumberField({ initial: 0, integer: true, min: 0 }),
    };
  }
}
