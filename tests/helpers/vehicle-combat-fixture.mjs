// 战斗夹具按显式数组构造车库，允许单独测试秘境使用的弹道和补给。
import { Game } from '../../src/core/game.js';
import { createVehicle } from '../../src/combat/vehicle.js';

// 显式构造测试挂载，不依赖工坊购买和存档校验。
export function vehicleCombatFixture(progress,random) {
  const g=new Game(progress,random);
  g.progress.vehicleLoadouts=[...progress.vehicleLoadouts];
  g.vehicles=g.progress.vehicleHulls.map((_,i)=>createVehicle(g.progress, i));
  g.vehicle=g.vehicles[g.progress.vehicleIndex];
  return g;
}
