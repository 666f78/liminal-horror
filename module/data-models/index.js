import { InvestigatorDataModel } from './actor.investigator.js';
import { MonsterDataModel } from './actor.monster.js';
import { NPCDataModel } from './actor.npc.js';
import { VehicleDataModel } from './actor.vehicle.js';
import { ArmorDataModel } from './item.armor.js';
import { ArtifactDataModel } from './item.artifact.js';
import { ConditionDataModel } from './item.condition.js';
import { ConsequenceDataModel } from './item.consequence.js';
import { GearDataModel } from './item.gear.js';
import { InjuryDataModel } from './item.injury.js';
import { WeaponDataModel } from './item.weapon.js';

export const typeLabels = {
  weapon: 'Weapon',
  gear: 'Gear',
  armor: 'Armor',
  artifact: 'Artifact',
  injury: 'Injury',
  consequence: 'Consequence',
  condition: 'Condition',
};

export function registerDataModels() {
  CONFIG.Actor.dataModels = {
    investigator: InvestigatorDataModel,
    npc: NPCDataModel,
    monster: MonsterDataModel,
    vehicle: VehicleDataModel,
  };

  CONFIG.Item.dataModels = {
    weapon: WeaponDataModel,
    gear: GearDataModel,
    armor: ArmorDataModel,
    artifact: ArtifactDataModel,
    injury: InjuryDataModel,
    consequence: ConsequenceDataModel,
    condition: ConditionDataModel,
  };
}
