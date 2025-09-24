const f = foundry.data.fields;

export class BaseActorDataModel extends foundry.abstract.DataModel {
  static get defaults() {
    return {
      str: 9,
      dex: 9,
      con: 9,
      luck: 0,
      hp: 3,
      slotsMax: 10,
      deprived: false,
    };
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
          value: new f.NumberField({ initial: D.str ?? 10, integer: true, min: 0, max: 18 }),
          base: new f.NumberField({ initial: D.str ?? 10, integer: true, min: 0, max: 18 }),
        }),
        dex: new f.SchemaField({
          value: new f.NumberField({ initial: D.dex ?? 0, integer: true, min: 0, max: 18 }),
          base: new f.NumberField({ initial: D.dex ?? 0, integer: true, min: 0, max: 18 }),
        }),
        con: new f.SchemaField({
          value: new f.NumberField({ initial: D.con ?? 0, integer: true, min: 0, max: 18 }),
          base: new f.NumberField({ initial: D.con ?? 0, integer: true, min: 0, max: 18 }),
        }),
        luck: new f.SchemaField({
          value: new f.NumberField({ initial: D.luck ?? 0, integer: true, min: 0, max: 18 }),
          base: new f.NumberField({ initial: D.luck ?? 0, integer: true, min: 0, max: 18 }),
        }),
      }),
      defense: new f.SchemaField({
        hp: new f.NumberField({ initial: D.hp ?? 0, integer: true, min: 0, max: 18 }),
        hpMax: new f.NumberField({ initial: D.hp ?? 0, integer: true, min: 0, max: 18 }),
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
