import { BaseActorDataModel } from './base.actor.js';

const f = foundry.data.fields;

export class MonsterDataModel extends BaseActorDataModel {
  static get defaults() {
    return { ...super.defaults };
  }

  static defineSchema() {
    const D = this.defaults ?? {};
    return {
      identity: new f.SchemaField({
        background: new f.StringField({ initial: '' }),
        description: new f.StringField({ initial: '' }),
      }),
      attributes: new f.SchemaField({
        str: new f.SchemaField({
          value: new f.NumberField({ initial: D.str ?? 10, integer: true, min: 0 }),
          base: new f.NumberField({ initial: D.str ?? 10, integer: true, min: 0 }),
        }),
        dex: new f.SchemaField({
          value: new f.NumberField({ initial: D.dex ?? 0, integer: true, min: 0 }),
          base: new f.NumberField({ initial: D.dex ?? 0, integer: true, min: 0 }),
        }),
        con: new f.SchemaField({
          value: new f.NumberField({ initial: D.con ?? 0, integer: true, min: 0 }),
          base: new f.NumberField({ initial: D.con ?? 0, integer: true, min: 0 }),
        }),
        luck: new f.SchemaField({
          value: new f.NumberField({ initial: D.luck ?? 0, integer: true, min: 0 }),
          base: new f.NumberField({ initial: D.luck ?? 0, integer: true, min: 0 }),
        }),
      }),
      defense: new f.SchemaField({
        hp: new f.NumberField({ initial: D.hp ?? 0, integer: true, min: 0 }),
        hpMax: new f.NumberField({ initial: D.hp ?? 0, integer: true, min: 0 }),
      }),
      defenses: new f.SchemaField({
        armor: new f.NumberField({ initial: 0, integer: true, min: 0 }),
        selfControl: new f.NumberField({ initial: 0, integer: true, min: 0 }),
      }),
      status: new f.SchemaField({
        deprived: new f.BooleanField({ initial: !!D.deprived }),
      }),
      inventory: new f.SchemaField({
        slotsMax: new f.NumberField({ initial: D.slotsMax ?? 10, integer: true, min: 0 }),
        slotsUsed: new f.NumberField({ initial: 0, integer: true, min: 0 }),
        money: new f.NumberField({ initial: 0, integer: true, min: 0 }),
      }),
      notes: new f.StringField({ initial: '' }),
    };
  }
}
