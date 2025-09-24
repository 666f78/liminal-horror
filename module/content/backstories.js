import { dLog, dWarn } from '../utils/debug.js';
import { sendRollMessage } from '../utils/chat.js';
import { t } from '../utils/i18n.js';

function gear(name, slotSize = 1, ignoreSlots = false) {
  return { name, type: 'gear', system: { slotSize, ignoreSlots } };
}
function armor(name, armorValue = 1, equipped, slotSize = 1) {
  return { name, type: 'armor', system: { armorValue, equipped, slotSize, ignoreSlots: false } };
}
function weapon(name, die = '1d6') {
  return { name, type: 'weapon', system: { damageDie: die, slotSize: 1, ignoreSlots: false } };
}

const RAW_BACKSTORIES = [
  {
    id: 1,
    name: 'LH.backstory.1.name',
    items: [
      armor('LH.backstory.1.items.apron', 1),
      gear('LH.backstory.1.items.belt'),
      gear('LH.backstory.1.items.thermos'),
    ],
  },
  {
    id: 2,
    name: 'LH.backstory.2.name',
    items: [
      gear('LH.backstory.2.items.lunchbox'),
      gear('LH.backstory.2.items.map'),
      weapon('LH.backstory.2.items.taser', '1d6'),
    ],
  },
  {
    id: 3,
    name: 'LH.backstory.3.name',
    items: [
      weapon('LH.backstory.3.items.wrench', '1d6'),
      gear('LH.backstory.3.items.toolbox', 2),
      gear('LH.backstory.3.items.tape'),
      gear('LH.backstory.3.items.brakeCleaner'),
    ],
  },
  {
    id: 4,
    name: 'LH.backstory.4.name',
    items: [
      armor('LH.backstory.4.items.gloves', 1),
      gear('LH.backstory.4.items.vest'),
      gear('LH.backstory.4.items.grabber'),
      gear('LH.backstory.4.items.goggles'),
    ],
  },
  {
    id: 5,
    name: 'LH.backstory.5.name',
    items: [
      gear('LH.backstory.5.items.medkit'),
      gear('LH.backstory.5.items.scissors'),
      gear('LH.backstory.5.items.stethoscope'),
      gear('LH.backstory.5.items.fecesBag'),
    ],
  },
  {
    id: 6,
    name: 'LH.backstory.6.name',
    items: [
      weapon('LH.backstory.6.items.knife', '1d6'),
      gear('LH.backstory.6.items.radio'),
      gear('LH.backstory.6.items.badge'),
      gear('LH.backstory.6.items.slippers'),
    ],
  },
  {
    id: 7,
    name: 'LH.backstory.7.name',
    items: [
      gear('LH.backstory.7.items.tool'),
      gear('LH.backstory.7.items.notebook'),
      gear('LH.backstory.7.items.camera'),
      gear('LH.backstory.7.items.fans', 0, true),
    ],
  },
  {
    id: 8,
    name: 'LH.backstory.8.name',
    items: [
      gear('LH.backstory.8.items.gear'),
      gear('LH.backstory.8.items.headband'),
      gear('LH.backstory.8.items.drink'),
    ],
  },
  {
    id: 9,
    name: 'LH.backstory.9.name',
    items: [
      gear('LH.backstory.9.items.skateboard', 2),
      gear('LH.backstory.9.items.camera'),
      gear('LH.backstory.9.items.boltCutter'),
    ],
  },
  {
    id: 10,
    name: 'LH.backstory.10.name',
    items: [
      gear('LH.backstory.10.items.laptop', 2),
      gear('LH.backstory.10.items.subs', 0, true),
      gear('LH.backstory.10.items.fakeIds'),
      gear('LH.backstory.10.items.energy'),
    ],
  },
  {
    id: 11,
    name: 'LH.backstory.11.name',
    items: [
      gear('LH.backstory.11.items.ladder', 2),
      weapon('LH.backstory.11.items.axe', '1d6'),
      gear('LH.backstory.11.items.extinguisher', 2),
      gear('LH.backstory.11.items.flashlight'),
    ],
  },
  {
    id: 12,
    name: 'LH.backstory.12.name',
    items: [
      gear('LH.backstory.12.items.bike', 3),
      armor('LH.backstory.12.items.helmet', 1),
      gear('LH.backstory.12.items.bag'),
      gear('LH.backstory.12.items.package'),
      gear('LH.backstory.12.items.multitool'),
    ],
  },
  {
    id: 13,
    name: 'LH.backstory.13.name',
    items: [
      weapon('LH.backstory.13.items.knife', '1d6'),
      gear('LH.backstory.13.items.alcohol'),
      gear('LH.backstory.13.items.cigs'),
      gear('LH.backstory.13.items.confiscatedIds'),
    ],
  },
  {
    id: 14,
    name: 'LH.backstory.14.name',
    items: [
      gear('LH.backstory.14.items.recorder'),
      gear('LH.backstory.14.items.notebook'),
      gear('LH.backstory.14.items.cards'),
      weapon('LH.backstory.14.items.revolver', '1d6'),
    ],
  },
  {
    id: 15,
    name: 'LH.backstory.15.name',
    items: [
      gear('LH.backstory.15.items.contacts', 0, true),
      gear('LH.backstory.15.items.corpCard'),
      gear('LH.backstory.15.items.briefcase'),
      weapon('LH.backstory.15.items.taser', '1d6'),
    ],
  },
  {
    id: 16,
    name: 'LH.backstory.16.name',
    items: [
      gear('LH.backstory.16.items.audition'),
      gear('LH.backstory.16.items.charger'),
      gear('LH.backstory.16.items.cosmetics'),
      gear('LH.backstory.16.items.clothes'),
    ],
  },
  {
    id: 17,
    name: 'LH.backstory.17.name',
    items: [
      gear('LH.backstory.17.items.laptop', 2),
      gear('LH.backstory.17.items.notebook'),
      gear('LH.backstory.17.items.router'),
      gear('LH.backstory.17.items.ppe'),
    ],
  },
  {
    id: 18,
    name: 'LH.backstory.18.name',
    items: [
      gear('LH.backstory.18.items.laptop', 2),
      gear('LH.backstory.18.items.badge'),
      weapon('LH.backstory.18.items.knife', '1d6'),
      gear('LH.backstory.18.items.notebook'),
    ],
  },
  {
    id: 19,
    name: 'LH.backstory.19.name',
    items: [
      gear('LH.backstory.19.items.mug'),
      gear('LH.backstory.19.items.scissors'),
      gear('LH.backstory.19.items.bag', 2),
    ],
  },
  {
    id: 20,
    name: 'LH.backstory.20.name',
    items: [
      gear('LH.backstory.20.items.belt'),
      weapon('LH.backstory.20.items.knife', '1d6'),
      gear('LH.backstory.20.items.flashlight'),
      gear('LH.backstory.20.items.drill', 2),
    ],
  },
];

