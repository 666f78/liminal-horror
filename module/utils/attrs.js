import { t } from './i18n.js';

export function getAttr(actor, key) {
  const a = foundry.utils.getProperty(actor, `system.attributes.${key}`);
  if (a && typeof a === 'object') return { value: Number(a.value ?? 10), base: Number(a.base ?? a.value ?? 10) };
  const num = Number(a ?? 10);
  return { value: num, base: num };
}

export async function setAttrValue(actor, key, newVal) {
  return actor.update({ [`system.attributes.${key}.value`]: Number(newVal) });
}

export function getAttributeStatuses(system) {
  const statuses = [];
  const strength = Number(system?.attributes?.str?.value ?? 0);
  const dexterity = Number(system?.attributes?.dex?.value ?? 0);
  const control = Number(system?.attributes?.con?.value ?? 0);

  if (!Number.isNaN(strength) && strength <= 0) statuses.push({ id: 'dead', label: t('LH.status.dead') });
  if (!Number.isNaN(dexterity) && dexterity <= 0) statuses.push({ id: 'paralysis', label: t('LH.status.paralysis') });
  if (!Number.isNaN(control) && control <= 0) statuses.push({ id: 'lost', label: t('LH.status.lost') });

  return statuses;
}

export function getAttributeStatusLabels(system) {
  return getAttributeStatuses(system).map((status) => status.label);
}
