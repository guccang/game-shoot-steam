// 远征补给配置：完整目录抽取、相邻局去重与只在本局生效的装备成长。
import { nativeVehicleWeapon, VEHICLE_WEAPONS } from './vehicle-armaments.js';
import { WEAPONS } from './weapons.js';
import { COLLECTED_VEHICLES } from './vehicles.js';

// 随机远征暂不抽纯防具，避免与无主炮载具组合后失去攻击手段。
export const EXPEDITION_GUNS = WEAPONS.map((_, i) => i).filter(i=>WEAPONS[i].attackKind!=='defense');
export const EXPEDITION_TURRETS = EXPEDITION_GUNS.filter(i => !WEAPONS[i].controller);
export const EXPEDITION_VEHICLES = COLLECTED_VEHICLES.map((_, i) => i);
export const SLOT_DELAYS = [55, 55, 60, 65, 75, 85, 100, 120, 145, 180, 230, 300];

// 均匀抽取并排除上一局同槽型号，不受永久解锁进度影响。
export function drawExpeditionItem(pool, previous, random) {
  const choices = pool.filter(i => i !== previous);
  return choices[Math.min(choices.length - 1, Math.max(0, Math.floor(random() * choices.length)))];
}

// 编号必须来自正式目录；空槽允许保存，非法型号明确拒绝恢复。
export function validExpeditionLoadout(value) {
  return !!value && (value.weapon === null || EXPEDITION_GUNS.includes(value.weapon)) &&
    (value.vehicle === null || EXPEDITION_VEHICLES.includes(value.vehicle)) &&
    (value.turret === null || EXPEDITION_TURRETS.includes(value.turret) || value.turret === nativeVehicleWeapon(value.vehicle)?.weaponIndex) &&
    !(value.vehicle === null && value.turret !== null) &&
    !(value.weapon === null && value.vehicle !== null) &&
    Array.isArray(value.modules) && value.modules.length === 3 &&
    value.modules.every(i => EXPEDITION_TURRETS.includes(i));
}

// 通过原型读取实时钱包，装备字段独立覆盖；永久成长对象始终不被改写。
export function expeditionEquipment(progress, loadout, stage) {
  const level = Math.max(1, stage), weapon = loadout.weapon ?? 0, vehicleIndex = loadout.vehicle ?? 0;
  const levels = WEAPONS.map((_, i) => i === weapon || loadout.modules.includes(i) ? level : 0);
  return Object.assign(Object.create(progress), {
    temporaryGrowth: true,
    weaponParts: [], turretParts: [], vehicleParts: [],
    weapon, weapons: levels, mastery: WEAPONS.map(() => 0), mods: WEAPONS.map(() => 0),
    mechanicalLoadout: null,
    spiderLoadout: null,
    funnelLoadout: [...loadout.modules], vehicleIndex,
    vehicleHulls: COLLECTED_VEHICLES.map((_, i) => i === loadout.vehicle ? level : 0),
    vehicleLoadouts: COLLECTED_VEHICLES.map((_, i) => i === loadout.vehicle ? nativeVehicleWeapon(i)?.weaponIndex ?? null : null),
    vehicleWeapons: VEHICLE_WEAPONS.map((_, i) => i === nativeVehicleWeapon(loadout.vehicle)?.weaponIndex ? level : 0),
  });
}

// 车体领取时自动配套主炮；旧随机炮塔记录回到同一车型的固定配置。
export function normalizeExpeditionLoadout(value) {
  return value ? {...structuredClone(value),turret:nativeVehicleWeapon(value.vehicle)?.weaponIndex??null} : null;
}
