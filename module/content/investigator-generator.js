import { isAppendixLuckEnabled } from '../settings.js';
import { t } from '../utils/i18n.js';

export const INVESTIGATOR_DESCRIPTION_FIELDS = [
  'aesthetics',
  'firstEncounter',
  'ideology',
  'physique',
  'face',
  'speech',
  'virtue',
  'flaw',
  'misfortune',
];

export const INVESTIGATOR_BACKSTORY_COUNT = 20;

export const INVESTIGATOR_DETAIL_KEYS = INVESTIGATOR_DESCRIPTION_FIELDS.filter((key) => key !== 'firstEncounter');

export const INVESTIGATOR_FIELD_ROLL_MAX = {
  aesthetics: 20,
  backstory: INVESTIGATOR_BACKSTORY_COUNT,
  firstEncounter: 10,
  ideology: 10,
  physique: 10,
  face: 10,
  speech: 10,
  virtue: 10,
  flaw: 10,
  misfortune: 10,
};

export function shouldShowLuck() {
  return isAppendixLuckEnabled();
}

export function getInitialInvestigatorStats() {
  return {
    str: 0,
    dex: 0,
    ctrl: 0,
    luck: 0,
    hp: 0,
    cash: 0,
  };
}

export function getInitialInvestigatorDetails() {
  return {
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
}

export async function rollTotal(formula) {
  const roll = await new Roll(formula).evaluate();
  return roll.total;
}

export function rollInvestigatorField(key) {
  const max = INVESTIGATOR_FIELD_ROLL_MAX[key];
  if (!max) return '';

  return game.i18n.localize(`LH.char.${key}.${Math.floor(Math.random() * max) + 1}`);
}

export function canRollInvestigatorField(key) {
  return Boolean(INVESTIGATOR_FIELD_ROLL_MAX[key]);
}

export function rollInvestigatorDetails() {
  return Object.fromEntries(INVESTIGATOR_DETAIL_KEYS.map((key) => [key, rollInvestigatorField(key)]));
}

export function rollInvestigatorBackstoryId() {
  return String(Math.floor(Math.random() * INVESTIGATOR_BACKSTORY_COUNT) + 1);
}

export async function rollInvestigatorAttributes({ showLuck = shouldShowLuck() } = {}) {
  const [str, dex, ctrl, luck, hp, cash] = await Promise.all([
    rollTotal('3d6'),
    rollTotal('3d6'),
    rollTotal('3d6'),
    showLuck ? rollTotal('3d6') : 0,
    rollTotal('1d6'),
    rollTotal('1d6 * 100'),
  ]);

  return {
    str,
    dex,
    ctrl,
    luck,
    hp,
    cash,
  };
}

export function buildInvestigatorAttributesData(stats, { includeLuck = shouldShowLuck() } = {}) {
  const attributes = {
    str: { value: stats.str, base: stats.str },
    dex: { value: stats.dex, base: stats.dex },
    con: { value: stats.ctrl, base: stats.ctrl },
  };

  if (includeLuck) attributes.luck = { value: stats.luck, base: stats.luck };

  return attributes;
}

export function buildInvestigatorStatsUpdate(stats, { includeLuck = shouldShowLuck() } = {}) {
  const updateData = {
    'system.attributes.str.value': stats.str,
    'system.attributes.str.base': stats.str,
    'system.attributes.dex.value': stats.dex,
    'system.attributes.dex.base': stats.dex,
    'system.attributes.con.value': stats.ctrl,
    'system.attributes.con.base': stats.ctrl,
    'system.defense.hp': stats.hp,
    'system.defense.hpMax': stats.hp,
    'system.inventory.money': stats.cash,
  };

  if (includeLuck) {
    updateData['system.attributes.luck.value'] = stats.luck;
    updateData['system.attributes.luck.base'] = stats.luck;
  }

  return updateData;
}

export function buildGeneratedDescription(details) {
  const items = buildInvestigatorDetailListItems(details, { includeDataField: true });

  return `<div class="lh generated-investigator"><ul>${items}</ul></div>`;
}

export function buildInvestigatorDetailListItems(details, { includeDataField = false } = {}) {
  return INVESTIGATOR_DESCRIPTION_FIELDS.map((labelKey) => {
    const dataField = includeDataField ? ` data-field="${labelKey}"` : '';
    return `<li${dataField}><b>${t(`LH.char.labels.${labelKey}`)}:</b> ${details[labelKey] ?? ''}</li>`;
  }).join('');
}

function getGeneratedDetailValue(listItem) {
  const clone = listItem.cloneNode(true);
  clone.querySelector('b')?.remove();
  return clone.textContent.replace(/^:\s*/, '').trim();
}

function getGeneratedDetailValues(generatedDescription) {
  const values = {};

  for (const field of INVESTIGATOR_DESCRIPTION_FIELDS) {
    const label = t(`LH.char.labels.${field}`);
    const listItem =
      generatedDescription.querySelector(`li[data-field="${field}"]`) ??
      Array.from(generatedDescription.querySelectorAll('li')).find(
        (item) => item.querySelector('b')?.textContent?.replace(/:\s*$/, '').trim() === label
      );

    values[field] = listItem ? getGeneratedDetailValue(listItem) : '';
  }

  return values;
}

export function mergeGeneratedDescription(currentDescription = '', changedDetails = {}) {
  const patch = Object.fromEntries(
    Object.entries(changedDetails).filter(([, value]) => String(value ?? '').trim() !== '')
  );

  if (!Object.keys(patch).length) return currentDescription;

  const wrapper = document.createElement('div');
  wrapper.innerHTML = currentDescription ?? '';

  const generatedDescription = wrapper.querySelector('.generated-investigator');
  const currentDetails = generatedDescription ? getGeneratedDetailValues(generatedDescription) : {};
  const nextDescription = buildGeneratedDescription({ ...currentDetails, ...patch });
  const nextWrapper = document.createElement('div');
  nextWrapper.innerHTML = nextDescription;

  if (generatedDescription) generatedDescription.replaceWith(nextWrapper.firstElementChild);
  else wrapper.append(nextWrapper.firstElementChild);

  return wrapper.innerHTML;
}
