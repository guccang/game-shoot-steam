import { GAMEPLAY_VALUES } from '../../config/gameplay-values.js';
import {createMechanicalState} from '../../combat/mechanical.js';
// 整套章节借用装备从空白成长构建，永久角色、部件和熟练度不会漏入。
import { freshProgress } from '../../progression/progress.js';
import {storyDefinition} from './story-definition.js';
import { createMagazines } from '../../combat/magazine.js';
import { createVehicle } from '../../combat/vehicle.js';
import { createPulseState } from '../../combat/pulse.js';
import { createWeaponCycle } from '../../combat/grenades.js';
import { createRecoil } from '../../combat/recoil.js';
// 借用车炮独立编号与供给，倍率仅在正式伤害入口应用一次。
export function storyEquipment(id,context) {
  const def=storyDefinition(context),spec=def.loadouts.find(l=>l.id===id)||def.loadouts[0],p=freshProgress();
  p.temporaryGrowth=true;p.hero=def.hero;p.heroes=p.heroes.map((_,i)=>i===def.hero?1:0);
  p.weapon=spec.weapon;p.weapons=p.weapons.map((_,i)=>i===spec.weapon?1:0);
  p.vehicleIndex=spec.vehicle;p.vehicleHulls=p.vehicleHulls.map((_,i)=>i===spec.vehicle&&!spec.onFoot?1:0);
  p.vehicleLoadouts=p.vehicleHulls.map((_,i)=>i===spec.vehicle?spec.turret:null);
  p.vehicleWeapons=p.vehicleWeapons.map((_,i)=>i===spec.turret?1:0);
  p.storyDamage=spec.damage;p.storyTurretDamage=spec.turretDamage;p.storyHull=spec.hull;
  return p;
}
// 安全整备建立独立供给；战中没有此入口，不能用换装恢复弹药。
export function equipStory(game) {
  const r=game.story;r.equipment=storyEquipment(r.loadoutId,game);
  const p=game.loadout;
  game.mechanical=createMechanicalState();
  game.magazines=createMagazines(p);game.vehicles=p.vehicleHulls.map((_,i)=>createVehicle(p, i));game.vehicle=game.vehicles[p.vehicleIndex];
  game.player.hp=storyDefinition(game).hp;game.player.flying=false;game.player.amphibious=false;game.player.treePass=false;game.player.invincible=0;
  game.player.recoil=createRecoil();game.pulse=createPulseState();game.weaponCycle=createWeaponCycle();game.aimLock=null;game.attackTimer=GAMEPLAY_VALUES.player.firstAttackDelay;
  game.state='playing';game.summonVehicle();
}
