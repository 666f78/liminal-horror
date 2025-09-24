import { dLog, dWarn, withGroup } from '../utils/debug.js';
import { t } from '../utils/i18n.js';

const FOLDERS = {
  ROOT: 'LH.folders.root',
  ARMOR: 'LH.folders.armor',
  WEAPON: 'LH.folders.weapon',
  EXPLOSIVE: 'LH.folders.explosive',
  PHARMA: 'LH.folders.pharma',
  GEAR: 'LH.folders.gear',
  CONDITION: 'LH.folders.condition',
};

const buildArmorDefaults = () => ({
  slotSize: 1,
  ignoreSlots: false,
  description: '',
  armorValue: 0,
  equipped: false,
  price: 0,
});

const buildWeaponDefaults = () => ({
  slotSize: 1,
  ignoreSlots: false,
  description: '',
  damageDie: '1d0',
  equipped: false,
  price: 0,
});

const buildGearDefaults = () => ({
  slotSize: 1,
  ignoreSlots: false,
  description: '',
  price: 0,
  usesMax: 0,
  usesCurrent: 0,
});

const buildConditionDefaults = () => ({ slotSize: 1, ignoreSlots: false, description: '' });

const ITEM_GROUPS = [
  { folderKey: FOLDERS.ARMOR, buildDefaults: buildArmorDefaults, getItems: () => ARMOR_LIST },
  { folderKey: FOLDERS.WEAPON, buildDefaults: buildWeaponDefaults, getItems: () => WEAPON_LIST },
  { folderKey: FOLDERS.EXPLOSIVE, buildDefaults: buildWeaponDefaults, getItems: () => EXPLOSIVE_LIST },
  { folderKey: FOLDERS.PHARMA, buildDefaults: buildGearDefaults, getItems: () => PHARMA_LIST },
  { folderKey: FOLDERS.GEAR, buildDefaults: buildGearDefaults, getItems: () => GEAR_LIST },
  { folderKey: FOLDERS.CONDITION, buildDefaults: buildConditionDefaults, getItems: () => CONDITION_LIST },
];

const LOCALIZATION_PREFIX = 'LH.';
const ITEM_KEY_DELIMITER = '::';

const isLocalizationKey = (value) => typeof value === 'string' && value.startsWith(LOCALIZATION_PREFIX);
const fingerprint = (type, name) => type + ITEM_KEY_DELIMITER + name;

function localizeDescription(description) {
  if (!description) return description;
  return isLocalizationKey(description) ? t(description) : description;
}

function prepareItemData(item, buildDefaults, folderId) {
  const { system: itemSystem = {}, ...rest } = item;
  const localizedName = t(rest.name);
  const localizedDescription = localizeDescription(itemSystem.description);

  const system = {
    ...buildDefaults(),
    ...itemSystem,
    ...(localizedDescription ? { description: localizedDescription } : {}),
  };

  return {
    ...rest,
    name: localizedName,
    folder: folderId,
    system,
  };
}

async function ensureFolder(name, type = 'Item', { parent = null, color = null, isRoot = false } = {}) {
  const folders = game.folders;
  const match = (folder) =>
    folder.type === type &&
    folder.name === name &&
    ((isRoot && (folder.parent?.id ?? null) === (parent ?? null)) ||
      (!isRoot && (!parent || folder.parent?.id === parent)));

  let folder = folders.find(match);
  if (!folder) {
    const data = { name, type };
    if (color) data.color = color;
    if (parent) data.folder = parent;
    try {
      folder = await Folder.create(data);
      dLog('createItems.folder.created', name);
    } catch (error) {
      dWarn('createItems.folder.error', error);
      throw error;
    }
  }
  return folder;
}

async function createGroup({ folderName, buildDefaults, items, parentId, existingKeys }) {
  const folder = await ensureFolder(folderName, 'Item', { parent: parentId });

  const payload = [];
  for (const item of items) {
    const data = prepareItemData(item, buildDefaults, folder.id);
    const key = fingerprint(data.type, data.name);
    if (existingKeys.has(key)) continue;
    existingKeys.add(key);
    payload.push(data);
  }

  if (!payload.length) {
    dLog('createItems.group.skip', folderName);
    return;
  }

  await Item.createDocuments(payload);
  dLog('createItems.group.created', folderName, payload.length);
}

