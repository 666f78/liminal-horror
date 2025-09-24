import { BaseActorDataModel } from './base.actor.js';

export class VehicleDataModel extends BaseActorDataModel {
  static get defaults() {
    return { ...super.defaults };
  }
}
