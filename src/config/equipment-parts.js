import {equipmentLevelCap} from './legendary-workshop.js';
import { GAMEPLAY_VALUES } from './gameplay-values.js';
import { VEHICLE_UPGRADE_MOUNTS, VEHICLE_UPGRADE_BOUNDS } from './vehicle-upgrade-art.js';
import { GATLING_PARTS } from './gatling-art.js';
import { WEAPON_UPGRADE_BOUNDS } from './weapon-upgrade-art.js';
import { i18nText } from "../i18n/index.js";
// 永久装备部件目录与有效属性；配置、战斗和预览使用相同成长规则。
import { WEAPONS } from './weapons.js';
import { VEHICLE_WEAPONS } from './vehicle-armaments.js';
import { SPIDER_INITIAL_MINIONS, SPIDER_COORDINATION_MAX } from './spider.js';

export const PART_KEYS = ['rate', 'capacity', 'reload', 'range', 'accuracy'];
export const PART_LABELS = { damage: i18nText("config.equipment-parts.fb198574f1"), rate: i18nText("config.equipment-parts.a595b93923"), capacity: i18nText("config.equipment-parts.4807a087f9"), reload: i18nText("config.equipment-parts.d2a54f5f45"), range: i18nText("config.equipment-parts.0cf0628d5b"), accuracy: i18nText("config.equipment-parts.910d5120cb"), armor: i18nText("config.equipment-parts.7e3a6b62b8"), engine: i18nText("config.equipment-parts.49f0c0889c"), coordination: i18nText("config.equipment-parts.36e1c9bd1d") };

// 旧等级仍保存在原字段，新增部件缺省一级；读取非法值时不放大收益。
export function partLevel(progress, kind, index, key) {
  const w=(kind==='turret'?VEHICLE_WEAPONS:WEAPONS)[index];
  const legacy = key === 'damage' ? (kind === 'turret' ? progress.vehicleWeapons : progress.weapons)?.[index]
    : key === 'armor' ? progress.vehicleHulls?.[index] : null;
  const field = kind === 'vehicle' ? 'vehicleParts' : kind === 'turret' ? 'turretParts' : 'weaponParts';
  const value = legacy ?? progress[field]?.[index]?.[key];
  return Number.isFinite(value) ? Math.max(1, Math.min(['damage', 'armor'].includes(key) ? equipmentLevelCap(progress,kind) : key === 'coordination' ? w?.crew?5:index===16?SPIDER_COORDINATION_MAX:GAMEPLAY_VALUES.progress.maxCoordinationLevel : GAMEPLAY_VALUES.progress.maxPartLevel, Math.floor(value))) : 1;
}