export async function createItems() {
  return withGroup('createItems', async () => {
    try {
      const rootFolder = await ensureFolder(t(FOLDERS.ROOT), 'Item', { color: '#b22222', isRoot: true });
      const existingKeys = new Set(game.items.contents.map((item) => fingerprint(item.type, item.name)));

      for (const group of ITEM_GROUPS) {
        const folderName = t(group.folderKey);
        await createGroup({
          folderName,
          buildDefaults: group.buildDefaults,
          items: group.getItems(),
          parentId: rootFolder.id,
          existingKeys,
        });
      }
    } catch (error) {
      dWarn('createItems.error', error);
      throw error;
    }
  });
}

const ARMOR_LIST = [
  { name: 'LH.armor.armoredVest', type: 'armor', system: { armorValue: 1, price: 500 } },
  { name: 'LH.armor.ancientAmulet', type: 'gear', system: { stabilityBonus: 1, price: 3000 } },
  { name: 'LH.armor.gasMask', type: 'armor', system: { armorValue: 0, price: 150 } },
  { name: 'LH.armor.facemask', type: 'armor', system: { armorValue: 0, price: 20 } },
];

const WEAPON_LIST = [
  {
    name: 'LH.weapon.improvised',
    type: 'weapon',
    system: { damageDie: '1d6', price: 20, bulky: true },
  },
  { name: 'LH.weapon.handWeapons', type: 'weapon', system: { damageDie: '1d6', price: 50 } },
  {
    name: 'LH.weapon.taserMace',
    type: 'weapon',
    system: { damageDie: '1d6', price: 250, nonLethal: true },
  },
  { name: 'LH.weapon.pistol', type: 'weapon', system: { damageDie: '1d6', price: 500 } },
  {
    name: 'LH.weapon.sawnOffShotgun',
    type: 'weapon',
    system: { damageDie: '1d4', price: 300, slotSize: 2, blast: true, bulky: true },
  },
  {
    name: 'LH.weapon.rifle',
    type: 'weapon',
    system: { damageDie: '1d6', price: 600, slotSize: 2, bulky: true },
  },
  {
    name: 'LH.weapon.shotgun',
    type: 'weapon',
    system: { damageDie: '1d6', price: 300, slotSize: 2, bulky: true },
  },
  {
    name: 'LH.weapon.assaultRifle',
    type: 'weapon',
    system: { damageDie: '1d8', price: 1500, slotSize: 2, bulky: true },
  },
  {
    name: 'LH.weapon.combatShotgun',
    type: 'weapon',
    system: { damageDie: '1d8', price: 750, slotSize: 2, bulky: true },
  },
  {
    name: 'LH.weapon.sniperRifle',
    type: 'weapon',
    system: {
      damageDie: '1d8',
      price: 2500,
      slotSize: 2,
      bulky: true,
      description: 'LH.weapon.sniperRifleDesc',
    },
  },
];

const EXPLOSIVE_LIST = [
  {
    name: 'LH.explosive.molotov',
    type: 'weapon',
    system: { damageDie: '1d6', price: 20, description: 'LH.explosive.molotovDesc' },
  },
  {
    name: 'LH.explosive.flashbang',
    type: 'weapon',
    system: { damageDie: '1d0', price: 75, description: 'LH.explosive.flashbangDesc' },
  },
  {
    name: 'LH.explosive.grenade',
    type: 'weapon',
    system: { damageDie: '1d8', price: 75, description: 'LH.explosive.grenadeDesc', blast: true },
  },
  {
    name: 'LH.explosive.propaneTank',
    type: 'weapon',
    system: {
      damageDie: '1d10',
      price: 50,
      description: 'LH.explosive.propaneTankDesc',
      blast: true,
    },
  },
];

const PHARMA_LIST = [
  {
    name: 'LH.pharma.tranquilizers',
    type: 'gear',
    system: { price: 250, description: 'LH.pharma.tranquilizersDesc' },
  },
  {
    name: 'LH.pharma.poison',
    type: 'gear',
    system: { price: 100, description: 'LH.pharma.poisonDesc' },
  },
  {
    name: 'LH.pharma.antitoxin',
    type: 'gear',
    system: { price: 250, description: 'LH.pharma.antitoxinDesc' },
  },
  {
    name: 'LH.pharma.acid',
    type: 'gear',
    system: { price: 100, description: 'LH.pharma.acidDesc' },
  },
  {
    name: 'LH.pharma.stims',
    type: 'gear',
    system: { price: 100, description: 'LH.pharma.stimsDesc' },
  },
];

