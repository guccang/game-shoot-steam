import {createCatCrewState} from '../combat/cat-crew.js';
// 载具随秘境会话独立出战；森林车库冻结，关卡检查点包含耐久、供给和修复进度。
import { createVehicle } from '../combat/vehicle.js';
import { ownsVehicleWeapon, vehicleModel } from '../config/vehicles.js';
import { validateRealmVehicles } from '../progression/realm-vehicles.js';

// 输出脱离运行时引用的检查点，收起的炮塔也保留供给，不能借切换补弹。
export function captureRealmVehicles(game) {
  return validateRealmVehicles({ index: game.vehicle.index, hulls: game.vehicles });
}

// 恢复车库前检查所有权，重建炮塔引用和飞行标记，不携带旧战场的锁定与后坐。
export function restoreRealmVehicles(game, raw) {
  const saved = validateRealmVehicles(raw);
  if (!saved) return;
  const p = game.loadout;
  // 远征只能恢复本局抽中的车体与炮塔，不能从存档借用森林装备。
  const expedition = game.realm?.loadout;
  p.vehicleIndex = expedition ? expedition.vehicle ?? 0 : p.vehicleHulls[saved.index] ? saved.index : 0;
  game.vehicles = saved.hulls.map((hull, index) => {
    const owned = p.vehicleHulls[index] > 0;
    // 森林和活动快照保留实际炮型，跨车型安装不能恢复成原厂炮。
    const weaponIndex = hull.weaponIndex;
    p.vehicleLoadouts[index] = owned && ownsVehicleWeapon(p, weaponIndex) ? weaponIndex : null;
    const v = createVehicle(p, index);
    v.maxHp = Math.max(1, Math.min(v.maxHp, hull.maxHp || v.maxHp));
    v.hp = Math.min(v.maxHp, hull.hp);
    v.cooldown = hull.cooldown;
    v.active = owned && index === p.vehicleIndex && hull.active && v.hp > 0 && v.cooldown === 0;
    for (const [key, module] of Object.entries(hull.modules)) {
      if (owned && Number(key) === weaponIndex && ownsVehicleWeapon(p, Number(key))) {
        if(module.crew){
          // 重新创建独立动作和导航对象；不把存档对象直接当作战场伙伴。
          const state=createCatCrewState();state.spawnTimer=module.crew.spawnTimer;
          state.nodes.forEach((node,i)=>Object.assign(node,module.crew.nodes[i]));
          module.companions=state;delete module.crew;
        }
        v.modules[key] = module;
      }
    }
    v.module = v.weaponIndex === null ? null : v.modules[v.weaponIndex];
    return v;
  });
  game.vehicle = game.vehicles[p.vehicleIndex];
  game.player.flying = game.vehicle.active && !!vehicleModel(p.vehicleIndex).flying;
  game.player.amphibious = game.vehicle.active && !!vehicleModel(p.vehicleIndex).amphibious;
  game.player.treePass = game.vehicle.active && !!vehicleModel(p.vehicleIndex).treePass;
}

// 返回冻结的森林车库时恢复原选用与挂载，防止局内切车使 HUD 与车体错配。
export function restoreForestVehicleSelection(game) {
  game.progress.vehicleIndex = game.vehicle.index;
  game.progress.vehicleLoadouts = game.vehicles.map(v => v.weaponIndex);
}