export const BACKSTORIES = RAW_BACKSTORIES;

function resolveBackstory(id) {
  return RAW_BACKSTORIES.find((entry) => entry.id === Number(id)) ?? null;
}

function localizeItems(items) {
  return items.map((item) => ({
    ...item,
    name: t(item.name),
  }));
}

export function getBackstoryOptions() {
  return RAW_BACKSTORIES.map((entry) => ({
    id: entry.id,
    name: `${String(entry.id).padStart(2, '0')} - ${t(entry.name)}`,
  }));
}

export async function applyBackstory(actor, id) {
  const entry = resolveBackstory(id);
  if (!entry) {
    dWarn('backstories.apply.missing', id);
    throw new Error('Backstory not found');
  }

  try {
    const localizedItems = localizeItems(entry.items);
    await Item.create(localizedItems, { parent: actor });

    const tag = t(entry.name);
    await actor.update({ 'system.identity.background': tag });

    game?.liminalhorror?.api?.recalcArmor?.(actor);
    game?.liminalhorror?.api?.recalcSlots?.(actor);

    dLog('backstories.apply', actor.name, id);
    return entry;
  } catch (error) {
    dWarn('backstories.apply.error', error);
    throw error;
  }
}

export async function rollBackstory(actor) {
  const roll = await new Roll('1d20').evaluate();
  await sendRollMessage(roll, { actor, flavor: 'Backstory (1d20)' });
  const idx = Math.clamped(roll.total, 1, 20);
  return applyBackstory(actor, idx);
}
