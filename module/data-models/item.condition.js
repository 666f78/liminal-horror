import { BaseItemDataModel } from './base.item.js';

export class ConditionDataModel extends BaseItemDataModel {
  static defineSchema() {
    const base = super.defineSchema();
    return {
      ...base,
    };
  }
}
