import { WeaponDataModel } from './item.weapon.js';

export class SpellDataModel extends WeaponDataModel {
  static get defaults() {
    return {
      ...super.defaults,
      ignoreSlots: true,
    };
  }
}
