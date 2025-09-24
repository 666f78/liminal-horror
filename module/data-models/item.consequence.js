import { BaseItemDataModel } from './base.item.js';

export class ConsequenceDataModel extends BaseItemDataModel {
  static defineSchema() {
    const base = super.defineSchema();
    return {
      ...base,
    };
  }
}