// 部件独立定义安装位置和工具；同型号的手持与炮塔部件位置一致。
export function equipmentParts(kind, index, progress=null) {
  const w = (kind==='turret'?VEHICLE_WEAPONS:WEAPONS)[index];
  const keys = w?.attackKind==='defense'&&kind==='weapons'?['damage','reload']:kind === 'vehicle' ? ['armor', 'engine'] : ['damage', ...PART_KEYS.filter(k => k !== 'accuracy' || w?.spread > 0), ...(['mechanical','spider'].includes(w?.controller) ? ['coordination'] : [])];
  const positions = { damage: [0, -3], rate: [-13, -5], capacity: [6, 12], reload: [-9, 6], range: [24, -3], accuracy: [32, -7], armor: [22, 12], engine: [-22, -12], coordination: [0, -18] };
  const names = w?.attackKind==='defense'?{damage:'护盾核心',reload:'充能线圈'}:w?.crew?{damage:'随身用品',rate:'挥击训练',capacity:'补给箱',reload:'补给整备',range:'集结旗',coordination:'小队编制'}:w?.id==='hover-tide'?{damage:i18nText("config.equipment-parts.7704e88d2b"),rate:i18nText("config.equipment-parts.f278b64d5d"),capacity:i18nText("config.equipment-parts.a8ffa81210"),reload:i18nText("config.equipment-parts.1190bc9047"),range:i18nText("config.equipment-parts.c08c23517a"),accuracy:i18nText("config.equipment-parts.981da66691")} : w?.id==='tank-125' ? {damage:i18nText("config.equipment-parts.ec660093e6"),rate:i18nText("config.equipment-parts.74ea5858db"),capacity:i18nText("config.equipment-parts.44ce2853bc"),reload:i18nText("config.equipment-parts.5fc563f102"),range:i18nText("config.equipment-parts.01d4ca4135")} : w?.id==='vehicle-vulcan' ? {damage:i18nText("config.equipment-parts.a09f1f77ee"),rate:i18nText("config.equipment-parts.053db25e2b"),capacity:i18nText("config.equipment-parts.4dea24032f"),reload:i18nText("config.equipment-parts.f25627ae3a"),range:i18nText("config.equipment-parts.f82f4ca444"),accuracy:i18nText("config.equipment-parts.2ddb74157f")} : w?.id==='vehicle-machinegun' ? {damage:i18nText("config.equipment-parts.46426fbcb7"),rate:i18nText("config.equipment-parts.10e6af2ffd"),capacity:i18nText("config.equipment-parts.024d6337bc"),reload:i18nText("config.equipment-parts.5d467f011f"),range:i18nText("config.equipment-parts.ee6d82c3fa"),accuracy:i18nText("config.equipment-parts.2ddb74157f")} : w?.controller === 'mechanical' ? { damage: i18nText("config.equipment-parts.b6de07a769"), rate: i18nText("config.equipment-parts.43283f7de8"), capacity: i18nText("config.equipment-parts.9332ac42c6"), reload: i18nText("config.equipment-parts.afd9992a27"), range: i18nText("config.equipment-parts.22e259c561") }
    : w?.id === 'chainsaw' ? { damage: i18nText("config.equipment-parts.3c318da595"), rate: i18nText("config.equipment-parts.4d09c1f63a"), capacity: i18nText("config.equipment-parts.19a35d7ca5"), reload: i18nText("config.equipment-parts.64570400ca"), range: i18nText("config.equipment-parts.71b3322595") }
    : w?.controller ? { damage: i18nText("config.equipment-parts.fb198574f1"), rate: i18nText("config.equipment-parts.335fee8d3f"), capacity: i18nText("config.equipment-parts.9332ac42c6"), reload: i18nText("config.equipment-parts.1152488270"), range: i18nText("config.equipment-parts.4b1fafb584") }
    : ['laser', 'pulse', 'arc', 'frost'].includes(w?.id) ? { damage: i18nText("config.equipment-parts.8a62eccf86"), rate: i18nText("config.equipment-parts.629a26d5e0"), capacity: i18nText("config.equipment-parts.71f533f751"), reload: i18nText("config.equipment-parts.afd9992a27"), range: i18nText("config.equipment-parts.2cd28a2b62") }
    : ['water', 'flame'].includes(w?.id) ? { damage: i18nText("config.equipment-parts.9d44465c99"), rate: i18nText("config.equipment-parts.979ff1074c"), capacity: i18nText("config.equipment-parts.a8ffa81210"), reload: i18nText("config.equipment-parts.1190bc9047"), range: i18nText("config.equipment-parts.29ba484b26"), accuracy: i18nText("config.equipment-parts.981da66691") }
    : { damage: i18nText("config.equipment-parts.81df2c0ebd"), rate: i18nText("config.equipment-parts.fbff3b536e"), capacity: i18nText("config.equipment-parts.89397d8072"), reload: i18nText("config.equipment-parts.db51eb202c"), range: i18nText("config.equipment-parts.fe8edf80bd"), accuracy: i18nText("config.equipment-parts.37dcc6dcc3") };
  // 小型手枪、长枪、液体罐和锯板按原始结构分别定位，避免通用坐标造成悬空。
  const mounts = w?.attackKind==='defense'?{damage:[0,0,.7],reload:[-12,0,.6]}:w?.crew?{damage:[12,0,.8],rate:[-18,-12,.7],capacity:[-20,12,.7],reload:[-28,0,.6],range:[25,-7,.7],coordination:[0,16,.8]}:w?.id==='wolf-256'?{damage:[12,0,.8],rate:[-18,-8,.7],capacity:[-20,12,.7],reload:[-25,0,.7],range:[69,0,.8]}:w?.id==='gravity-gun'?{damage:[-7,0,.65],rate:[10,-10,.6],capacity:[-21,8,.6],reload:[-25,-6,.6],range:[32,0,.6]}:index===20?{damage:[2,0,.7],rate:[-12,0,.7],capacity:[-14,13,.7],reload:[-23,0,.6],range:[25,0,.7],accuracy:[38,0,.6]}:index===18 ? {damage:[15,0,.8],rate:[-12,-6,.8],capacity:[-12,12,.8],reload:[-20,0,.7],range:[55,0,.8]} : index===17||index===19 ? {damage:[12,0,.7],rate:[-7,-2,.7],capacity:[-8,13,.7],reload:[-17,4,.6],range:[32,0,.7],accuracy:[38,0,.7]} : kind === 'vehicle' ? VEHICLE_UPGRADE_MOUNTS[index] || {} : index === 16 ? {damage:[5,-32,.8],rate:[-16,-24,.8],capacity:[-9,-14,.8],reload:[11,-13,.7],range:[28,-30,.8],coordination:[0,0,1]} : index === 0 ? { damage:[6,-4,.65],rate:[-5,-5,.65],capacity:[0,13,.65],reload:[-4,4,.55],range:[16,-2,.65] }
    : index === 8 ? {damage:[6,-2,.85],rate:[-9,-3,.8],capacity:[12,12,.8],reload:[-2,5,.7],range:[36,-2,1]}
    : index === 14 ? {damage:[25,0,.85],rate:[-13,-1,1],capacity:[-9,10,.8],reload:[-17,5,.8],range:[45,0,1]}
    : [5,7].includes(index) ? {damage:[2,0,.85],rate:[-8,3,.75],capacity:[-13,-8,.9],reload:[-12,-17,.7]}
    : w?.controller ? {damage:[-3,0,.85],rate:[-16,0,.75],capacity:[-3,9,.75],reload:[-11,5,.65],range:[18,0,.65]} : {};
  // 加特林独立部件的热点与正式外形共用挂点，不修改部件等级或数值。
  if(kind!=='vehicle'&&index===2)for(const [key,p] of Object.entries(GATLING_PARTS))mounts[key]=[p.x,p.y,1];
  return keys.map(key => ({ key, paired:kind==='vehicle'&&index!==5, growthBounds:kind==='vehicle'?VEHICLE_UPGRADE_BOUNDS[key]:index!==2?WEAPON_UPGRADE_BOUNDS[key]:undefined, bounds:kind!=='vehicle'&&index===2?GATLING_PARTS[key]:undefined, name: kind === 'vehicle' ? PART_LABELS[key] : names[key] || PART_LABELS[key],
    max: ['damage', 'armor'].includes(key) ? equipmentLevelCap(progress,kind) : key === 'coordination' ? w?.crew?5:index===16?SPIDER_COORDINATION_MAX:GAMEPLAY_VALUES.progress.maxCoordinationLevel : GAMEPLAY_VALUES.progress.maxPartLevel, x: mounts[key]?.[0] ?? positions[key][0], y: mounts[key]?.[1] ?? positions[key][1], scale: mounts[key]?.[2] ?? 1,
    tool: ['damage', 'armor', 'range'].includes(key) ? 'welder' : 'wrench' }));
}

