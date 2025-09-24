import { BaseItemDataModel } from './base.item.js';

export class InjuryDataModel extends BaseItemDataModel {
  static defineSchema() {
    const base = super.defineSchema();
    return {
      ...base,
    };
  }
}
