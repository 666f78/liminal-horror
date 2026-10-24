import { MAX_SLOTS } from '../data/constants.js';
import { APPENDIX_LUCK_SETTING, isAppendixLuckEnabled, PARTY_MEMBERS_SETTING, SETTINGS_NS } from '../settings.js';
import { getAttr, getAttributeStatuses } from '../utils/attrs.js';
import { dError } from '../utils/debug.js';
import { t, td } from '../utils/i18n.js';

const DEFAULT_PORTRAIT = 'icons/svg/mystery-man.svg';
const STATUS_ICONS = {
  dead: 'fa-skull',
  paralysis: 'fa-person-walking',
  lost: 'fa-eye-slash',
  deprived: 'fa-moon',
};
let partyOverview = null;

function getMemberIds() {
  const stored = game.settings.get(SETTINGS_NS, PARTY_MEMBERS_SETTING);
  return Array.isArray(stored) ? [...new Set(stored.filter((id) => typeof id === 'string' && id.length))] : [];
}

function getInvestigators() {
  return game.actors.contents
    .filter((actor) => actor.type === 'investigator')
    .sort((a, b) => a.name.localeCompare(b.name));
}

function getMemberContext(actor, showLuck) {
  const system = actor.system;
  const hp = Number(system.defense?.hp ?? 0);
  const hpMax = Number(system.defense?.hpMax ?? hp);
  const slotsUsed = Number(system.inventory?.slotsUsed ?? 0);
  const slotsMax = Number(system.inventory?.slotsMax ?? MAX_SLOTS);
  const attributeKeys = ['str', 'dex', 'con'];
  if (showLuck) attributeKeys.push('luck');
  const statuses = getAttributeStatuses(system);
  if (system.status?.deprived === true) statuses.push({ id: 'deprived', label: t('LH.ui.deprivedFull') });
  const [primaryStatus, ...otherStatuses] = statuses.map((status) => ({ ...status, icon: STATUS_ICONS[status.id] }));
  const otherStatusItems = otherStatuses
    .map(
      (status) =>
        `<span class="lh-party-status-detail" data-status="${status.id}"><span class="lh-party-status-icon"><i class="fa-solid ${status.icon}" aria-hidden="true"></i></span>${foundry.utils.escapeHTML(status.label)}</span>`
    )
    .join('');

  return {
    id: actor.id,
    name: actor.name,
    img: actor.img || DEFAULT_PORTRAIT,
    hp,
    hpMax,
    hpReduced: hp < hpMax,
    attributes: attributeKeys.map((key) => {
      const attribute = getAttr(actor, key);
      return { ...attribute, reduced: attribute.value < attribute.base };
    }),
    slotsUsed,
    slotsMax,
    overCapacity: slotsUsed > slotsMax,
    primaryStatus,
    otherStatusCount: otherStatuses.length,
    otherStatusesTooltip: `<div class="lh-party-status-list">${otherStatusItems}</div>`,
    otherStatusesLabel: td('LH.partyOverview.otherStatuses', {
      statuses: otherStatuses.map((status) => status.label).join(', '),
    }),
  };
}

