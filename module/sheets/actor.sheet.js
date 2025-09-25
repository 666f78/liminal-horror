import { applyBackstory, getBackstoryOptions, rollBackstory } from '../content/backstories.js';
import { applyDamage, applyStress } from '../services/effects.js';
import { equipItem, recalcArmor, useItem } from '../services/items.js';
import { restActor } from '../services/rest.js';
import { quickRoll, rollAttribute } from '../services/rolls.js';
import { t } from '../utils/i18n.js';
import { recalcSlots } from '../utils/slots.js';

const isActivateEvent = (event) => event.type === 'click' || event.key === 'Enter' || event.key === ' ';

const getItemId = (target) => target.dataset.itemId ?? target.closest('.inv-row')?.dataset?.itemId;

export class LHActorSheet extends foundry.appv1.sheets.ActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['lh', 'sheet', 'actor'],
      width: 660,
      height: 680,
      tabs: [{ navSelector: '.tabs', contentSelector: '.sheet-body', initial: 'items' }],
    });
  }

  get template() {
    if (this.actor.limited) {
      return 'systems/liminal-horror/templates/actors/actor-limited.hbs';
    }
    return 'systems/liminal-horror/templates/actors/actor-sheet.hbs';
  }

  _getHeaderButtons() {
    if (this.actor.limited) {
      this.position.width = 600;
      this.position.height = 'auto';
      return super._getHeaderButtons().filter((b) => b.class === 'close');
    }
    const buttons = super._getHeaderButtons?.() ?? super.getHeaderButtons?.() ?? [];

    if (game.user.isGM) {
      buttons.unshift({
        label: 'Backstory',
        class: 'lh-backstory',
        icon: 'fas fa-user',
        onclick: async (event) => {
          if (event?.shiftKey) {
            await rollBackstory(this.actor);
            return;
          }

          const options = getBackstoryOptions();
          const select = `<select name="bg" style="width:100%">${options
            .map((option) => `<option value="${option.id}">${option.name}</option>`)
            .join('')}</select>`;

          new Dialog(
            {
              title: 'Choose Backstory',
              content: `<p>${select}</p>`,
              buttons: {
                choose: {
                  icon: '<i class="fas fa-check"></i>',
                  label: 'Apply',
                  callback: async (html) => {
                    const id = Number(html.find("select[name='bg']").val());
                    await applyBackstory(this.actor, id);
                  },
                },
                roll: {
                  icon: '<i class="fas fa-dice-d20"></i>',
                  label: 'Roll (1d20)',
                  callback: async () => {
                    await rollBackstory(this.actor);
                  },
                },
              },
              default: 'choose',
            },
            { classes: ['lh'] }
          ).render(true);
        },
      });
    }

    buttons.unshift({
      label: t('LH.core.rest'),
      class: 'lh-rest',
      icon: 'fas fa-bed',
      onclick: async (event) => {
        const isFullRest = !!event?.shiftKey;
        await restActor(this.actor, { full: isFullRest });
      },
    });

    buttons.unshift({
      label: t('LH.core.dofXs'),
      class: 'lh-roll-d6',
      icon: 'fas fa-dice-d6',
      onclick: async () => {
        await quickRoll(this.actor, '1d6', t('LH.core.dof'));
      },
    });

    return buttons;
  }

  _isDamageActionDisabled(system = this.actor.system) {
    const hp = Number(system?.defense?.hp ?? 0);
    const strength = Number(system?.attributes?.str?.value ?? 0);
    return hp === 0 && strength === 0;
  }

  _isStressActionDisabled(system = this.actor.system) {
    const hp = Number(system?.defense?.hp ?? 0);
    const control = Number(system?.attributes?.con?.value ?? 0);
    return hp === 0 && control === 0;
  }

  _getStatusRibbonText(system = this.actor.system) {
    const labels = [];
    const strength = Number(system?.attributes?.str?.value ?? 0);
    const dexterity = Number(system?.attributes?.dex?.value ?? 0);
    const control = Number(system?.attributes?.con?.value ?? 0);

    if (!Number.isNaN(strength) && strength <= 0) labels.push(t('LH.status.dead'));
    if (!Number.isNaN(dexterity) && dexterity <= 0) labels.push(t('LH.status.paralysis'));
    if (!Number.isNaN(control) && control <= 0) labels.push(t('LH.status.lost'));

    if (!labels.length) return null;
    return labels.join(' / ');
  }

  getData(options) {
    const data = super.getData(options);
    const actorImage = this.actor.img ?? '';
    const isDefaultImage = typeof actorImage === 'string' && actorImage.includes('mystery-man.svg');
    const tokenSrc = this.actor.prototypeToken?.texture?.src;
    const portraitSrc = isDefaultImage && tokenSrc ? tokenSrc : actorImage || tokenSrc || 'icons/svg/mystery-man.svg';

    return {
      ...data,
      system: this.actor.system,
      canEditItems: game.user.isGM,
      portraitSrc,
      showLuck: game.settings.get('liminal-horror', 'appendixLuck'),
      disableDamageAction: this._isDamageActionDisabled(),
      disableStressAction: this._isStressActionDisabled(),
      statusRibbonText: this._getStatusRibbonText(),
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
    for (const actor of game.actors?.contents ?? []) recalcSlots(actor);

    html.on('click keydown', "[data-action='roll-attr']", async (event) => {
      if (!isActivateEvent(event)) return;
      await rollAttribute(this.actor, event.currentTarget.dataset.key);
    });

    html.on('click', "[data-action='apply-damage']", async () => {
      if (this._isDamageActionDisabled()) return;

      const amount = Number(html.find("input[name='damageAmount']").val()) || 0;
      await applyDamage(this.actor, amount);
      await recalcSlots(this.actor);
    });

    html.on('click', "[data-action='apply-stress']", async () => {
      if (this._isStressActionDisabled()) return;

      const amount = Number(html.find("input[name='stressAmount']").val()) || 0;
      await applyStress(this.actor, amount);
      await recalcSlots(this.actor);
    });

    html.on('click keydown', "[data-action='toggle-equip']", async (event) => {
      if (!isActivateEvent(event)) return;
      event.preventDefault();
      event.stopPropagation();

      const itemId = getItemId(event.currentTarget);
      const item = this.actor.items.get(itemId);
      if (!item) return;

      await equipItem(item, this.actor);
      await recalcSlots(this.actor);
      await recalcArmor(this.actor);
    });

    html.on('click keydown', "[data-action='use-item']", async (event) => {
      if (!isActivateEvent(event)) return;
      event.preventDefault();
      event.stopPropagation();

      const itemId = getItemId(event.currentTarget);
      const item = this.actor.items.get(itemId);
      if (!item) return;

      await useItem(item, this.actor);
    });

    html.on('click keydown', '.item-edit', async (event) => {
      if (!isActivateEvent(event)) return;
      event.preventDefault();
      event.stopPropagation();

      const itemId = getItemId(event.currentTarget);
      this.actor.items.get(itemId)?.sheet?.render(true);
    });

    html.on('click keydown', '.item-delete', async (event) => {
      if (!isActivateEvent(event)) return;
      event.preventDefault();
      event.stopPropagation();

      const itemId = getItemId(event.currentTarget);
      if (!itemId) return;

      const item = this.actor.items.get(itemId);
      if (!item) return;

      await item.delete();
      await recalcSlots(this.actor);
    });

    html.on('click', '.open-desc', (event) => {
      event.preventDefault();
      const itemId = event.currentTarget.dataset.itemId;
      const item = this.actor.items.get(itemId);
      if (!item) return;

      new Dialog(
        {
          title: item.name,
          content: `<div class="card" style="margin-bottom:10px;"><h2><b>Description</b></h2><br>${
            item.system.description || 'N/A'
          }</div>`,
          buttons: { ok: { label: 'OK' } },
        },
        { classes: ['lh'] }
      ).render(true);
    });
  }
}
