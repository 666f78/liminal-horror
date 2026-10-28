const protectionValue = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
};

export function getArmorProtection(item) {
  return {
    physical: protectionValue(item.system?.armorValue),
    stress: protectionValue(item.system?.stressProtection),
  };
}

export function getEquippedArmorProtection(actor) {
  const total = { physical: 0, stress: 0 };
  for (const item of actor?.items ?? []) {
    if (item.type !== 'armor' || !item.system?.equipped) continue;
    const protection = getArmorProtection(item);
    total.physical += protection.physical;
    total.stress += protection.stress;
  }
  return total;
}
