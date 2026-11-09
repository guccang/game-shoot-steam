// 秘境载具检查点只接收固定车体与已知炮塔字段，避免外部存档注入运行时对象。
import { COLLECTED_VEHICLES, VEHICLE_COOLDOWN } from '../../config/vehicles.js';
import { VEHICLE_WEAPONS as WEAPONS, isVehicleArmament } from '../../config/vehicle-armaments.js';
import { validateTideState } from '../../config/tide-cannon.js';
import { GAMEPLAY_VALUES } from '../../config/gameplay-values.js';

// 连续计时保留小数，非法值回到安全下限。
function bounded(value, max, fallback = 0) {
  return Number.isFinite(value) ? Math.max(0, Math.min(max, value)) : fallback;
}
// 邻里猫检查点只保留生命和补召时钟，位置、目标及导航由当前场景重建。
function crewSnapshot(raw){
 return {spawnTimer:bounded(raw?.spawnTimer,1),nodes:Array.from({length:8},(_,i)=>{const n=raw?.nodes?.[i]||{};return {spawned:n.spawned===true,hp:bounded(n.hp,180,180),deadTime:bounded(n.deadTime,3),cooldown:bounded(n.cooldown,60)};})};
}
// 校验车体、弹夹和技能计时；是否拥有装备由恢复战场时再次检查。
export function validateRealmVehicles(raw) {
  if (!raw || !Array.isArray(raw.hulls)) return null;
  const index = Number.isInteger(raw.index) && COLLECTED_VEHICLES[raw.index] ? raw.index : 0;
  return { index, hulls: COLLECTED_VEHICLES.map((_, i) => {
    const v = raw.hulls[i] || {}, modules = {};
    for (const [key, w] of WEAPONS.entries()) {
      const m = v.modules?.[key];
      if (!m || !isVehicleArmament(key) || v.weaponIndex !== key) continue;
      modules[key] = {
        magazine: { ammo: Math.floor(bounded(m.magazine?.ammo, (w.magazineSize+(GAMEPLAY_VALUES.progress.maxPartLevel-1)*Math.max(1,Math.floor(w.magazineSize*GAMEPLAY_VALUES.parts.capacityPerLevel)))*(isVehicleArmament(key)?1:GAMEPLAY_VALUES.vehicle.ammoMultiplier))),
          remaining: bounded(m.magazine?.remaining, w.reloadTime),
          ...(w.crew?{regenProgress:bounded(m.magazine?.regenProgress,1)}:{}),
          ...(key===20&&m.magazine?.tide?{tide:validateTideState(m.magazine.tide)}:{}),
          heat: bounded(m.magazine?.heat, 1), heatSpin: bounded(m.magazine?.heatSpin, .25), rotor:bounded(m.magazine?.rotor,Math.PI*2), rotorSpeed:bounded(m.magazine?.rotorSpeed,38), rotorDrive:bounded(m.magazine?.rotorDrive,.16) },
        cooldown: bounded(m.cooldown, 60),
        ...(w.crew?{crew:crewSnapshot(m.crew||m.companions)}:{}),
        pulse: { charge: bounded(m.pulse?.charge, w.chargeTime || 0), cooldown: bounded(m.pulse?.cooldown, w.cooldown || 0) },
        cycle: { charge: bounded(m.cycle?.charge, w.grenade?.charge || 0), firing: m.cycle?.firing === true },
      };
    }
    const weaponIndex = isVehicleArmament(v.weaponIndex)?v.weaponIndex:null;
    return { active: i === index && v.active === true, hp: bounded(v.hp, 100000),
      maxHp: bounded(v.maxHp, 100000), cooldown: bounded(v.cooldown, VEHICLE_COOLDOWN), weaponIndex, modules };
  }) };
}
