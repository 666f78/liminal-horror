import { BaseActorDataModel } from './base.actor.js';

export class MonsterDataModel extends BaseActorDataModel {
  static get defaults() {
    return { ...super.defaults };
  }
}
