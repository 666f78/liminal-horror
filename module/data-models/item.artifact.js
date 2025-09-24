import { BaseItemDataModel } from './base.item.js';

export class ArtifactDataModel extends BaseItemDataModel {
  static defineSchema() {
    const base = super.defineSchema();
    return {
      ...base,
    };
  }
}
