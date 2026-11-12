import {vehicleRefitStats} from './vehicle-refit.js';
import {ERA_VEHICLES} from './vehicle-eras.js';
import {TREASURE_VEHICLES} from './treasure.js';
import {heroTalentMultiplier} from './hero-talents.js';
import {vehicleBuild} from './vehicle-load.js';
// 战车属性来自内容表，名称、资源身份和载具机制保留稳定绑定。
import content from './content/vehicles.json' with {type:'json'};
import { GAMEPLAY_VALUES } from './gameplay-values.js';
import { i18nText } from "../i18n/index.js";
import { vehicleCapacity } from './vehicle-capacity.js';
import { RECOMMENDED_ECONOMY, economyFor, requiredTier, economyUpgradeCost, armorHealth, equipmentAttackGrowth } from './economy.js';
// 载具修复时长供战斗与环形 HUD 共用，避免显示进度和实际冷却脱节。
export const VEHICLE_COOLDOWN = 60;
import { engineMultiplier } from './equipment-parts.js';
import { VEHICLE_WEAPONS, isVehicleArmament } from './vehicle-armaments.js';
import { applyWeaponParts } from './equipment-parts.js';
import { effectiveWeapon } from './weapon-mods.js';
import { HEROES } from './heroes.js';
export const VEHICLE_MAX_LEVEL = GAMEPLAY_VALUES.progress.maxEquipmentLevel;
// 车体使用独立的一级 HP 与装甲成长，不读取驾驶员生命、角色等级或秘境生命祝福。
export function vehicleMaxHp(progress) {
  if (Number.isFinite(progress.storyHull)) return progress.storyHull;
  const model = vehicleModel(progress.vehicleIndex);
  const hp=progress.temporaryGrowth?armorHealth(model.baseHp,model.hpGrowth,progress.vehicleHulls[progress.vehicleIndex],progress):model.baseHp+vehicleBuild(progress,progress.vehicleIndex).plates*model.hpGrowth;
  return Math.round(hp*heroTalentMultiplier(progress,'hullHealth'));
}
// 升级费用随载具等级递增，与炮塔购买费用分别结算。
export function vehicleUpgradeCost(level, index = 0, progress) {
  return economyUpgradeCost(progress,'vehicle',index,level);
}
// 旧独立炮塔购买兼容入口；专属主炮随车获得，不通过此配方购买。
export function vehicleWeaponCost(index,progress) {
  const recipe=economyFor(progress).turrets[index];
  return recipe?{coins:recipe.coins,wood:recipe.wood}:undefined;
}
// 正式运行读取当前场景的炮塔等级；与角色获取无关，秘境仍只允许本局槽位。
export function ownsVehicleWeapon(progress, index) {
  return Number.isInteger(index)&&!!VEHICLE_WEAPONS[index]&&progress.vehicleWeapons?.[index]>0;
}
// 专属主炮读取自己的部件；旧型号兼容原熟练度与改装，等级始终独立。
export function vehicleWeapon(progress, index = progress.vehicleLoadouts[progress.vehicleIndex]) {
  // 永久载具只读取主炮目录，活动借用装备保留其局内武器规则。
  if (!ownsVehicleWeapon(progress,index))return null;
  const armament=isVehicleArmament(index);
  if(!armament&&!progress.guardianHandWeapons&&!progress.temporaryGrowth)return null;
  // 守护支架使用手持目录，新枪编号不能被旧车载机枪解释。
  if(progress.guardianHandWeapons&&index>=17)return effectiveWeapon(progress,index);
  if(armament){const w=applyWeaponParts({...VEHICLE_WEAPONS[index]},progress,index,'turret');return {...w,reloadTime:w.reloadTime/vehicleRefitStats(progress).strength.ammo};}
  const weapon=effectiveWeapon({ ...progress, weapons: progress.vehicleWeapons, weaponParts: progress.turretParts }, index, 'turret');
  const w=vehicleCapacity(weapon,progress.vehicleAmmoBonus||GAMEPLAY_VALUES.vehicle.ammoMultiplier);return {...w,reloadTime:w.reloadTime/vehicleRefitStats(progress).strength.ammo};
}
// 独立炮塔伤害只读取炮塔等级，避免购买手持枪时免费提升炮塔。
export function vehicleDamage(progress, index) {
  const w = vehicleWeapon(progress, index);
  return w
    ? Math.round(
        w.damage *
          HEROES[progress.hero].bonus *
          equipmentAttackGrowth(progress.vehicleWeapons[index],progress.heroes[progress.hero],progress) * heroTalentMultiplier(progress,'turretDamage') * (progress.storyTurretDamage ?? 1),
      )
    : 0;
}
// 载具目录编号固定，新手电动车优先展示，松果战车需购买；车体自带专属主炮，与角色武器独立。
export const COLLECTED_VEHICLES = [
  {
    id: 'pine-tank',
    name: i18nText("config.vehicles.38e28a9f00"),
    shortName: i18nText("config.vehicles.ac36841358"),
    description: i18nText("config.vehicles.260b64c222"),
  },
  {
    id: 'heavy-tank',
    name: i18nText("config.vehicles.715d4a6537"),
    shortName: i18nText("config.vehicles.8314543283"),
    description: i18nText("config.vehicles.4e1e3ff6e3"),
  },
  {
    id: 'helicopter',
    name: i18nText("config.vehicles.45e6b7e8eb"),
    shortName: i18nText("config.vehicles.341394deda"),
    description: i18nText("config.vehicles.a041c1924e"),
    flying: true,
  },
  {
    id: 'hovercraft',
    name: i18nText("config.vehicles.c8abff84c1"),
    shortName: i18nText("config.vehicles.5a83dede1d"),
    description: i18nText("config.vehicles.d8ce56803c"),
    amphibious: true,
  },
  { id:'fire-truck',name:i18nText("config.vehicles.f5b63ce454"),shortName:i18nText("config.vehicles.837ac1a20c"),description:i18nText("config.vehicles.4ba88aea26"),rewardOnly:false },
  {id:'ranger-scooter',name:i18nText('arrival.scooter.name'),shortName:i18nText('arrival.scooter.short'),
    description:'轻便灵活的巡林电动车；骑乘时弹夹容量提升30%，下车恢复。',
    rewardOnly:false,unarmed:true},
  {id:'red-wolf',treePass:true,name:'红狼坦克',shortName:'红狼',description:'红色重型坦克，超厚装甲与256毫米狼牙主炮；可直接压碎树木（不获得木材），缓慢推进，以范围重炮压制成群敌人。'},
  {id:'jinbei-van',name:'金杯面包车',shortName:'金杯',description:'奶油白的金杯载着热心邻居赶来支援。邻里猫小队拿起扳手、勺子等日常用品，互相照应，一起守护营地。'},
  {id:'police-car',name:'森林警车',shortName:'警车',description:'轻快的奶油白巡逻警车，红蓝警灯守护林间道路；驾驶时使用角色手持武器。',unarmed:true},
...TREASURE_VEHICLES, ...ERA_VEHICLES,
].map(vehicle=>({...vehicle,...content.rows.find(row=>row.id===vehicle.id),coins:0,wood:0,bosses:0}));
// 车库展示价格和挑战门槛使用正式经济配置。
COLLECTED_VEHICLES.forEach((v,i)=>{const r=RECOMMENDED_ECONOMY.vehicles[i];if(!r)return;v.coins=r.coins;v.wood=r.wood;v.bosses=r.gate?RECOMMENDED_ECONOMY.challenges.forest[requiredTier(r.gate)-1]:0;});
// 统一查询型号，旧调用未传编号时保持基础战车外观与数值。
export function vehicleModel(index = 0) {
  return COLLECTED_VEHICLES[index] || COLLECTED_VEHICLES[0];
}
// 战斗和界面共用指定车体的真实动力倍率。
export function vehicleSpeed(progress, index = progress.vehicleIndex) { return vehicleModel(index).speed * engineMultiplier(progress, index) * heroTalentMultiplier(progress,'hullSpeed'); }
// 仅调整货架顺序，所有权、挂载和场景仍使用固定目录编号。
export const VEHICLE_DISPLAY_ORDER = Object.freeze([
 'ranger-scooter','wood-bicycle','wood-wagon','pine-tank','police-car','heavy-tank',
 'fire-truck','hovercraft','jinbei-van','helicopter','red-wolf','moss-sentinel','amber-bastion',
].map(id=>COLLECTED_VEHICLES.findIndex(model=>model.id===id)));
