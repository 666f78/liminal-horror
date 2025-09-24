const f = foundry.data.fields;

export class BaseItemDataModel extends foundry.abstract.DataModel {
  static get defaults() {
    return { slotSize: 1, ignoreSlots: false };
  }

  static defineSchema() {
    const D = this.defaults ?? {};
    return {
      slotSize: new f.NumberField({ initial: Number(D.slotSize ?? 1), integer: true, min: 0 }),
      ignoreSlots: new f.BooleanField({ initial: !!D.ignoreSlots }),
      description: new f.StringField({ initial: '' }),
    };
  }
}
