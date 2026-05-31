async function rollTotal(formula) {
  const roll = await new Roll(formula).evaluate();
  return roll.total;
}

function getBackstoryOptions(selectedId = '') {
  return Array.from({ length: 20 }, (_, index) => {
    const id = String(index + 1);
    const padded = id.padStart(2, '0');
    const name = t(`LH.backstory.${id}.name`);

    return {
      id,
      name: `${padded} - ${name}`,
      selected: String(selectedId) === id,
    };
  });
}

function getBackstoryName(id) {
  if (!id) return '';
  return t(`LH.backstory.${Number(id)}.name`);
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
      backstoryId: '',
    };

    return {
      ...this.details,
      ...this.stats,
      lockAttributes: this.lockAttributes,
      backstoryOptions: getBackstoryOptions(this.details.backstoryId),
    };
  }

  static async submit(e, form, { object }) {
    const backstoryName = getBackstoryName(object.backstoryId);

    const details = {
      aesthetics: object.aesthetics,
      firstEncounter: object.firstEncounter,
      ideology: object.ideology,
      physique: object.physique,
      face: object.face,
      speech: object.speech,
      virtue: object.virtue,
      flaw: object.flaw,
      misfortune: object.misfortune,
      backstory: backstoryName,
    };

    await this.actor.update({
      system: {
        identity: {
          description: buildGeneratedDescription(details),
          background: backstoryName,
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
    } else if (key === 'backstory') {
      this.details ??= {};
      this.details.backstoryId = String(Math.floor(Math.random() * 20) + 1);
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

  static async swapAttributes() {
    if (!this.lockAttributes) {
      ui.notifications.warn(t('LH.investigatorCreator.rollAttributesFirst'));
      return;
    }

    const hasAllAttributes = ATTRIBUTE_KEYS.every(key => this.stats?.[key] !== '' && this.stats?.[key] != null);

    if (!hasAllAttributes) {
      ui.notifications.warn(t('LH.investigatorCreator.rollAttributesFirst'));
      return;
    }

    const optionHtml = `
      <option value="str">${t('LH.attr.full.str')}</option>
      <option value="dex">${t('LH.attr.full.dex')}</option>
      <option value="ctrl">${t('LH.attr.full.ctrl')}</option>
      <option value="luck">${t('LH.attr.full.luck')}</option>
    `;

    new Dialog({
      title: t('LH.investigatorCreator.swapAttributes'),
      content: `
        <form>
          <div class="form-group">
            <label>${t('LH.investigatorCreator.firstAttribute')}</label>
            <div class="form-fields">
              <select name="first">${optionHtml}</select>
            </div>
          </div>

          <div class="form-group">
            <label>${t('LH.investigatorCreator.secondAttribute')}</label>
            <div class="form-fields">
              <select name="second">${optionHtml}</select>
            </div>
          </div>
        </form>
      `,
      buttons: {
        swap: {
          icon: '<i class="fa-solid fa-right-left"></i>',
          label: t('LH.investigatorCreator.swap'),
          callback: html => {
            const root = html instanceof HTMLElement ? html : html[0];
            const form = root.querySelector('form');

            const first = form.elements.first.value;
            const second = form.elements.second.value;

            if (first === second) {
              ui.notifications.warn(t('LH.investigatorCreator.swapDifferentAttributes'));
              return;
            }

            const firstValue = this.stats[first];
            this.stats[first] = this.stats[second];
            this.stats[second] = firstValue;

            this.render();
          },
        },
        cancel: {
          icon: '<i class="fa-solid fa-xmark"></i>',
          label: t('Cancel'),
        },
      },
      default: 'swap',
    }).render(true);
  }
}
