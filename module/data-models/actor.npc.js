import { BaseActorDataModel } from './base.actor.js';

export class NPCDataModel extends BaseActorDataModel {
  static get defaults() {
    return { ...super.defaults };
  }
}
