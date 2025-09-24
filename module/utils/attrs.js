export function getAttr(actor, key) {
  const a = foundry.utils.getProperty(actor, `system.attributes.${key}`);
  if (a && typeof a === 'object') return { value: Number(a.value ?? 10), base: Number(a.base ?? a.value ?? 10) };
  const num = Number(a ?? 10);
  return { value: num, base: num };
}

export async function setAttrValue(actor, key, newVal) {
  return actor.update({ [`system.attributes.${key}.value`]: Number(newVal) });
}