// 存档只接受目录中存在的部件；未拥有装备不继承隐藏升级。
export function validatePartLevels(raw, owned, kind) {
  return owned.map((level, index) => Object.fromEntries(equipmentParts(kind, index)
    .filter(p => !['damage', 'armor'].includes(p.key)).map(p => [p.key, level > 0 && Number.isFinite(raw?.[index]?.[p.key])
      ? Math.max(1, Math.min(p.max, Math.floor(raw[index][p.key]))) : 1])));
}

// 先应用套件，再应用部件；脉冲两段时钟与面板射击间隔同步。
export function applyWeaponParts(weapon, progress, index, kind = 'weapons') {
  const levels = Object.fromEntries(equipmentParts(kind, index).map(p => [p.key, partLevel(progress, kind, index, p.key)]));
  // 护盾仅升级容量与恢复速度，主等级不再显示为攻击伤害。
  if(weapon.attackKind==='defense'){weapon.magazineSize=Math.round(weapon.magazineSize*(1+.1*(levels.damage-1)));weapon.shieldRegen*=1+.12*(levels.reload-1);weapon.parts=levels;return weapon;}
  const rate = 1 + GAMEPLAY_VALUES.parts.ratePerLevel * (levels.rate - 1);
  weapon.interval /= rate;
  if (weapon.chargeTime) { weapon.chargeTime /= rate; weapon.cooldown /= rate; }
  weapon.magazineSize += Math.max(1, Math.floor((kind==='turret'?VEHICLE_WEAPONS:WEAPONS)[index].magazineSize * GAMEPLAY_VALUES.parts.capacityPerLevel)) * (levels.capacity - 1);
  weapon.reloadTime /= 1 + GAMEPLAY_VALUES.parts.reloadPerLevel * (levels.reload - 1);
  weapon.range *= 1 + GAMEPLAY_VALUES.parts.rangePerLevel * (levels.range - 1);
  if (levels.accuracy) weapon.spread *= 1 - GAMEPLAY_VALUES.parts.accuracyPerLevel * (levels.accuracy - 1);
  if (['mechanical','spider'].includes(weapon.controller)) weapon.summonCount = (weapon.crew?3:weapon.controller==='spider'?SPIDER_INITIAL_MINIONS-1:2) + levels.coordination;
  if(weapon.controller==='spider'){weapon.minionInterval/=rate;weapon.minionRange*=1+GAMEPLAY_VALUES.parts.rangePerLevel*(levels.range-1);}
  weapon.parts = levels;
  return weapon;
}

// 动力只改变当前车型移动倍率，不影响驾驶状态、碰撞或修复计时。
export function engineMultiplier(progress, index) { return 1 + GAMEPLAY_VALUES.parts.enginePerLevel * (partLevel(progress, 'vehicle', index, 'engine') - 1); }