const GEAR_LIST = [
  { name: 'LH.gear.alarmBypass', type: 'gear', system: { price: 500 } },
  { name: 'LH.gear.bearTrap', type: 'gear', system: { price: 100 } },
  { name: 'LH.gear.binoculars', type: 'gear', system: { price: 100 } },
  { name: 'LH.gear.blowTorch', type: 'gear', system: { price: 250 } },
  { name: 'LH.gear.bodyBag', type: 'gear', system: { price: 25 } },
  { name: 'LH.gear.boltCutters', type: 'gear', system: { price: 40 } },
  { name: 'LH.gear.carOpeningKit', type: 'gear', system: { price: 150 } },
  { name: 'LH.gear.chainAndLock', type: 'gear', system: { price: 50 } },
  { name: 'LH.gear.chainsaw', type: 'gear', system: { price: 150 } },
  { name: 'LH.gear.climbingGear', type: 'gear', system: { price: 150 } },
  { name: 'LH.gear.commsEarpieces', type: 'gear', system: { price: 200 } },
  { name: 'LH.gear.commsWalkies', type: 'gear', system: { price: 200 } },
  { name: 'LH.gear.directionalMic', type: 'gear', system: { price: 200 } },
  { name: 'LH.gear.advancedDrone', type: 'gear', system: { price: 1500 } },
  { name: 'LH.gear.goodCamera', type: 'gear', system: { price: 400 } },
  { name: 'LH.gear.duffleBag', type: 'gear', system: { price: 50 } },
  { name: 'LH.gear.duffleBagOutfits', type: 'gear', system: { price: 150 } },
  { name: 'LH.gear.electricalKit', type: 'gear', system: { price: 150 } },
  { name: 'LH.gear.emergencyMedKit', type: 'gear', system: { price: 150 } },
  { name: 'LH.gear.emergencySurgeryKit', type: 'gear', system: { price: 300 } },
  { name: 'LH.gear.fakeID', type: 'gear', system: { price: 200 } },
  { name: 'LH.gear.flare', type: 'gear', system: { price: 20 } },
  { name: 'LH.gear.forgeryKit', type: 'gear', system: { price: 200 } },
  { name: 'LH.gear.glassCutters', type: 'gear', system: { price: 150 } },
  { name: 'LH.gear.grease', type: 'gear', system: { price: 30 } },
  { name: 'LH.gear.handcuffs', type: 'gear', system: { price: 50 } },
  { name: 'LH.gear.headLamp', type: 'gear', system: { price: 25 } },
  { name: 'LH.gear.laptop', type: 'gear', system: { price: 1000 } },
  { name: 'LH.gear.lighter', type: 'gear', system: { price: 5 } },
  { name: 'LH.gear.locksmithTools', type: 'gear', system: { price: 150 } },
  { name: 'LH.gear.marbles', type: 'gear', system: { price: 20 } },
  { name: 'LH.gear.mechanicalKit', type: 'gear', system: { price: 150 } },
  { name: 'LH.gear.metalBearings', type: 'gear', system: { price: 30 } },
  { name: 'LH.gear.nvGoggles', type: 'gear', system: { price: 250 } },
  { name: 'LH.gear.pharmacistKit', type: 'gear', system: { price: 250 } },
  { name: 'LH.gear.portableRam', type: 'gear', system: { price: 75 } },
  { name: 'LH.gear.portableWinch', type: 'gear', system: { price: 250 } },
  { name: 'LH.gear.pulleyRope', type: 'gear', system: { price: 40 } },
  { name: 'LH.gear.caltrops', type: 'gear', system: { price: 50 } },
  { name: 'LH.gear.sledgehammer', type: 'gear', system: { price: 45 } },
  { name: 'LH.gear.spikeStrip', type: 'gear', system: { price: 150 } },
  { name: 'LH.gear.sprayPaint', type: 'gear', system: { price: 15 } },
  { name: 'LH.gear.tarp', type: 'gear', system: { price: 30 } },
  { name: 'LH.gear.zipTies', type: 'gear', system: { price: 15 } },
];

const CONDITION_LIST = [
  {
    name: 'LH.condition.exhausted',
    type: 'condition',
    system: { description: 'LH.condition.exhaustedDesc' },
  },
];
