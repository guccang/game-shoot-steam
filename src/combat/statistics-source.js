// 发射时快照装备归属，异步弹丸不依赖命中时的手持枪或当前载具。
import {WEAPONS} from '../config/weapons.js';
import {COLLECTED_VEHICLES} from '../config/vehicles.js';

// 召唤物挂枪归所属核心；车载火力与电动车骑乘射击额外记录车型维度。
export function statisticsSource(game,weapon,vehicleIndex=game.statisticsVehicleIndex){
  if(weapon.statisticsSource!==undefined)return weapon.statisticsSource;
  if(game.statisticsExcluded)return {};
  const owner=WEAPONS[weapon.masteryOwnerIndex];
  const index=vehicleIndex!==undefined?vehicleIndex:game.vehicle?.active&&COLLECTED_VEHICLES[game.vehicle.index]?.unarmed?game.vehicle.index:null;
  return {weapon:owner?.id||weapon.id||WEAPONS[weapon.weaponIndex]?.id,vehicle:COLLECTED_VEHICLES[index]?.id};
}