class PartyOverview extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  static DEFAULT_OPTIONS = {
    classes: ['lh-appv2', 'lh-party-window'],
    window: {
      title: 'LH.partyOverview.title',
      icon: 'fa-solid fa-address-card',
      resizable: true,
    },
    actions: {
      editMembers: this.editMembers,
      openActor: this.openActor,
      showStatuses: this.showStatuses,
    },
    position: { width: 880, height: 'auto' },
  };

  static PARTS = {
    overview: {
      template: 'systems/liminal-horror/templates/party/overview.hbs',
      scrollable: ['.lh-party-table-wrap'],
    },
  };

  _canRender(options) {
    if (!game.user.isGM) return false;
    return super._canRender(options);
  }

  async _prepareContext() {
    const selected = new Set(getMemberIds());
    const showLuck = isAppendixLuckEnabled();
    const members = getInvestigators()
      .filter((actor) => selected.has(actor.id))
      .map((actor) => getMemberContext(actor, showLuck));

    return { members, showLuck, memberCount: td('LH.partyOverview.count', { count: members.length }) };
  }

  _attachPartListeners(partId, htmlElement, options) {
    super._attachPartListeners(partId, htmlElement, options);
    if (partId !== 'overview') return;

    const showStatuses = (event) => this._showStatuses(event.currentTarget);
    for (const button of htmlElement.querySelectorAll('.lh-party-status-more')) {
      button.addEventListener('pointerenter', showStatuses);
      button.addEventListener('focus', showStatuses);
    }
  }

  _showStatuses(target) {
    const directions = game.tooltip.constructor.TOOLTIP_DIRECTIONS;
    game.tooltip.activate(target, { direction: directions.RIGHT });

    const rightBoundary = Math.min(
      this.element.getBoundingClientRect().right,
      target.ownerDocument.documentElement.clientWidth
    );
    const tooltipRight =
      target.getBoundingClientRect().right +
      game.tooltip.constructor.TOOLTIP_MARGIN_PX +
      game.tooltip.tooltip.offsetWidth;
    if (tooltipRight > rightBoundary) game.tooltip.activate(target, { direction: directions.LEFT });
  }

  async _onFirstRender(context, options) {
    await super._onFirstRender(context, options);

    const refresh = () => {
      if (!this.element?.isConnected) return;
      if (!game.user.isGM) {
        this.close();
        return;
      }
      this.render().catch((error) => {
        dError('partyOverview.render error', error);
        ui.notifications.error(t('LH.partyOverview.refreshFailed'));
      });
    };
    const onActorChange = (actor) => {
      if (getMemberIds().includes(actor.id)) refresh();
    };
    const onSettingChange = (setting) => {
      if ([PARTY_MEMBERS_SETTING, APPENDIX_LUCK_SETTING].some((key) => setting.key === `${SETTINGS_NS}.${key}`)) {
        refresh();
      }
    };
    const onUserChange = (user) => {
      if (user.id === game.user.id && !game.user.isGM) refresh();
    };

    this._hooks = [
      ['createActor', onActorChange],
      ['updateActor', onActorChange],
      ['deleteActor', onActorChange],
      ['createSetting', onSettingChange],
      ['updateSetting', onSettingChange],
      ['updateUser', onUserChange],
    ];
    for (const [hook, callback] of this._hooks) Hooks.on(hook, callback);
  }

  _onClose(options) {
    for (const [hook, callback] of this._hooks ?? []) Hooks.off(hook, callback);
    if (partyOverview === this) partyOverview = null;
    super._onClose(options);
  }

  static async editMembers() {
    if (!game.user.isGM) return;
    const investigators = getInvestigators();
    if (!investigators.length) {
      ui.notifications.warn(t('LH.partyOverview.noneAvailable'));
      return;
    }

    const selected = new Set(getMemberIds());
    const choices = investigators
      .map(
        (actor) => `
          <label class="lh-party-member-choice">
            <input type="checkbox" name="actorIds" value="${actor.id}" ${selected.has(actor.id) ? 'checked' : ''} />
            <img src="${foundry.utils.escapeHTML(actor.img || DEFAULT_PORTRAIT)}" alt="" />
            <span>${foundry.utils.escapeHTML(actor.name)}</span>
          </label>`
      )
      .join('');

    const selection = await foundry.applications.api.DialogV2.wait({
      classes: ['lh', 'lh-confirm-dialog'],
      window: { title: t('LH.partyOverview.selectMembers') },
      modal: true,
      position: { width: 420 },
      rejectClose: false,
      content: `
        <div class="lh-dialog-form">
          <p class="lh-dialog-message">${foundry.utils.escapeHTML(t('LH.partyOverview.selectionHint'))}</p>
          <div class="lh-party-member-options">${choices}</div>
        </div>`,
      buttons: [
        {
          action: 'save',
          label: t('LH.partyOverview.saveMembers'),
          default: true,
          callback: (_event, button) => {
            if (!button.form) return null;
            return Array.from(button.form.querySelectorAll('input[name="actorIds"]:checked'), (input) => input.value);
          },
        },
        { action: 'cancel', label: t('LH.core.cancel'), callback: () => null },
      ],
    });

    if (!Array.isArray(selection) || !game.user.isGM) return;
    const members = selection.filter((id) => game.actors.get(id)?.type === 'investigator');
    await game.settings.set(SETTINGS_NS, PARTY_MEMBERS_SETTING, members);
  }

  static showStatuses(_event, target) {
    this._showStatuses(target);
  }

  static async openActor(_event, target) {
    if (!game.user.isGM) return;
    const actor = game.actors.get(target.dataset.actorId);
    if (!actor || actor.type !== 'investigator') {
      ui.notifications.warn(t('LH.partyOverview.actorUnavailable'));
      this.render();
      return;
    }
    await actor.sheet.render({ force: true });
  }
}

export async function openPartyOverview() {
  if (!game.user.isGM) {
    ui.notifications.warn(t('LH.partyOverview.gmOnly'));
    return;
  }
  partyOverview ??= new PartyOverview();
  await partyOverview.render({ force: true });
}
