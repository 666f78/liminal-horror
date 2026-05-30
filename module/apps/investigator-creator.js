async function rollTotal(formula) {
  const roll = await new Roll(formula).evaluate();
  return roll.total;
}

export class InvestigatorCreator extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  static DEFAULT_OPTIONS = {
    classes: ['lh-appv2'],
    tag: 'form',
    window: {
      title: 'LH.investigatorCreator.windowHeader',
      icon: 'fa-solid fa-input-text',
      resizable: true,
    },
    form: {
      handler: this.submit,
      closeOnSubmit: true,
    },
    actions: {
      roll: this.roll,
    },
    position: {
      width: 720,
      height: 'auto',
    },
  };

  static PARTS = {
    form: { template: 'systems/liminal-horror/templates/generator/generator.hbs' },
  };

  constructor(actor) {
    super();
    this.actor = actor;
  }

  async _prepareContext() {
    this.stats ??= {
      str: this.actor.system?.attributes?.str?.value || '',
      dex: this.actor.system?.attributes?.dex?.value || '',
      ctrl: this.actor.system?.attributes?.con?.value || '',
      luck: this.actor.system?.attributes?.luck?.value || '',
      hp: this.actor.system?.defense?.hpMax || '',
      cash: this.actor.system?.inventory?.money || '',
    };

    this.details ??= {
      aesthetics: '',
      firstEncounter: '',
      ideology: '',
      physique: '',
      backstory: '',
      face: '',
      speech: '',
      virtue: '',
      flaw: '',
      misfortune: '',
    };

    return {
      ...this.details,
      ...this.stats,
      lockAttributes: this.lockAttributes,
    };
  }

  static async submit(e, form, { object }) {
    await this.actor.update({
      system: {
        identity: {
          description: '',
        },
        attributes: {
          str: { value: object.str, base: object.str },
          dex: { value: object.dex, base: object.dex },
          con: { value: object.ctrl, base: object.ctrl },
          luck: { value: object.luck, base: object.luck },
        },
        defense: {
          hp: object.hp,
          hpMax: object.hp,
        },
        inventory: {
          money: object.cash,
        },
      },
    });
  }

  static async roll(event, target) {
    const key = target.dataset.key;
    if (key === 'attributes') {
      const [str, dex, ctrl, luck, hp, cash] = await Promise.all([
        rollTotal('3d6'),
        rollTotal('3d6'),
        rollTotal('3d6'),
        rollTotal('3d6'),
        rollTotal('1d6'),
        rollTotal('1d6 * 100'),
      ]);
      this.stats = {
        str,
        dex,
        ctrl,
        luck,
        hp,
        cash,
      };
      this.lockAttributes = true;
      this.render();
      return;
    }

    const maxByKey = {
      aesthetics: 20,
      firstEncounter: 10,
      ideology: 10,
      physique: 10,
      face: 10,
      speech: 10,
      virtue: 10,
      flaw: 10,
      backstory: 20,
      misfortune: 10,
    };
    this.details ??= {};
    this.details[key] = game.i18n.localize(`LH.char.${key}.${Math.floor(Math.random() * maxByKey[key]) + 1}`);
    this.render();
  }
}
